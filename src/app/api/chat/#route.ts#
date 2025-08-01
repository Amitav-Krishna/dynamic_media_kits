// app/api/chat/route.ts
import getInfluencerData from '@/lib/get-influencer-data';
import calculateEngagementRate from '@/lib/engagement-rate';
import getInfluencerPosts from '@/lib/get-posts';
import extractProductKeywords from '@/lib/extract-keywords';
import findRelevantPosts from '@/lib/find-relevant-posts';
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import analyzeSentiment from '@/lib/analyze-sentiment';
import { deepseek } from '@ai-sdk/deepseek';
import { query } from '@/lib/db';
import { ALLOWED_QUERIES } from '@/lib/db/queries';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'; // Import ChartJSNodeCanvas


// Define types
interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  score: number;
}

interface GraphData {
  title: string;
  labels: string[];
  values: number[];
  type: 'bar'; // For now, only bar graphs
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
  const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
  const upperCaseQuery = sqlQuery.toUpperCase();

  for (const keyword of forbiddenKeywords) {
    if (upperCaseQuery.includes(keyword)) {
      console.warn(`Forbidden keyword found in query: ${keyword}`);
      return false;
    }
  }
  // Basic check for SELECT statement to ensure it's a read operation
  // This is a simplified check; a more robust solution might use a SQL parser.
  if (!upperCaseQuery.trim().startsWith('SELECT')) {
    console.warn('Query does not start with SELECT, potentially not read-only.');
    return false;
  }
  return true;
}

/**
 * Generates a bar chart image using Chart.js and returns it as a base64 encoded string.
 * @param labels The labels for the x-axis.
 * @param values The values for the y-axis.
 * @param title The title of the chart.
 * @returns A promise that resolves to a base64 encoded string of the chart image.
 */
async function generateBarChartImage(labels: string[], values: number[], title: string): Promise<string> {
  const width = 800; // px
  const height = 600; // px
  const backgroundColour = '#ffffff'; // White background for the chart image

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour });

  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Value', // Generic label for the Y-axis data
        data: values,
        backgroundColor: '#4F46E5', // Tailwind indigo-600
        borderRadius: 6, // Rounded corners for bars
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 20,
            weight: 'bold'
          },
          color: '#333'
        },
        legend: {
          display: false // Hide legend for single dataset bar chart
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12
            },
            color: '#333',
            maxRotation: 45, // Rotate labels if they are long
            minRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 12
            },
            color: '#333',
            callback: function(value: number) {
              return value.toLocaleString(); // Format Y-axis labels
            }
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return imageBuffer.toString('base64');
}

