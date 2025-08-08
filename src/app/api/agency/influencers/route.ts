import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const agency = await getSession();

    if (!agency) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get all influencers associated with this agency
    const result = await query(
      `SELECT
        u.user_id,
        u.name,
        u.username,
        u.sport,
        u.follower_count,
        u.platforms,
        u.is_verified,
        u.profile_image_url,
        u.bio,
        u.contact_email,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.user_id) as post_count,
        (SELECT AVG(view_count) FROM posts WHERE user_id = u.user_id) as avg_views,
        (SELECT json_agg(
          json_build_object(
            'title', title,
            'views', view_count
          ) ORDER BY view_count DESC
        ) FROM (
          SELECT title, view_count
          FROM posts
          WHERE user_id = u.user_id
          ORDER BY view_count DESC
          LIMIT 3
        ) AS top_posts) as top_posts
      FROM users u
      WHERE u.agency_id = $1
      ORDER BY u.name ASC`,
      [agency.agency_id]
    );

    // Process the data to add calculated fields
    const influencers = result.rows.map(influencer => ({
      ...influencer,
      follower_growth_weekly: Math.floor((influencer.follower_count || 0) * 0.02),
      platforms_array: influencer.platforms
        ? influencer.platforms.split(",").map((p: string) => p.trim())
        : [],
    }));

    return NextResponse.json({
      success: true,
      influencers,
      count: influencers.length,
    });
  } catch (error) {
    console.error("Error fetching agency influencers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
