import { VoyageAIClient } from "voyageai";
import { Pinecone } from "@pinecone-database/pinecone";
import { query } from "@/lib/db";
import { generateText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";

interface PineconeMatch {
  id: string;
  score?: number;
  metadata?: any;
}

interface PineconeQueryResponse {
  matches?: PineconeMatch[];
}

interface PostWithInfluencer {
  postId: string;
  score: number;
  content: string;
  influencerName: string;
  title: string;
  sport?: string;
  followerCount?: number;
  username: string;
  relevanceScore: number;
  keywordMatches: string[];
  contextualRelevance: number;
}

interface SearchContext {
  keywords: string[];
  intent:
    | "brand_match"
    | "content_discovery"
    | "influencer_research"
    | "general";
  sportFilter?: string;
  followerRange?: { min?: number; max?: number };
}

/**
 * Enhanced vector search with improved relevance scoring and query preprocessing
 */
export default async function vectorSearch(
  searchQuery: string,
  vc: VoyageAIClient,
  pc: Pinecone,
): Promise<string> {
  console.log("Enhanced Vector Search Query:", searchQuery);

  try {
    // Step 1: Analyze and preprocess the query
    const searchContext = await preprocessQuery(searchQuery);
    console.log("Search Context:", searchContext);

    // Step 2: Generate multiple query variations for better coverage
    const queryVariations = await generateQueryVariations(
      searchQuery,
      searchContext,
    );
    console.log("Query Variations:", queryVariations);

    // Step 3: Perform vector search with multiple queries
    const allMatches = await performMultiQuerySearch(queryVariations, vc, pc);

    if (allMatches.length === 0) {
      return generateNoResultsResponse(searchQuery, searchContext);
    }

    // Step 4: Enhanced relevance scoring and ranking
    const rankedResults = await enhanceAndRankResults(
      allMatches,
      searchContext,
      searchQuery,
    );

    // Step 5: Generate intelligent response
    return generateEnhancedResponse(rankedResults, searchQuery, searchContext);
  } catch (error) {
    console.error("Enhanced vector search error:", error);
    return `I encountered an error while searching for content related to "${searchQuery}". Please try rephrasing your query or try again later.`;
  }
}

/**
 * Preprocesses the search query to extract intent, keywords, and filters
 */
async function preprocessQuery(searchQuery: string): Promise<SearchContext> {
  try {
    const { text } = await generateText({
      model: deepseek("deepseek-chat"),
      prompt: `Analyze this search query and extract structured information: "${searchQuery}"

Extract:
1. Key search terms/keywords (3-8 words)
2. Search intent: brand_match (looking for partnerships), content_discovery (finding content), influencer_research (analyzing influencers), or general
3. Sport mentioned (if any)
4. Follower requirements (if mentioned: "micro", "macro", "mega" or specific numbers)

Respond with JSON only:
{
  "keywords": ["word1", "word2", ...],
  "intent": "brand_match|content_discovery|influencer_research|general",
  "sport": "sport_name or null",
  "followerHint": "micro|macro|mega|specific_number or null"
}

Examples:
"fitness influencers for protein powder brand" → {"keywords": ["fitness", "protein", "powder", "nutrition", "workout"], "intent": "brand_match", "sport": null, "followerHint": null}
"soccer players talking about cleats" → {"keywords": ["soccer", "football", "cleats", "boots", "equipment"], "intent": "content_discovery", "sport": "soccer", "followerHint": null}`,
      maxTokens: 150,
      temperature: 0.1,
    });

    const parsed = JSON.parse(text);

    // Convert follower hints to ranges
    let followerRange: { min?: number; max?: number } | undefined;
    if (parsed.followerHint) {
      switch (parsed.followerHint) {
        case "micro":
          followerRange = { min: 1000, max: 100000 };
          break;
        case "macro":
          followerRange = { min: 100000, max: 1000000 };
          break;
        case "mega":
          followerRange = { min: 1000000 };
          break;
        default:
          if (typeof parsed.followerHint === "number") {
            followerRange = {
              min: parsed.followerHint * 0.8,
              max: parsed.followerHint * 1.2,
            };
          }
      }
    }

    return {
      keywords: parsed.keywords || [],
      intent: parsed.intent || "general",
      sportFilter: parsed.sport,
      followerRange,
    };
  } catch (error) {
    console.error("Query preprocessing error:", error);
    // Fallback to simple keyword extraction
    const words = searchQuery
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          !["the", "and", "for", "with", "about"].includes(word),
      );

    return {
      keywords: words.slice(0, 6),
      intent: "general",
    };
  }
}

