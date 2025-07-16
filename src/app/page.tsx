import Link from 'next/link';
import { query } from '@/lib/db';
import { ALLOWED_QUERIES } from '@/lib/db/queries';

export default async function Home() {
  try {
    // Directly query the database using your queries.ts
    const result = await query(ALLOWED_QUERIES.GET_ALL_INFLUENCERS);
    const influencers = await result.rows;

    // Log all influencer IDs
    console.log('Influencer IDs:', influencers.map((i: any) => i.user_id));

    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Featured Influencers</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {influencers.map((influencer: any) => {
              console.log(`Rendering influencer: ${influencer.user_id}`);
              
              return (
                <Link 
                  key={influencer.user_id}
                  href={`/${influencer.username}`}
                  className="border border-gray-800 rounded-lg p-6 hover:border-purple-500 transition-colors duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                        <span className="text-lg font-medium">
                          {influencer.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{influencer.name}</h2>
                      <p className="text-purple-400">@{influencer.username}</p>
                      {influencer.sport && (
                        <p className="text-gray-400 mt-1">{influencer.sport}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm text-gray-400">
                    <span>{influencer.follower_count?.toLocaleString() || '0'} followers</span>
                    <span>{influencer.post_count || '0'} posts</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching influencers:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Error Loading Influencers</h1>
          <p className="text-gray-400">Database connection failed</p>
        </div>
      </div>
    );
  }
}
