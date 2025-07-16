import { getInfluencerByUsername } from '@/lib/db/queries';
import { Influencer } from '@/types/mediaKit';

export default async function InfluencerPage({
  params,
}: {
  params: { username: string };
}) {
  const influencer = await getInfluencerByUsername(params.username);

  if (!influencer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="p-8 text-center max-w-md text-white">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>We couldn't find this influencer's profile</p>
          <p className="text-sm mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  const platformsArray = influencer.platforms 
    ? influencer.platforms.split(',').map(p => p.trim())
    : [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{influencer.name}</h1>
            <p className="text-lg text-gray-300">@{influencer.username}</p>
            <p className="mt-4 text-gray-300">{influencer.sport}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Stats */}
          <div className="md:col-span-2 space-y-6">
            <div className="border border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4">Performance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-800 p-4">
                  <p className="text-sm text-gray-400">Total Followers</p>
                  <p className="text-2xl font-bold">
                    {(influencer.follower_count || 0).toLocaleString()}
                  </p>
                </div>
                <div className="border border-gray-800 p-4">
                  <p className="text-sm text-gray-400">Weekly Growth</p>
                  <p className="text-2xl font-bold">
                    {influencer.follower_growth_weekly.toLocaleString()}
                  </p>
                </div>
                <div className="border border-gray-800 p-4">
                  <p className="text-sm text-gray-400">Total Views</p>
                  <p className="text-2xl font-bold">
                    {Math.trunc(influencer.avg_views || 0).toLocaleString()}
                  </p>
                </div>
                <div className="border border-gray-800 p-4">
                  <p className="text-sm text-gray-400">Total Posts</p>
                  <p className="text-2xl font-bold">
                    {influencer.post_count}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Posts */}
            <div className="border border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4">Top Posts</h2>
              <div className="text-white">
                {influencer.top_posts?.slice(0, 3).map((post, index) => (
                  <div key={index} className="border border-gray-800 p-4 mb-2">
                    <p className="text-white">#{index + 1}: {post}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Platforms */}
            <div className="border border-gray-800 p-6">
              <h3 className="font-bold mb-4">Platforms</h3>
              <ul className="space-y-2">
                {platformsArray.map((platform) => (
                  <li key={platform} className="text-gray-300">{platform}</li>
                ))}
              </ul>
            </div>

            {/* Quick Stats */}
            <div className="border border-gray-800 p-6">
              <h3 className="font-bold mb-4">Stats</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Posts</span>
                  <span>{influencer.post_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platforms</span>
                  <span>{platformsArray.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. Views</span>
                  <span>{Math.trunc(influencer.avg_views || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
