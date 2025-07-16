import { query } from '@/lib/db';
import { ALLOWED_QUERIES } from '@/lib/db/queries';

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const queryName = searchParams.get('query') as keyof typeof ALLOWED_QUERIES;
		const params = searchParams.get('params')?.split(',') || [];
		if (!queryName || !ALLOWED_QUERIES[queryName]) {
			return Response.json({ error: 'Invalid query' }, {status: 400});
	
		}
		const result = await query(ALLOWED_QUERIES[queryName], params);
		return Response.json(result.rows);
	} catch (error) {
		console.error('Database error:', error);
		return Response.json({ error: 'Failed to fetch influencers' }, {status: 500});
	}
}
