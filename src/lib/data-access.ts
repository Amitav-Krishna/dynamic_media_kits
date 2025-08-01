// lib/data-access.ts
type PostAccessOptions = {
  limit?: number;
  recentFirst?: boolean;
  searchQuery?: string;
};

export async function getPostsForUser(
  userId: string,
  options: PostAccessOptions = {}
): Promise<Post[]> {
  const { limit = 3, recentFirst = true, searchQuery } = options;

  let query = db
    .selectFrom('posts')
    .select(['post_id', 'title', 'view_count', 'created_at'])
    .where('user_id', '=', userId);

  if (searchQuery) {
    query = query.where('content', 'ilike', `%${searchQuery}%`);
  }

  if (recentFirst) {
    query = query.orderBy('created_at', 'desc');
  }

  return query.limit(limit).execute();
}
