import React from "react";
import Link from "next/link";
import { Influencer } from "@/types/mediaKit";

interface InfluencerCardProps {
  influencer: {
    user_id: string;
    name: string;
    username: string;
    sport?: string;
    follower_count?: number;
    platforms_array?: string[];
    is_verified?: boolean;
    profile_image_url?: string;
    bio?: string;
    post_count?: number;
    avg_views?: number;
    follower_growth_weekly?: number;
    top_posts?: Array<{ title: string; views: number }>;
  };
}

export default function InfluencerCard({ influencer }: InfluencerCardProps) {
  const formatNumber = (num?: number) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
            {influencer.profile_image_url ? (
              <img
                src={influencer.profile_image_url}
                alt={influencer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                {influencer.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{influencer.name}</h3>
              {influencer.is_verified && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm">@{influencer.username}</p>
            {influencer.sport && (
              <p className="text-purple-400 text-sm">{influencer.sport}</p>
            )}
          </div>
        </div>
        <Link
          href={`/${influencer.username}`}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors"
        >
          View Profile
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 rounded-md p-3">
          <p className="text-gray-400 text-xs mb-1">Followers</p>
          <p className="text-white font-semibold">
            {formatNumber(influencer.follower_count)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-md p-3">
          <p className="text-gray-400 text-xs mb-1">Avg Views</p>
          <p className="text-white font-semibold">
            {formatNumber(Math.trunc(influencer.avg_views || 0))}
          </p>
        </div>
        <div className="bg-gray-900 rounded-md p-3">
          <p className="text-gray-400 text-xs mb-1">Posts</p>
          <p className="text-white font-semibold">
            {influencer.post_count || 0}
          </p>
        </div>
        <div className="bg-gray-900 rounded-md p-3">
          <p className="text-gray-400 text-xs mb-1">Weekly Growth</p>
          <p className="text-green-400 font-semibold">
            +{formatNumber(influencer.follower_growth_weekly)}
          </p>
        </div>
      </div>

      {/* Platforms */}
      {influencer.platforms_array && influencer.platforms_array.length > 0 && (
        <div className="mb-4">
          <p className="text-gray-400 text-xs mb-2">Platforms</p>
          <div className="flex flex-wrap gap-2">
            {influencer.platforms_array.map((platform, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {influencer.bio && (
        <div className="mb-4">
          <p
            className="text-gray-300 text-sm overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {influencer.bio}
          </p>
        </div>
      )}

      {/* Top Posts */}
      {influencer.top_posts && influencer.top_posts.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs mb-2">Top Posts</p>
          <div className="space-y-1">
            {influencer.top_posts.slice(0, 2).map((post, index) => (
              <div
                key={index}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-gray-300 truncate flex-1 mr-2">
                  {post.title}
                </span>
                <span className="text-gray-500">
                  {formatNumber(post.views)} views
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
