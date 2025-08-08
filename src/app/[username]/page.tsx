import { query } from "@/lib/db";
import { ALLOWED_QUERIES } from "@/lib/db/queries";
import Link from "next/link";
import FollowerGrowthGraph from "@/components/GrowthChart";
import { Influencer } from "@/types/mediaKit";
import EyeIcon from "@/components/EyeIcon"; // Make sure to import the EyeIcon
import { CiHome } from "react-icons/ci";
import { getSession } from "@/lib/auth";
import {
  SECTION_COMPONENTS,
  DEFAULT_LAYOUT,
  type SectionKey,
} from "@/components/ProfileSections";

import ClaimButton from "./ClaimButton";
import EditButton from "./EditButton";
import RelevantPosts from "./RelevantPosts";

export default async function InfluencerPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>; // Next.js 15 provides params as Promise
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { username } = await params;
  const { search: searchTerm } = await searchParams;
  const agency = await getSession();
  const result = await query(ALLOWED_QUERIES.GET_INFLUENCER_BY_USERNAME, [
    username,
  ]);
  const influencer =
    result.rows.length > 0
      ? {
          ...result.rows[0],
          follower_growth_weekly: Math.floor(
            (result.rows[0].follower_count || 0) * 0.02,
          ),
        }
      : null;

  // Parse grid layout or use default with bulletproof error handling
  let gridLayout: SectionKey[][] = DEFAULT_LAYOUT;

  if (influencer?.sidebar_layout) {
    try {
      const parsed = JSON.parse(influencer.sidebar_layout);

      // Validate it's an array of arrays with valid section keys
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(
          (row) =>
            Array.isArray(row) &&
            row.length > 0 &&
            row.every(
              (key) => typeof key === "string" && key in SECTION_COMPONENTS,
            ),
        )
      ) {
        gridLayout = parsed;
      } else {
        console.warn(
          "Invalid sidebar_layout structure, using default:",
          parsed,
        );
        gridLayout = DEFAULT_LAYOUT;
      }
    } catch (error) {
      console.error("Failed to parse sidebar_layout:", error);
      gridLayout = DEFAULT_LAYOUT;
    }
  }

  // Final safety check - ensure gridLayout is valid
  if (!Array.isArray(gridLayout) || gridLayout.length === 0) {
    console.error("GridLayout is invalid, forcing default:", gridLayout);
    gridLayout = DEFAULT_LAYOUT;
  }

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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-600 flex-shrink-0">
              {influencer.profile_image_url ? (
                <img
                  src={influencer.profile_image_url}
                  alt={influencer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-300 text-2xl font-bold">
                  {influencer.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{influencer.name}</h1>
              <p className="text-lg text-gray-300">@{username}</p>
              <p className="mt-4 text-gray-300">{influencer.sport}</p>
            </div>
            <div className="flex items-center gap-4">
              {agency && !influencer.agency_id && (
                <ClaimButton
                  username={username}
                  athleteName={influencer.name}
                />
              )}
              {agency && influencer.agency_id === agency.agency_id && (
                <EditButton username={username} athleteName={influencer.name} />
              )}
              {agency &&
                influencer.agency_id &&
                influencer.agency_id !== agency.agency_id && (
                  <div className="px-4 py-2 bg-gray-700 text-gray-400 rounded-md cursor-not-allowed">
                    Already Claimed
                  </div>
                )}
              <Link href="/">
                <CiHome className="text-white text-2xl" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-2">
        {searchTerm ? (
          <div className="mb-6">
            <RelevantPosts
              userId={influencer.user_id}
              searchTerm={searchTerm as string}
            />
          </div>
        ) : null}

        <div className="flex flex-row gap-2">
          {gridLayout[0].map((_, colIndex) => (
            <div key={colIndex} className="flex-1 flex flex-col gap-1">
              {gridLayout.map((row, rowIndex) => {
                const sectionKey = row[colIndex];
                const SectionComponent =
                  SECTION_COMPONENTS[sectionKey as SectionKey];
                return SectionComponent ? (
                  <div key={`${rowIndex}-${colIndex}`}>
                    <SectionComponent influencer={influencer} />
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
