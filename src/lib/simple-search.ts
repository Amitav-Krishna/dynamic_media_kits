// lib/simple-search.ts
import { db } from './db';

export async function findRelevantPosts(keyword: string, limit = 5) {
  const results = await db.query(`
    SELECT
      p.post_id,
      p.content,
      p.view_count,
      p.like_count,
      u.user_id,
      u.username,
      u.name,
      u.follower_count
    FROM posts p
    JOIN users u ON p.user_id = u.user_id
    WHERE p.content ILIKE '%' || $1 || '%'
    ORDER BY p.like_count DESC
    LIMIT $2
  `, [keyword, limit]);

  return results.rows.map(post => ({
    ...post,
    sentiment: analyzeSentiment(post.content),
    engagementRate: calculateEngagementRate(post)
  }));
}

// Basic sentiment analysis (no ML needed)
function analyzeSentiment(text: string): 'positive'|'neutral'|'negative' {
  text = text.toLowerCase();
  const positive = ['love', 'great', 'best', 'awesome', 'recommend'].some(w => text.includes(w));
  const negative = ['hate', 'worst', 'sucks', 'destroy', 'avoid'].some(w => text.includes(w));

  if (positive) return 'positive';
  if (negative) return 'negative';
  return 'neutral';
}

function calculateEngagementRate(post: any): number {
  if (!post.view_count || post.view_count === 0) return 0;
  return (post.like_count / post.view_count) * 100;
}

export function formatRecommendation(keyword: string, post: any, allPosts: any[]) {
  const positivePosts = allPosts.filter(p => p.sentiment === 'positive').length;
  const totalPosts = allPosts.length;

  return `🔥 Best Match for "${keyword}": @${post.username} (${post.name})

📌 Relevant Post: "${truncateText(post.content, 50)}"
❤️ ${post.like_count.toLocaleString()} likes | 👀 ${post.view_count.toLocaleString()} views
📈 ${post.engagementRate.toFixed(1)}% engagement rate

💡 Why This Works:
- ${positivePosts}/${totalPosts} positive ${keyword} mentions
- ${post.follower_count.toLocaleString()} followers in target market
- Recent activity: ${new Date(post.created_at).toLocaleDateString()}

⚠️ ${getWarningIfNeeded(post)}`;
}

// Helpers
function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ?
    text.substring(0, maxLength) + '...' :
    text;
}

function getWarningIfNeeded(post: any): string {
  if (post.sentiment === 'negative') return 'WARNING: Negative sentiment detected';
  if (post.engagementRate < 1) return 'WARNING: Low engagement rate';
  if (!post.view_count) return 'WARNING: No view data available';
  return 'No major red flags detected';
}

// For the db.ts file (if not already existing)
declare module '@/lib/db' {
  export const db = {
    query: (sql: string, params: any[]) => Promise<{ rows: any[] }>
  };
}
