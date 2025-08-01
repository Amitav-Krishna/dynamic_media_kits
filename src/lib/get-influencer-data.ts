import { query } from '@/lib/db';
import { ALLOWED_QUERIES} from '@/lib/db/queries';
/**
 * Retrieves data for all influencers.
 * Assumes `ALLOWED_QUERIES.GET_ALL_INFLUENCERS` is defined.
 * @returns A promise that resolves to an array of influencer data.
 */
export default async function getInfluencerData(): Promise<any[]> {
  const results = await query(ALLOWED_QUERIES.GET_ALL_INFLUENCERS);
  return results.rows;
}