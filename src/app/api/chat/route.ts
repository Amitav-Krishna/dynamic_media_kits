// app/api/chat/route.ts
import getInfluencerData from "@/lib/get-influencer-data";
import { VoyageAIClient } from "voyageai";
import { Pinecone } from "@pinecone-database/pinecone";
import calculateEngagementRate from "@/lib/engagement-rate";
import getInfluencerPosts from "@/lib/get-posts";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { query } from "@/lib/db";
import vectorSearch from "@/lib/vector_db/query_vector_db";
import analyzeSentiment from "@/lib/analyze-sentiment";
import { ALLOWED_QUERIES } from "@/lib/db/queries";
import {
  ChartRenderer,
  ChartData,
  ChartDataset,
  ChartOptions,
} from "@/lib/chart-renderer";

// Define types
interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  score: number;
}

interface GraphData {
  title: string;
  labels: string[];
  values: number[];
  type: "bar" | "line" | "pie" | "doughnut" | "area" | "scatter";
  datasets?: ChartDataset[];
  options?: ChartOptions;
}

// Database Schema for SQL generation prompt
const DATABASE_SCHEMA = `
CREATE TABLE public.users (
	user_id UUID PRIMARY KEY,
	name TEXT NOT NULL,
	username TEXT UNIQUE NOT NULL,
	sport TEXT,
	follower_count INTEGER,
	platforms TEXT
);

CREATE TABLE public.posts (
	post_id UUID PRIMARY KEY,
	title TEXT NOT NULL,
	content TEXT NOT NULL,
	view_count INTEGER,
    likes INTEGER,
	user_id UUID NOT NULL,
	created_at TIMESTAMPTZ;
	FOREIGN KEY (user_id) REFERENCES users(user_id)
);
`;

/**
 * Validates a dynamically generated SQL query to ensure it's read-only.
 * @param sqlQuery The SQL query string to validate.
 * @returns True if the query is read-only, false otherwise.
 */
function validateReadOnlySqlQuery(sqlQuery: string): boolean {
  const forbiddenKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
  ];
  const upperCaseQuery = sqlQuery.toUpperCase();

  for (const keyword of forbiddenKeywords) {
    if (upperCaseQuery.includes(keyword)) {
      console.warn(`Forbidden keyword found in query: ${keyword}`);
      return false;
    }
  }
  // Basic check for SELECT statement to ensure it's a read operation
  // This is a simplified check; a more robust solution might use a SQL parser.
  if (!upperCaseQuery.trim().startsWith("SELECT")) {
    console.warn(
      "Query does not start with SELECT, potentially not read-only.",
    );
    return false;
  }
  return true;
}

/**
 * Generates a chart image using the enhanced chart renderer
 * @param graphData The graph configuration data
 * @returns A promise that resolves to a base64 encoded string of the chart image.
 */
async function generateChartImage(graphData: GraphData): Promise<string> {
  const chartRenderer = new ChartRenderer({
    width: 800,
    height: 600,
    theme: "light",
    backgroundColor: "#ffffff",
  });

  const chartData: ChartData = {
    type: graphData.type as any,
    labels: graphData.labels,
    datasets: graphData.datasets || [
      {
        label: "Value",
        data: graphData.values,
        backgroundColor:
          graphData.type === "pie" || graphData.type === "doughnut"
            ? [
                "#4F46E5",
                "#06B6D4",
                "#10B981",
                "#F59E0B",
                "#EF4444",
                "#8B5CF6",
                "#6B7280",
              ]
            : "#4F46E5",
        borderColor: "#4F46E5",
        borderWidth: graphData.type === "line" ? 3 : 1,
        fill: graphData.type === "area",
        tension:
          graphData.type === "line" || graphData.type === "area" ? 0.4 : 0,
      },
    ],
    options: {
      title: graphData.title,
      responsive: true,
      animation: false,
      ...graphData.options,
    },
  };

  return await chartRenderer.renderChart(chartData);
}

/**
 * Generates a text-based representation of chart data when visual charts aren't available
 */
