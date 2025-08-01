/**
 * Calculates the engagement rate for a post.
 * Engagement Rate = (Likes / Views) * 100
 * @param post An object containing like_count and view_count.
 * @returns The calculated engagement rate.
 */
export default function calculateEngagementRate(post: { like_count?: number, view_count?: number }): number {
  if (!post.view_count || post.view_count === 0) return 0;
  return ((post.like_count || 0) / post.view_count) * 100;
}
