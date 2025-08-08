import { ALLOWED_QUERIES } from "@/lib/db/queries";
import { query } from "@/lib/db";
import analyzeSentiment from "@/lib/analyze-sentiment";
import calculateEngagementRate from "@/lib/engagement-rate";
/**
 * Finds relevant posts based on a keyword.
 * Assumes `ALLOWED_QUERIES.FIND_RELEVANT_POSTS` is defined.
 * @param keyword The keyword to search for.
 * @returns A promise that resolves to an array of relevant posts with sentiment and engagement rate.
 */
export default async function findRelevantPosts(
  keyword: string,
): Promise<any[]> {
  console.log("Testing DB connection...");

  const results = await query(ALLOWED_QUERIES.FIND_RELEVANT_POSTS, [keyword]);
  return results.rows.map((post) => ({
    ...post,
    view_count: post.view_count || 0,
    likes: post.likes || 0,
    sentiment: analyzeSentiment(post.content).sentiment,
    engagementRate: calculateEngagementRate(post),
  }));
}
