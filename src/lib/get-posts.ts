import { query } from '@/lib/db';
import {ALLOWED_QUERIES} from '@/lib/db/queries';
/**
 * Retrieves posts for a specific influencer.
 * Assumes `ALLOWED_QUERIES.GET_USER_POSTS` is defined.
 * @param userId The user ID of the influencer.
 * @returns A promise that resolves to an array of influencer's posts.
 */
export default async function getInfluencerPosts(userId: string): Promise<any[]> {
  const results = await query(ALLOWED_QUERIES.GET_USER_POSTS, [userId, 2]); // Limit 2 is from original code
  return results.rows;