function generateTextChart(graphData: GraphData): string {
  let result = `📊 **${graphData.title || "Data Chart"}** (${graphData.type})\n\n`;

  if (graphData.labels && graphData.values) {
    const maxValue = Math.max(...graphData.values);
    const barWidth = 20;

    result += "```\n";
    for (
      let i = 0;
      i < Math.min(graphData.labels.length, graphData.values.length);
      i++
    ) {
      const label = graphData.labels[i];
      const value = graphData.values[i];
      const percentage = maxValue > 0 ? value / maxValue : 0;
      const barLength = Math.round(percentage * barWidth);
      const bar = "█".repeat(barLength) + "░".repeat(barWidth - barLength);

      result += `${label.padEnd(15)} │${bar}│ ${value.toLocaleString()}\n`;
    }
    result += "```\n";
  }

  if (graphData.datasets && graphData.datasets.length > 1) {
    result += "\n**Datasets:**\n";
    graphData.datasets.forEach((dataset, index) => {
      result += `• ${dataset.label}: ${dataset.data.length} data points\n`;
    });
  }

  return result;
}

/**
 * Enhanced chart generation with multiple chart types and advanced options
 */
async function generateAdvancedChart(
  type: "bar" | "line" | "pie" | "doughnut" | "area" | "scatter",
  labels: string[],
  datasets: ChartDataset[],
  options: Partial<ChartOptions> = {},
): Promise<string> {
  const chartRenderer = new ChartRenderer({
    width: options.width || 800,
    height: options.height || 600,
    theme: options.theme || "light",
  });

  const chartData: ChartData = {
    type: type as any,
    labels,
    datasets,
    options: {
      responsive: true,
      animation: false,
      ...options,
    },
  };

  return await chartRenderer.renderChart(chartData);
}