// 4. Main API Handler
export async function POST(request: NextRequest) {
  try {
    // Validate request
    const { messages } = await request.json();
    if (!messages?.length) {
      return NextResponse.json(
        { error: 'Messages array required' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    const influencers = await getInfluencerData(); // Fetch all influencers once

    let parsedIntent: any = { intent: 'other' }; // Default to 'other' intent
    let aiGraphIntent: string = '';

    try {
      // Use AI to determine if the user is asking for a graph and extract parameters
      const { text } = await generateText({
        model: deepseek('deepseek-chat'),
        prompt: `Based on the following user message, determine if the user is asking for a data visualization (like a graph or chart).
        If the user explicitly asks for a graph or chart, respond with a JSON object indicating "graph_request" intent and extract relevant details.
        If the user is NOT asking for a graph or chart, respond with a JSON object indicating "other" intent.

        Respond ONLY with the JSON object. Do not include any other text or explanations.

        JSON format for 'graph_request' intent:
        {
          "intent": "graph_request",
          "graph_type": "bar", // Always "bar" for now
          "entity_type": "sport" | "influencer" | "post" | "other", // e.g., "sport" for "performance of sports"
          "metric": "performance" | "engagement" | "sentiment" | "follower_count" | "other",

          "group_by": "sport" | "username" | null,
          "filter": {
            "influencer": "username_if_specified" | null,
            "keyword": "keyword_if_specified" | null,
            "limit": "number_if_specified" | null // For top N requests
          },
          "title_suggestion": "Suggested title for the graph"
        }

        JSON format for 'other' intent:
        {
          "intent": "other"
        }

        Examples:
        User: "Make me a graph of the performance of different sports"
        AI: {"intent": "graph_request", "graph_type": "bar", "entity_type": "sport", "metric": "performance", "group_by": "sport", "filter": null, "title_suggestion": "Performance of Different Sports"}

        User: "Compare the performance of posts by @influencerA with 'running' as opposed to their median"
        AI: {"intent": "graph_request", "graph_type": "bar", "entity_type": "post", "metric": "performance", "group_by": null, "filter": {"influencer": "influencerA", "keyword": "running"}, "title_suggestion": "Engagement of @influencerA's 'running' posts vs. Median"}

        User: "Show me the top 5 influencers by follower count"
        AI: {"intent": "graph_request", "graph_type": "bar", "entity_type": "influencer", "metric": "follower_count", "group_by": "influencer_username", "filter": {"limit": 5}, "title_suggestion": "Top 5 Influencers by Follower Count"}

        User: "Who is the best influencer for dog food?"
        AI: {"intent": "other"}

        User message: "${lastMessage}"
        AI: `,
        maxTokens: 200,
        temperature: 0.0, // Keep temperature low for structured output
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            intent: { type: "string" },
            graph_type: { type: "string", enum: ["bar", "line", "pie"] }, // Expand as needed
            entity_type: { type: "string", enum: ["sport", "influencer", "post", "other"] },
            metric: { type: "string", enum: ["performance", "engagement", "sentiment", "follower_count", "other"] },
            group_by: { type: ["string", "null"], enum: ["sport", "influencer_username", "post_type", null] },
            filter: {
              type: ["object", "null"],
              properties: {
                influencer: { type: ["string", "null"] },
                keyword: { type: ["string", "null"] },
                limit: { type: ["number", "null"] }
              }
            }
            ,
            title_suggestion: { type: "string" }
          },
          required: ["intent"]
        }
      });
      aiGraphIntent = text; // Assign the text response to aiGraphIntent

      // --- Strip markdown code block fences ---
      const jsonMatch = aiGraphIntent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        aiGraphIntent = jsonMatch[1].trim();
      }
      // --- END NEW ---

      // Robust check before parsing JSON
      if (aiGraphIntent && aiGraphIntent.trim().startsWith('{') && aiGraphIntent.trim().endsWith('}')) {
        parsedIntent = JSON.parse(aiGraphIntent);
        console.log("Parsed AI Intent:", parsedIntent);
      } else {
        console.warn('AI graph intent response is not valid JSON format or empty, falling back. Raw response:', aiGraphIntent);
        parsedIntent = { intent: 'other', reason: 'Invalid JSON format or empty response from AI' };
      }

    } catch (parseError) {
      console.error('Error in AI graph intent generation or parsing:', parseError);
      console.error('Raw AI response for graph intent (if available):', aiGraphIntent); // Log the raw response
      // Fallback to 'other' intent if parsing fails
      parsedIntent = { intent: 'other', reason: 'AI generation or parsing failed' };
    }

    // --- Graph Request Handling (NEW Dynamic SQL Generation) ---
    if (parsedIntent.intent === 'graph_request') {
      const queryPlan = parsedIntent;
      let graphData: GraphData = { title: queryPlan.title_suggestion || "Generated Graph", labels: [], values: [], type: 'bar' };

      try {
        // --- NEW: Generate SQL using DeepSeek 2 ---
        const { text: generatedSql } = await generateText({
          model: deepseek('deepseek-chat'), // Using DeepSeek for SQL generation
          prompt: `You are a SQL query generator. Based on the following database schema and user's request for graph data, generate a PostgreSQL SELECT query.
          The query must be read-only (no INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, GRANT, REVOKE).
          The output should be ONLY the SQL query, no explanations or markdown fences.

          Database Schema:
          ${DATABASE_SCHEMA}

          User's Graph Request Details:
          Entity Type: ${queryPlan.entity_type}
          Metric: ${queryPlan.metric}
          ${queryPlan.filter ? `Filter: ${JSON.stringify(queryPlan.filter)}` : ''}
          ${queryPlan.group_by ? `Group By: ${queryPlan.group_by}` : ''}

          Generate SQL query for: "${lastMessage}"
          SQL:`,
          maxTokens: 300,
          temperature: 0.0, // Keep temperature low for precise SQL
        });

        console.log("Generated SQL:", generatedSql);

        // --- NEW: Execute Dynamic SQL ---
        const data = await query(generatedSql);

        // Map dynamic data to graphData structure
        if (data.length > 0) {
            // General mapping logic based on common patterns for graph data
            // This might need refinement based on the exact structure of dynamically generated query results
            if (queryPlan.entity_type === 'sport' && queryPlan.metric === 'follower_count') {
                // Assuming SQL returns columns like 'sport' and 'total_followers'
                graphData.labels = data.map(d => d.sport);
                graphData.values = data.map(d => parseInt(d.total_followers, 10)); // Ensure numeric
            } else if (queryPlan.entity_type === 'influencer' && queryPlan.metric === 'follower_count') {
                // Assuming SQL returns columns like 'username' and 'follower_count'
                graphData.labels = data.map(d => `@${d.username}`);
                graphData.values = data.map(d => parseInt(d.follower_count, 10));
            } else if (queryPlan.entity_type === 'post' && queryPlan.metric === 'performance') {
                // This case is more complex as it involves comparison, might need specific SQL output
                // For simplicity, assume SQL returns 'label' and 'value' for comparison data
                graphData.labels = data.map(d => d.label);
                graphData.values = data.map(d => parseFloat(d.value));
            } else {
                // Generic mapping if specific entity/metric not handled
                // Attempt to find two columns, one for label, one for value
                const keys = Object.keys(data[0]);
                if (keys.length >= 2) {
                    graphData.labels = data.map(d => d[keys[0]]);
                    graphData.values = data.map(d => parseFloat(d[keys[1]]));
                } else {
                    throw new Error("Dynamic query results could not be mapped to graph data.");
                }
            }
        }

          if (graphData.labels.length === 0) {
              return NextResponse.json({
                  content: `I couldn't find data to generate a graph for your request. Please try a different query or ensure data exists.`,
                  _metadata: { noData: true }
              });
          }

          // Generate the chart image
          const chartImageBase64 = await generateBarChartImage(graphData.labels, graphData.values, graphData.title);

          return NextResponse.json({
            content: `Here is the graph you requested:`,
            _metadata: {
              type: 'graph',
              chartImage: chartImageBase64 // Send the base64 image
            }
          });
      } catch (graphError: any) {
          console.error("Error generating graph or processing data:", graphError);
          return NextResponse.json({
              content: `Sorry, I encountered an error while generating the graph: ${graphError.message}.`,
              _metadata: { graphError: true, errorMessage: graphError.message }
          });
      }
    }
    // --- End Graph Handling ---

    // Original keyword extraction and influencer matching logic (only runs if not a graph request)
    const extractedKeywords = await extractProductKeywords(lastMessage);

    if (extractedKeywords.length > 0) {
      console.log("Extracted keywords:", extractedKeywords);

      // Get all posts for each keyword
      const keywordPosts: Record<string, any[]> = {};
      for (const keyword of extractedKeywords) {
        const posts = await findRelevantPosts(keyword);
        if (posts.length > 0) {
          console.log(`Found ${posts.length} posts for keyword: ${keyword}`);
          keywordPosts[keyword] = posts;
        }
      }

      if (Object.keys(keywordPosts).length > 0) {
        // Find influencers and calculate intersection scores
        const influencerScores: Record<string, {
          influencer: any;
          posts: any[];
          matchedKeywords: string[];
          intersectionScore: number;
          positiveRatio: number;
          avgEngagement: number;
          bestPost: any;
        }> = {};

        // Process each keyword's posts
        Object.entries(keywordPosts).forEach(([keyword, posts]) => {
          posts.forEach(post => {
            const username = post.username;

            if (!influencerScores[username]) {
              influencerScores[username] = {
                influencer: post,
                posts: [],
                matchedKeywords: [],
                intersectionScore: 0,
                positiveRatio: 0,
                avgEngagement: 0,
                bestPost: post
              };
            }

            // Add post and track which keywords this influencer matches
            influencerScores[username].posts.push(post);
            if (!influencerScores[username].matchedKeywords.includes(keyword)) {
              influencerScores[username].matchedKeywords.push(keyword);
            }
          });
        });

        // Analyze the sentiment of the original query
        const querysentiment = analyzeSentiment(lastMessage);
        console.log(`Query sentiment: ${querysentiment.sentiment} (${querysentiment.score})`);

        // Calculate final scores for each influencer
        const scoredInfluencers = Object.values(influencerScores).map(data => {
          const keywordIntersection = data.matchedKeywords.length;
          const totalKeywords = extractedKeywords.length;
          const intersectionRatio = keywordIntersection / totalKeywords;

          // Check if any keywords are business-specific
          const hasBusinessKeyword = data.matchedKeywords.some(keyword =>
            lastMessage.toLowerCase().includes(`${keyword} ${keyword}`) ||
            (lastMessage.toLowerCase().includes(`owner of`) && lastMessage.toLowerCase().includes(keyword))
          );

          // Calculate sentiment alignment scores for each post
          let sentimentAlignmentScore = 0;
          let positivePosts = 0;
          
          data.posts.forEach(post => {
            // Analyze post sentiment if not already done
            if (!post.sentiment) {
              const postSentiment = analyzeSentiment(post.content);
              post.sentiment = postSentiment.sentiment;
              post.sentimentScore = postSentiment.score;
              post.sentimentConfidence = postSentiment.confidence;
            }

            // Calculate alignment score based on sentiment matching
            let alignmentMultiplier = 0;
            
            if (querysentiment.sentiment === post.sentiment) {
              // Sentiments match - positive contribution
              alignmentMultiplier = 1 + (post.sentimentConfidence || 0.5); // Boost for confident matches
            } else if (querysentiment.sentiment === 'neutral' || post.sentiment === 'neutral') {
              // One is neutral - small positive contribution
              alignmentMultiplier = 0.3;
            } else {
              // Sentiments oppose - negative contribution
              alignmentMultiplier = -1 - (post.sentimentConfidence || 0.5); // Penalty for confident mismatches
            }

            sentimentAlignmentScore += alignmentMultiplier * 15; // 15 points per post, scaled by alignment
            
            if (post.sentiment === 'positive') {
              positivePosts++;
            }
          });

          const positiveRatio = positivePosts / data.posts.length;
          const avgEngagement = data.posts.reduce((sum, p) => sum + (p.engagementRate || 0), 0) / data.posts.length;

          // Scoring formula - modified to include sentiment alignment
          const intersectionScore = keywordIntersection * 50; // 50 points per matched keyword
          const businessBonus = hasBusinessKeyword ? 20 : 0; // Bonus for business-relevant keywords
          const engagementScore = Math.min(avgEngagement, 10); // Up to 10 points for engagement
          
          // Replace the old sentimentScore with our new alignment-based score
          const totalScore = intersectionScore + businessBonus + sentimentAlignmentScore + engagementScore;

          // Pick best post (prefer sentiment alignment first, then engagement)
          const alignedPosts = data.posts.filter(p => 
            querysentiment.sentiment === p.sentiment || 
            querysentiment.sentiment === 'neutral' || 
            p.sentiment === 'neutral'
          );
          
          const bestPost = alignedPosts.length > 0
            ? alignedPosts.sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))[0]
            : data.posts.sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))[0];

          return {
            ...data,
            intersectionRatio,
            hasBusinessKeyword,
            positiveRatio,
            avgEngagement,
            sentimentAlignmentScore,
            totalScore,
            bestPost,
            queryAlignment: querysentiment.sentiment === bestPost.sentiment ? 'aligned' : 'misaligned'
          };
        });

        // Sort by total score (intersection + business + sentiment alignment + engagement)
        scoredInfluencers.sort((a, b) => b.totalScore - a.totalScore);
        const bestInfluencer = scoredInfluencers[0];

        console.log(`Top influencers by total score:`,
          scoredInfluencers.slice(0, 3).map(inf =>
            `@${inf.influencer.username}: ${inf.matchedKeywords.join('+')} (${inf.totalScore.toFixed(1)} pts, sentiment: ${inf.sentimentAlignmentScore.toFixed(1)})`
          ));

        // Create enhanced recommendation format with sentiment warning
        const keywordCoverage = bestInfluencer.matchedKeywords.join(' + ');
        const coveragePercent = Math.round(bestInfluencer.intersectionRatio * 100);

        // Check if we need to add a sentiment mismatch warning
        let sentimentWarning = '';
        if (bestInfluencer.totalScore < 0 || bestInfluencer.sentimentAlignmentScore < -10) {
          sentimentWarning = `⚠️ **SENTIMENT MISMATCH WARNING**: We've found somebody with similar keywords, but the sentiment is completely different, and as such may not fit well with your brand.\n\n`;
        }

        const enhancedRecommendation = `${sentimentWarning}🔥 Top Pick: @${bestInfluencer.influencer.username}
📌 Key Post: "${bestInfluencer.bestPost.content.slice(0, 50)}${bestInfluencer.bestPost.content.length > 50 ? '...' : ''}"
🎯 Keyword Match: ${keywordCoverage} (${coveragePercent}% coverage)
🎭 Sentiment Alignment: ${bestInfluencer.queryAlignment === 'aligned' ? '✅ Aligned' : '❌ Misaligned'} (${bestInfluencer.sentimentAlignmentScore.toFixed(1)} pts)
💵 ROI Justification: Covers ${bestInfluencer.matchedKeywords.length}/${extractedKeywords.length} brand keywords with ${bestInfluencer.influencer.follower_count?.toLocaleString()} followers
${bestInfluencer.positiveRatio > 0.5 ? '✅ Positive sentiment' : bestInfluencer.avgEngagement > 2 ? '✅ High engagement' : '⚠️ Monitor performance'}`;

        return NextResponse.json({
          content: enhancedRecommendation,
          _metadata: {
            type: 'intersection_match',
            selectedInfluencer: bestInfluencer.influencer.username,
            keywordCoverage: bestInfluencer.matchedKeywords,
            intersectionScore: bestInfluencer.totalScore,
            sentimentAlignment: bestInfluencer.sentimentAlignmentScore,
            queryAlignment: bestInfluencer.queryAlignment,
            allKeywords: extractedKeywords,
            topInfluencers: scoredInfluencers.slice(0, 3).map(inf => ({
              username: inf.influencer.username,
              keywords: inf.matchedKeywords,
              score: inf.totalScore,
              sentimentScore: inf.sentimentAlignmentScore
            }))
          }
        });
      }

      // No posts found for any keyword
      return NextResponse.json({
        content: `No influencers mention any of these terms: ${extractedKeywords.join(', ')}. Try broader terms or different products.`,
        _metadata: { noResults: true, searchedKeywords: extractedKeywords }
      });
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

    console.log("Platypus")
    const { text } = await generateText({
      model: deepseek('deepseek-chat'),
      system: SYSTEM_PROMPT + `\n\nAvailable influencers: ${JSON.stringify(influencers)}`,
      messages,
      maxTokens: 600,
      temperature: 0.3,
    });

    // Process AI commands
    const postsMatch = text.match(/\[CHECK_POSTS: (@\w+)\]/);
    if (postsMatch) {
      const username = postsMatch[1].substring(1);
      const influencer = influencers.find(i => i.username === username);

      if (!influencer) {
        return NextResponse.json({ content: `@${username} not found in our system.` });
      }

      const posts = await getInfluencerPosts(influencer.user_id);
      return NextResponse.json({
        content: posts.length
          ? posts.map(p => `📝 "${p.title}"\n${p.content.slice(0, 100)}...`).join('\n\n')
          : `No posts found for @${username}`,
        _metadata: { influencerId: influencer.user_id }
      });
    }

    // Default AI response
    return NextResponse.json({
      content: text,
      _metadata: { responseType: 'generated' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message }, // Ensure JSON response
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}