import { query } from '@/lib/db';

export const ALLOWED_QUERIES = {
	GET_ALL_INFLUENCERS: 'SELECT * FROM users ORDER BY name',
	GET_BY_SPORT: 'SELECT * FROM users WHERE sport = $1',
	GET_INFLUENCER_BY_USERNAME: `
	  SELECT
	    u.*,
	    (SELECT json_agg(
	      json_build_object(
		'title', title,
		'views', view_count
	      ) ORDER BY view_count DESC
	    ) FROM (
	      SELECT title, view_count
	      FROM posts
	      WHERE user_id = u.user_id
	      ORDER BY view_count DESC
	      LIMIT 3
	    ) AS top_three_posts) as top_posts,
	    (SELECT COUNT(*)
	     FROM posts
	     WHERE user_id = u.user_id) as post_count,
	    (SELECT AVG(view_count)
	     FROM posts
	     WHERE user_id = u.user_id) as avg_views
	  FROM users u
	  WHERE username = $1
	`,
	GET_TOP_POSTS: `
	    SELECT * FROM posts
	    WHERE user_id = $1
	    ORDER BY view_count DESC
	    LIMIT 3
	  `

} as const;

export type AllowedQueryKey = keyof typeof ALLOWED_QUERIES;

export async function getInfluencerByUsername(username: string) {
  const result = await query(ALLOWED_QUERIES.GET_INFLUENCER_BY_USERNAME, [username]);
  
  if (result.rows.length === 0) {
    return null;
  }

  return {
    ...result.rows[0],
    follower_growth_weekly: Math.floor((result.rows[0].follower_count || 0) * 0.02)
  };
}