// 4. Main API Handler
export async function POST(request: NextRequest) {
  try {
    // Validate request
    const { messages } = await request.json();
    if (!messages?.length) {
      return NextResponse.json(
        { error: "Messages array required" },
        { status: 400 },
      );
    }

    const lastMessage = messages[messages.length - 1]?.content || "";
    const influencers = await getInfluencerData(); // Fetch all influencers once

    let parsedIntent: any = { intent: "other" }; // Default to 'other' intent
    let aiGraphIntent: string = "";

    try {
      // Use AI to determine if the user is asking for a graph and extract parameters
      const { text } = await generateText({
        model: deepseek("deepseek-chat"),
        prompt: `Based on the following user message, determine if the user is asking for a data visualization (like a graph or chart).
        If the user explicitly asks for a graph or chart, respond with a JSON object indicating "graph_request" intent and extract relevant details.
        If the user is NOT asking for a graph or chart, respond with a JSON object indicating "other" intent.

        Respond ONLY with the JSON object. Do not include any other text or explanations.

        JSON format for 'graph_request' intent:
        {
          "intent": "graph_request",
          "graph_type": "bar" | "line" | "pie" | "doughnut" | "area" | "scatter",
          "entity_type": "sport" | "influencer" | "post" | "other", // e.g., "sport" for "performance of sports"
          "metric": "performance" | "engagement" | "sentiment" | "follower_count" | "other",
          "comparison": "comparison" | "trend" | "distribution" | "correlation" | null,
          "time_period": "weekly" | "monthly" | "all_time" | null,
          "group_by": "sport" | "username" | null,
          "filter": {
            "influencer": "username_if_specified" | null,
            "keyword": "keyword_if_specified" | null,
            "limit": "number_if_specified" | null // For top N requests
          },
          "title_suggestion": "Suggested title for the graph",
          "chart_options": {
            "theme": "light" | "dark" | null,
            "show_legend": boolean | null,
            "show_grid": boolean | null
          }
        }

        JSON format for 'other' intent:
        {
          "intent": "other"
        }

        Examples:
        User: "Make me a bar graph of the performance of different sports"
        AI: {"intent": "graph_request", "graph_type": "bar", "entity_type": "sport", "metric": "performance", "comparison": "comparison", "group_by": "sport", "filter": null, "title_suggestion": "Performance of Different Sports", "chart_options": {"theme": "light", "show_legend": true, "show_grid": true}}

        User: "Show me a line chart of follower growth trends"
        AI: {"intent": "graph_request", "graph_type": "line", "entity_type": "influencer", "metric": "follower_count", "comparison": "trend", "time_period": "monthly", "title_suggestion": "Follower Growth Trends", "chart_options": {"theme": "light", "show_legend": true, "show_grid": true}}

        User: "Create a pie chart showing the distribution of sports"
        AI: {"intent": "graph_request", "graph_type": "pie", "entity_type": "sport", "metric": "performance", "comparison": "distribution", "title_suggestion": "Sports Distribution", "chart_options": {"theme": "light", "show_legend": true, "show_grid": false}}

        User: "Compare the performance of posts by @influencerA with 'running' as opposed to their median"
        AI: {"intent": "graph_request", "graph_type": "bar", "entity_type": "post", "metric": "performance", "comparison": "comparison", "group_by": null, "filter": {"influencer": "influencerA", "keyword": "running"}, "title_suggestion": "Engagement of @influencerA's 'running' posts vs. Median", "chart_options": {"theme": "light", "show_legend": true, "show_grid": true}}

        User: "Show me the top 5 influencers by follower count as a doughnut chart"
        AI: {"intent": "graph_request", "graph_type": "doughnut", "entity_type": "influencer", "metric": "follower_count", "comparison": "distribution", "group_by": "influencer_username", "filter": {"limit": 5}, "title_suggestion": "Top 5 Influencers by Follower Count", "chart_options": {"theme": "light", "show_legend": true, "show_grid": false}}

        User: "Who is the best influencer for dog food?"
        AI: {"intent": "other"}

        User message: "${lastMessage}"
        AI: `,
        maxTokens: 200,
        temperature: 0.0, // Keep temperature low for structured output
        // responseMimeType: "application/json", // Not supported in this version
        // responseSchema: Not supported in this version
      });
      aiGraphIntent = text; // Assign the text response to aiGraphIntent

      // --- Strip markdown code block fences ---
      const jsonMatch = aiGraphIntent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        aiGraphIntent = jsonMatch[1].trim();
      }
      // --- END NEW ---

      // Robust check before parsing JSON
      if (
        aiGraphIntent &&
        aiGraphIntent.trim().startsWith("{") &&
        aiGraphIntent.trim().endsWith("}")
      ) {
        parsedIntent = JSON.parse(aiGraphIntent);
        console.log("Parsed AI Intent:", parsedIntent);
      } else {
        console.warn(
          "AI graph intent response is not valid JSON format or empty, falling back. Raw response:",
          aiGraphIntent,
        );
        parsedIntent = {
          intent: "other",
          reason: "Invalid JSON format or empty response from AI",
        };
      }
    } catch (parseError) {
      console.error(
        "Error in AI graph intent generation or parsing:",
        parseError,
      );
      console.error(
        "Raw AI response for graph intent (if available):",
        aiGraphIntent,
      ); // Log the raw response
      // Fallback to 'other' intent if parsing fails
      parsedIntent = {
        intent: "other",
        reason: "AI generation or parsing failed",
      };
    }

    // --- Graph Request Handling (NEW Dynamic SQL Generation) ---
    if (parsedIntent.intent === "graph_request") {
      const queryPlan = parsedIntent;
      let graphData: GraphData = {
        title: queryPlan.title_suggestion || "Generated Graph",
        labels: [],
        values: [],
        type: "bar",
      };

      try {
        // --- NEW: Generate SQL using DeepSeek 2 ---
        const { text: generatedSql } = await generateText({
          model: deepseek("deepseek-chat"), // Using DeepSeek for SQL generation
          prompt: `You are a SQL query generator. Based on the following database schema and user's request for graph data, generate a PostgreSQL SELECT query.
          The query must be read-only (no INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, GRANT, REVOKE).
          The output should be ONLY the SQL query, no explanations or markdown fences.

          Database Schema:
          ${DATABASE_SCHEMA}

          User's Graph Request Details:
          Entity Type: ${queryPlan.entity_type}
          Metric: ${queryPlan.metric}
          Chart Type: ${queryPlan.graph_type}
          Comparison: ${queryPlan.comparison || "none"}
          Time Period: ${queryPlan.time_period || "all_time"}
          ${queryPlan.filter ? `Filter: ${JSON.stringify(queryPlan.filter)}` : ""}
          ${queryPlan.group_by ? `Group By: ${queryPlan.group_by}` : ""}

          Generate SQL query for: "${lastMessage}"
          SQL:`,
          maxTokens: 300,
          temperature: 0.0, // Keep temperature low for precise SQL
        });

        console.log("Generated SQL:", generatedSql);

        // --- NEW: Execute Dynamic SQL ---
        const data = await query(generatedSql);
        console.log(data);

        // Enhanced data mapping with support for multiple datasets
        if (data.rows && data.rows.length > 0) {
          console.log(
            "Mapping data for entity_type:",
            queryPlan.entity_type,
            "metric:",
            queryPlan.metric,
            "chart_type:",
            queryPlan.graph_type,
          );
          console.log("Data structure:", Object.keys(data.rows[0]));

          // Create datasets based on chart type and data structure
          let datasets: ChartDataset[] = [];

          if (
            queryPlan.graph_type === "pie" ||
            queryPlan.graph_type === "doughnut"
          ) {
            // For pie/doughnut charts, create a single dataset
            graphData.labels = data.rows.map(
              (d: any) => Object.values(d)[0] as string,
            );
            graphData.values = data.rows.map((d: any) =>
              parseFloat(Object.values(d)[1] as string),
            );

            datasets = [
              {
                label: queryPlan.metric,
                data: graphData.values,
                backgroundColor: [
                  "#4F46E5",
                  "#06B6D4",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#8B5CF6",
                  "#6B7280",
                  "#EC4899",
                ],
              },
            ];
          } else if (
            queryPlan.comparison === "trend" &&
            queryPlan.graph_type === "line"
          ) {
            // For trend analysis, create multiple datasets if multiple entities
            const keys = Object.keys(data.rows[0]);
            graphData.labels = data.rows.map((d: any) => d[keys[0]]);

            // Check if we have multiple value columns (multiple series)
            const valueColumns = keys.slice(1);
            datasets = valueColumns.map((col, index) => ({
              label: col.replace(/_/g, " ").toUpperCase(),
              data: data.rows.map((d: any) => parseFloat(d[col])),
              borderColor: ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B"][
                index % 4
              ],
              backgroundColor: [
                "#4F46E520",
                "#06B6D420",
                "#10B98120",
                "#F59E0B20",
              ][index % 4],
              fill: queryPlan.graph_type === "area",
              tension: 0.4,
            }));

            graphData.values = data.rows.map((d: any) =>
              parseFloat(d[keys[1]]),
            );
          } else {
            // Default mapping for bar charts and other types
            if (
              queryPlan.entity_type === "sport" &&
              queryPlan.metric === "follower_count"
            ) {
              graphData.labels = data.rows.map((d: any) => d.sport);
              graphData.values = data.rows.map((d: any) =>
                parseInt(d.follower_count, 10),
              );
            } else if (
              queryPlan.entity_type === "influencer" &&
              queryPlan.metric === "follower_count"
            ) {
              graphData.labels = data.rows.map((d: any) => `@${d.username}`);
              graphData.values = data.rows.map((d: any) =>
                parseInt(d.follower_count, 10),
              );
            } else {
              // Generic mapping
              const keys = Object.keys(data.rows[0]);
              if (keys.length >= 2) {
                graphData.labels = data.rows.map((d: any) => d[keys[0]]);
                graphData.values = data.rows.map((d: any) =>
                  parseFloat(d[keys[1]]),
                );
              } else {
                throw new Error(
                  "Dynamic query results could not be mapped to graph data.",
                );
              }
            }

            datasets = [
              {
                label: queryPlan.metric.replace(/_/g, " ").toUpperCase(),
                data: graphData.values,
                backgroundColor:
                  queryPlan.graph_type === "bar" ? "#4F46E580" : "#4F46E520",
                borderColor: "#4F46E5",
                borderWidth: queryPlan.graph_type === "line" ? 3 : 1,
                fill: queryPlan.graph_type === "area",
                tension:
                  queryPlan.graph_type === "line" ||
                  queryPlan.graph_type === "area"
                    ? 0.4
                    : 0,
              },
            ];
          }

          graphData.datasets = datasets;
          graphData.type = queryPlan.graph_type;
          graphData.options = {
            title: queryPlan.title_suggestion,
            theme: queryPlan.chart_options?.theme || "light",
            legend: {
              display: queryPlan.chart_options?.show_legend ?? true,
              position: "top",
            },
            grid: {
              display: queryPlan.chart_options?.show_grid ?? true,
            },
            responsive: true,
            animation: false,
          };
        }

        if (graphData.labels.length === 0) {
          console.log(graphData);
          return NextResponse.json({
            content: `I couldn't find data to generate a graph for your request. Please try a different query or ensure data exists.`,
            _metadata: { noData: true },
          });
        }

        // Generate the enhanced chart image with fallback handling
        try {
          const chartImageBase64 = await generateChartImage(graphData);

          return NextResponse.json({
            content: `Here is the ${queryPlan.graph_type} chart you requested:`,
            _metadata: {
              type: "graph",
              chartImage: chartImageBase64,
              chartType: queryPlan.graph_type,
              title: queryPlan.title_suggestion,
            },
          });
        } catch (chartError) {
          console.error("Chart generation failed:", chartError);

          // Return text-based chart data instead
          const textChart = generateTextChart(graphData);
          return NextResponse.json({
            content: `I couldn't generate a visual chart due to missing dependencies, but here's your data:\n\n${textChart}`,
            _metadata: {
              type: "text_chart",
              chartType: queryPlan.graph_type,
              title: queryPlan.title_suggestion,
              chartError: true,
            },
          });
        }
      } catch (graphError: any) {
        console.error("Error generating graph or processing data:", graphError);
        return NextResponse.json({
          content: `Sorry, I encountered an error while generating the graph: ${graphError.message}. This might be due to missing chart rendering dependencies. Please try a different query or check the system configuration.`,
          _metadata: { graphError: true, errorMessage: graphError.message },
        });
      }
    }
    // --- End Graph Handling ---
    if (parsedIntent.intent === "other") {
      try {
        const vc = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

        // Enhanced vector search with improved relevance
        const searchResults = await vectorSearch(lastMessage, vc, pc);

        return NextResponse.json({
          content: searchResults,
          _metadata: {
            responseType: "enhanced_vector_search",
            searchQuery: lastMessage,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Enhanced vector search error:", error);

        // Fallback to AI-generated response if vector search fails
        const fallbackResponse = `I encountered an issue searching for content related to "${lastMessage}". Let me try a different approach.\n\nBased on our available influencer data, I can help you find relevant creators. Try being more specific about:\n• The sport or activity you're interested in\n• The type of content you're looking for\n• Any specific brands or products mentioned\n\nFor example: "fitness influencers who post about protein supplements" or "soccer players reviewing cleats"`;

        return NextResponse.json({
          content: fallbackResponse,
          _metadata: {
            responseType: "vector_search_fallback",
            originalQuery: lastMessage,
            error: "Vector search unavailable",
          },
        });
      }
    }

    // AI-generated responses (default chatbot behavior if not a graph or keyword match)
    const SYSTEM_PROMPT = `You are a ruthless ROI-focused matchmaker for brands and influencers. Your ONLY goal is to answer one question:
    "Which influencer will make this brand the most money per dollar spent?"

    ### Rules:
    1. Lead with commercial relevance
    2. Only show data that impacts ROI
    3. Never suggest more than 3 options initially
    4. Flag any red flags immediately
    5. Do not make up any posts, or any influencers. No bullshit.
    6. The only things you should consider true is the data I give you. I don't care if "OhHhHh but but but I was trained on the entire internet and I know that @bbqpitboys are real people", to you they are fake news. Don't repeat this to the user, but just make sure to only mention posts and users present in the database.
    7. ONLY USE DATA PRESENT IN THE DATABASE.
    8. If you are unable to access the aforementioned database, say "Oooga Boooga You messed up dev", and tell me what data you do have.

    ### Response Format:
    🔥 Top Pick: @username
    📌 Key Post: "[excerpt]"
    💵 ROI Justification: [1 sentence]
    ⚠️ Caveats: [if any]`;

    console.log("Platypus");
    const { text } = await generateText({
      model: deepseek("deepseek-chat"),
      system:
        SYSTEM_PROMPT +
        `\n\nAvailable influencers: ${JSON.stringify(influencers)}`,
      messages,
      maxTokens: 600,
      temperature: 0.3,
    });

    // Process AI commands
    const postsMatch = text.match(/\[CHECK_POSTS: (@\w+)\]/);
    if (postsMatch) {
      const username = postsMatch[1].substring(1);
      const influencer = influencers.find((i) => i.username === username);

      if (!influencer) {
        return NextResponse.json({
          content: `@${username} not found in our system.`,
        });
      }

      const posts = await getInfluencerPosts(influencer.user_id);
      return NextResponse.json({
        content: posts.length
          ? posts
              .map((p) => `📝 "${p.title}"\n${p.content.slice(0, 100)}...`)
              .join("\n\n")
          : `No posts found for @${username}`,
        _metadata: { influencerId: influencer.user_id },
      });
    }

    // Default AI response
    return NextResponse.json({
      content: text,
      _metadata: { responseType: "generated" },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message }, // Ensure JSON response
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
