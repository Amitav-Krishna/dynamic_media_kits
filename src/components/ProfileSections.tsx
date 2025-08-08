import React from "react";
import FollowerGrowthGraph from "@/components/GrowthChart";
import EyeIcon from "@/components/EyeIcon";

interface Influencer {
  name: string;
  username: string;
  sport?: string;
  follower_count?: number;
  follower_growth_weekly?: number;
  platforms?: string;
  bio?: string;
  post_count?: number;
  avg_views?: number;
  top_posts?: Array<{ title: string; views: number }>;
}

interface SectionProps {
  influencer: Influencer;
}

export function PerformanceSection({ influencer }: SectionProps) {
  return (
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
            {(influencer.follower_growth_weekly || 0).toLocaleString()}
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
          <p className="text-2xl font-bold">{influencer.post_count}</p>
        </div>
      </div>
    </div>
  );
}

export function PostsSection({ influencer }: SectionProps) {
  return (
    <div className="border border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">Top Posts</h2>
      <div className="text-white">
        {influencer.top_posts
          ?.slice(0, 3)
          .map((post: { title: string; views: number }, index: number) => (
            <div key={index} className="border border-gray-800 p-4 mb-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  #{index + 1}: {post.title}
                </span>
                <div className="flex items-center gap-2 text-gray-400">
                  <span>{post.views?.toLocaleString() || "0"} views</span>
                  <EyeIcon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export function PlatformsSection({ influencer }: SectionProps) {
  const platformsArray = influencer.platforms
    ? influencer.platforms.split(",").map((p: string) => p.trim())
    : [];

  return (
    <div className="border border-gray-800 p-6">
      <h3 className="font-bold mb-4">Platforms</h3>
      <ul className="space-y-2">
        {platformsArray.map((platform: string) => (
          <li key={platform} className="text-gray-300">
            {platform}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GrowthSection({ influencer }: SectionProps) {
  return (
    <FollowerGrowthGraph
      currentFollowers={influencer.follower_count || 0}
      weeklyGrowth={influencer.follower_growth_weekly || 0}
    />
  );
}

export function BioSection({ influencer }: SectionProps) {
  return (
    <div className="border border-gray-800 p-6">
      <h3 className="font-bold mb-4">About</h3>
      <p className="text-gray-300">
        {influencer.bio || "No bio available yet."}
      </p>
    </div>
  );
}

export function EmptySection() {
  return <div className=""></div>;
}

// Section registry for dynamic rendering
export const SECTION_COMPONENTS = {
  performance: PerformanceSection,
  growth: GrowthSection,
  posts: PostsSection,
  platforms: PlatformsSection,
  bio: BioSection,
  "N/A": EmptySection,
} as const;

export type SectionKey = keyof typeof SECTION_COMPONENTS;

// Default grid layout
export const DEFAULT_LAYOUT: SectionKey[][] = [
  ["performance", "growth"],
  ["posts", "platforms"],
  ["N/A", "bio"],
];

// Section labels for UI
export const SECTION_LABELS: Record<SectionKey, string> = {
  performance: "Performance",
  growth: "Growth Chart",
  posts: "Top Posts",
  platforms: "Platforms",
  bio: "About/Bio",
  "N/A": "Empty Space",
};