/**
 * Generates query variations to improve search coverage
 */
async function generateQueryVariations(
  originalQuery: string,
  context: SearchContext,
): Promise<string[]> {
  const variations = [originalQuery];

  // Add keyword-based variations
  if (context.keywords.length > 0) {
    variations.push(context.keywords.join(" "));

    // Add contextual variations based on intent
    switch (context.intent) {
      case "brand_match":
        variations.push(
          `${context.keywords.join(" ")} brand partnership collaboration`,
        );
        variations.push(`${context.keywords.join(" ")} sponsorship marketing`);
        break;
      case "content_discovery":
        variations.push(`${context.keywords.join(" ")} content posts videos`);
        break;
      case "influencer_research":
        variations.push(
          `${context.keywords.join(" ")} influencer creator athlete`,
        );
        break;
    }
  }

  // Add sport-specific variations
  if (context.sportFilter) {
    variations.push(`${context.sportFilter} ${originalQuery}`);
    variations.push(
      `${context.sportFilter} athlete ${context.keywords.join(" ")}`,
    );
  }

  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Performs vector search with multiple query variations
 */
async function performMultiQuerySearch(
  queries: string[],
  vc: VoyageAIClient,
  pc: Pinecone,
): Promise<PineconeMatch[]> {
  const index = pc.index("post-content-embeddings");
  const allMatches: PineconeMatch[] = [];
  const seenIds = new Set<string>();

  for (const queryText of queries) {
    try {
      const embedding = await vc.embed({
        input: [queryText],
        model: "voyage-3-large",
        inputType: "query",
        truncation: true,
      });

      const results: PineconeQueryResponse = await index.query({
        vector: embedding.data?.[0]?.embedding || [],
        topK: 15, // Increased from 20 to get more diverse results per query
        includeMetadata: true,
      });

      if (results.matches) {
        for (const match of results.matches) {
          if (!seenIds.has(match.id)) {
            seenIds.add(match.id);
            allMatches.push({
              ...match,
              // Store which query variation found this match
              metadata: {
                ...match.metadata,
                foundByQuery: queryText,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error with query variation "${queryText}":`, error);
    }
  }

  return allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * Enhances results with additional scoring factors and influencer data
 */
async function enhanceAndRankResults(
  matches: PineconeMatch[],
  context: SearchContext,
  originalQuery: string,
): Promise<PostWithInfluencer[]> {
  const enhancedResults: PostWithInfluencer[] = [];
  const processedUsers = new Set<string>();

  for (const match of matches.slice(0, 30)) {
    // Process more matches initially
    if (enhancedResults.length >= 10) break; // But limit final results

    const postId = match.id;
    const content = (match.metadata as any)?.content || "";
    const vectorScore = match.score || 0;

    try {
      // Get full influencer and post data
      const influencerQuery = `
        SELECT
          u.user_id, u.name, u.username, u.sport, u.follower_count,
          p.title, p.content, p.view_count, p.likes
        FROM public.users u
        JOIN public.posts p ON u.user_id = p.user_id
        WHERE p.post_id = $1
      `;

      const result = await query(influencerQuery, [postId]);

      if (result.rows && result.rows.length > 0) {
        const data = result.rows[0];
        const userId = data.user_id;

        // Skip if we already have 2+ posts from this user (diversity)
        const userPostCount = enhancedResults.filter(
          (r) => r.username === data.username,
        ).length;
        if (userPostCount >= 2) continue;

        // Apply follower count filtering
        if (context.followerRange) {
          const followerCount = data.follower_count || 0;
          if (
            context.followerRange.min &&
            followerCount < context.followerRange.min
          )
            continue;
          if (
            context.followerRange.max &&
            followerCount > context.followerRange.max
          )
            continue;
        }

        // Apply sport filtering
        if (context.sportFilter && data.sport) {
          const sportMatch =
            data.sport
              .toLowerCase()
              .includes(context.sportFilter.toLowerCase()) ||
            context.sportFilter
              .toLowerCase()
              .includes(data.sport.toLowerCase());
          if (!sportMatch) continue;
        }

        // Calculate enhanced relevance score
        const keywordMatches = findKeywordMatches(
          content + " " + data.title,
          context.keywords,
        );
        const contextualRelevance = calculateContextualRelevance(
          data,
          context,
          keywordMatches,
        );
        const relevanceScore = calculateOverallRelevance(
          vectorScore,
          keywordMatches.length,
          contextualRelevance,
          data,
        );

        enhancedResults.push({
          postId,
          score: vectorScore,
          content: data.content,
          title: data.title,
          influencerName: `${data.name || data.username}`,
          username: data.username,
          sport: data.sport,
          followerCount: data.follower_count,
          relevanceScore,
          keywordMatches,
          contextualRelevance,
        });
      }
    } catch (error) {
      console.error(`Error enhancing result for post ${postId}:`, error);
    }
  }

  // Sort by relevance score (descending)
  return enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Finds keyword matches in content
 */
function findKeywordMatches(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter(
    (keyword) =>
      lowerText.includes(keyword.toLowerCase()) ||
      // Check for partial matches for compound keywords
      keyword
        .toLowerCase()
        .split(" ")
        .some((part) => lowerText.includes(part)),
  );
}

/**
 * Calculates contextual relevance based on search intent
 */
function calculateContextualRelevance(
  influencerData: any,
  context: SearchContext,
  keywordMatches: string[],
): number {
  let score = 0;

  // Base score from keyword matches
  score += keywordMatches.length * 10;

  // Intent-based scoring
  switch (context.intent) {
    case "brand_match":
      // Prefer influencers with good engagement and follower count
      if (influencerData.follower_count > 10000) score += 15;
      if (influencerData.follower_count > 100000) score += 10;
      break;
    case "content_discovery":
      // Prefer posts with high engagement
      if (influencerData.view_count > 1000) score += 10;
      if (influencerData.likes && influencerData.view_count) {
        const engagementRate =
          (influencerData.likes / influencerData.view_count) * 100;
        if (engagementRate > 2) score += 15;
      }
      break;
    case "influencer_research":
      // Prefer established influencers
      if (influencerData.follower_count > 50000) score += 20;
      break;
  }

  // Sport relevance
  if (context.sportFilter && influencerData.sport) {
    const sportMatch = influencerData.sport
      .toLowerCase()
      .includes(context.sportFilter.toLowerCase());
    if (sportMatch) score += 25;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Calculates overall relevance score combining multiple factors
 */
function calculateOverallRelevance(
  vectorScore: number,
  keywordCount: number,
  contextualRelevance: number,
  influencerData: any,
): number {
  // Weighted combination of different relevance factors
  const vectorWeight = 0.4;
  const keywordWeight = 0.2;
  const contextWeight = 0.3;
  const popularityWeight = 0.1;

  const vectorComponent = vectorScore * 100 * vectorWeight;
  const keywordComponent = Math.min(keywordCount * 10, 50) * keywordWeight;
  const contextComponent = contextualRelevance * contextWeight;

  // Popularity boost based on follower count (logarithmic scale)
  const followerCount = influencerData.follower_count || 0;
  const popularityComponent =
    Math.min(Math.log10(followerCount + 1) * 5, 25) * popularityWeight;

  return (
    vectorComponent + keywordComponent + contextComponent + popularityComponent
  );
}

/**
 * Generates an enhanced response with better formatting and insights
 */
function generateEnhancedResponse(
  results: PostWithInfluencer[],
  originalQuery: string,
  context: SearchContext,
): string {
  if (results.length === 0) {
    return generateNoResultsResponse(originalQuery, context);
  }

  const topResults = results.slice(0, 5);
  const uniqueInfluencers = [...new Set(topResults.map((r) => r.username))];

  let response = `🎯 **Enhanced Search Results for:** "${originalQuery}"\n\n`;

  // Add context-specific introduction
  switch (context.intent) {
    case "brand_match":
      response += `💼 **Brand Partnership Opportunities** - Found ${uniqueInfluencers.length} potential partners:\n\n`;
      break;
    case "content_discovery":
      response += `📱 **Content Discovery** - Found ${topResults.length} relevant posts:\n\n`;
      break;
    case "influencer_research":
      response += `🔍 **Influencer Research** - Analyzing ${uniqueInfluencers.length} creators:\n\n`;
      break;
    default:
      response += `✨ **Top ${topResults.length} matches** from ${uniqueInfluencers.length} influencers:\n\n`;
  }

  // Add search insights
  if (context.keywords.length > 0) {
    response += `🔑 **Key terms:** ${context.keywords.join(", ")}\n`;
  }
  if (context.sportFilter) {
    response += `⚽ **Sport focus:** ${context.sportFilter}\n`;
  }
  if (context.followerRange) {
    const min = context.followerRange.min
      ? `${(context.followerRange.min / 1000).toFixed(0)}K`
      : "";
    const max = context.followerRange.max
      ? `${(context.followerRange.max / 1000).toFixed(0)}K`
      : "";
    response += `👥 **Audience size:** ${min}${min && max ? "-" : ""}${max}\n`;
  }
  response += "\n";

  // Display results with enhanced information
  topResults.forEach((result, index) => {
    const relevancePercentage = Math.round(result.relevanceScore);
    const followerDisplay = result.followerCount
      ? `${(result.followerCount / 1000).toFixed(result.followerCount >= 1000000 ? 1 : 0)}${result.followerCount >= 1000000 ? "M" : "K"} followers`
      : "follower count unknown";

    response += `**${index + 1}. @${result.username}** ${result.influencerName !== result.username ? `(${result.influencerName})` : ""}\n`;
    response += `📊 Relevance: ${relevancePercentage}% | 👥 ${followerDisplay}`;

    if (result.sport) {
      response += ` | ⚽ ${result.sport}`;
    }
    response += "\n";

    if (result.keywordMatches.length > 0) {
      response += `🎯 Matches: ${result.keywordMatches.join(", ")}\n`;
    }

    response += `📝 *"${result.title}${result.title && result.content ? ": " : ""}${result.content.substring(0, 150)}${result.content.length > 150 ? "..." : ""}"*\n\n`;
  });

  // Add actionable recommendations
  if (context.intent === "brand_match" && topResults.length > 0) {
    const topInfluencer = topResults[0];
    response += `💡 **Recommendation:** @${topInfluencer.username} shows strong alignment with your search criteria `;
    response += `(${Math.round(topInfluencer.relevanceScore)}% relevance match). `;
    if (topInfluencer.followerCount && topInfluencer.followerCount > 50000) {
      response += `With ${(topInfluencer.followerCount / 1000).toFixed(0)}K followers, they have significant reach potential.`;
    }
    response += "\n\n";
  }

  response += `🔍 *Search powered by enhanced semantic matching and relevance scoring*`;

  return response;
}

/**
 * Generates a helpful response when no results are found
 */
function generateNoResultsResponse(
  searchQuery: string,
  context: SearchContext,
): string {
  let response = `🔍 **No direct matches found for:** "${searchQuery}"\n\n`;

  response += `💡 **Try these alternatives:**\n`;
  response += `• Use broader terms (e.g., "${context.keywords.slice(0, 2).join(" ")}" instead of "${searchQuery}")\n`;
  response += `• Try different sports or activities\n`;
  response += `• Search for related concepts or synonyms\n`;

  if (context.sportFilter) {
    response += `• Try searching without the sport filter "${context.sportFilter}"\n`;
  }

  if (context.followerRange) {
    response += `• Adjust your audience size requirements\n`;
  }

  response += `\n
