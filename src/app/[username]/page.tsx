import { getInfluencerByUsername } from '@/lib/db/queries';
import  Link from 'next/link';
import FollowerGrowthGraph from '@/components/GrowthChart';
import { Influencer } from '@/types/mediaKit';
import EyeIcon from '@/components/EyeIcon'; // Make sure to import the EyeIcon
import { CiHome } from "react-icons/ci";


export default async function InfluencerPage({
  params,
}: {
  params: { username: string }; // Removed Promise wrapper - Next.js provides resolved params
}) {
  const { username } = await params;
  const influencer = await getInfluencerByUsername(username);

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
          <div className="flex items-center justify-center gap-6">
            <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-600 flex-shrink-0">
              <img 
                src="https://i0.wp.com/platypus.asn.au/wp-content/uploads/2019/07/scan-logo.apc1200.jpg?resize=340%2C129&ssl=1" 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{influencer.name}</h1>
              <p className="text-lg text-gray-300">@{username}</p>
              <p className="mt-4 text-gray-300">{influencer.sport}</p>
            </div>
            <div className="justify-end">
                 <Link href="/">
                       <CiHome />
                 </ Link>
            </div>
          </div>
        </div>
      </div>

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
                {influencer.top_posts?.slice(0, 3).map((post: {title: string, views: number}, index) => (
                  <div key={index} className="border border-gray-800 p-4 mb-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">#{index + 1}: {post.title}</span>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>{post.views?.toLocaleString() || '0'} views</span>
                        <EyeIcon className="h-4 w-4" />
                      </div>
                    </div>
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

            <FollowerGrowthGraph 
              currentFollowers={influencer.follower_count || 0} 
              weeklyGrowth={influencer.follower_growth_weekly} 
            />
            
            <div className="border border-gray-800 p-6">
              <p>Hello! This is the place that the athlete's bio will go :^)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
