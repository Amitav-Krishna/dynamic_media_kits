/**
 * Formats a recommendation string for a given post and keyword.
 * @param keyword The keyword associated with the post.
 * @param post The post object.
 * @param allPosts All posts related to the keyword for context.
 * @returns A formatted recommendation string.
 */
function formatRecommendation(keyword: string, post: any, allPosts: any[]): string {
  const positiveCount = allPosts.filter(p => p.sentiment === 'positive').length;
  const warning = post.sentiment === 'negative' ? '⚠️ Negative sentiment' :
    calculateEngagementRate(post) < 1 ? '⚠️ Low engagement' :
    '✅ No red flags';

  return `🔥 Top Pick: @${post.username}
📌 Key Post: "${post.content.slice(0, 50)}${post.content.length > 50 ? '...' : ''}"
💵 ROI Justification: ${positiveCount}/${allPosts.length} positive ${keyword} mentions with ${post.follower_count?.toLocaleString()} followers
${warning}`;
 }
