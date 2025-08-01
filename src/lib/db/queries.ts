import { query } from '@/lib/db';

// Updated ALLOWED_QUERIES object with title matching
export const ALLOWED_QUERIES = {
    GET_ALL_INFLUENCERS: 'SELECT u.*, (SELECT COUNT(*) FROM posts WHERE user_id = u.user_id) as post_count FROM users u ORDER BY name',
    GET_NUMBER_OF_POSTS: 'SELECT COUNT(*) FROM posts WHERE user_id = $1',
    GET_USER_POSTS: `SELECT post_id, title, content, view_count, created_at
                FROM posts
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2`,
    GET_BY_SPORT: 'SELECT * FROM users WHERE sport = $1',

    // Updated query to search both title and content
    FIND_RELEVANT_POSTS: `
        SELECT p.*, u.username, u.name, u.follower_count
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.content ILIKE '%' || $1 || '%'
            OR p.title ILIKE '%' || $1 || '%'
        ORDER BY p.view_count DESC
        LIMIT 5
    `,

    GET_INFLUENCER_POSTS: `
        SELECT title, content, view_count, created_at
        FROM posts
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
    `,
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
      `,
    // Removed GET_SPORT_FOLLOWER_COUNTS as it will be dynamically generated
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
