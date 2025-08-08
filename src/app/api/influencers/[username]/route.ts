import { NextRequest, NextResponse } from "next/server";
import { query, writeQuery } from "@/lib/db";
import { ALLOWED_QUERIES } from "@/lib/db/queries";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } },
) {
  try {
    const { username } = await params;

    const result = await query(ALLOWED_QUERIES.GET_INFLUENCER_BY_USERNAME, [
      username,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Influencer not found" },
        { status: 404 },
      );
    }

    const influencer = {
      ...result.rows[0],
      follower_growth_weekly: Math.floor(
        (result.rows[0].follower_count || 0) * 0.02,
      ),
    };

    return NextResponse.json(influencer);
  } catch (error) {
    console.error("Error fetching influencer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { username: string } },
) {
  try {
    const agency = await getSession();

    if (!agency) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { username } = params;
    const body = await request.json();
    const { action } = body;

    if (action === "claim") {
      // Check if influencer exists and is not already claimed
      const influencerResult = await query(
        "SELECT user_id, agency_id FROM users WHERE username = $1",
        [username],
      );

      if (influencerResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Influencer not found" },
          { status: 404 },
        );
      }

      const influencer = influencerResult.rows[0];

      if (influencer.agency_id) {
        return NextResponse.json(
          { error: "Athlete is already claimed by an agency" },
          { status: 409 },
        );
      }

      // Claim the athlete
      await writeQuery(
        "UPDATE users SET agency_id = $1, updated_at = NOW() WHERE username = $2",
        [agency.agency_id, username],
      );

      return NextResponse.json({
        success: true,
        message: "Athlete claimed successfully",
      });
    } else if (action === "update_profile") {
      // Handle profile update (bio, image, and/or layout)
      const { bio, profile_image_url, sidebar_layout } = body;

      // Check if influencer exists and is owned by this agency
      const influencerResult = await query(
        "SELECT user_id, agency_id FROM users WHERE username = $1",
        [username],
      );

      if (influencerResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Influencer not found" },
          { status: 404 },
        );
      }

      const influencer = influencerResult.rows[0];

      if (influencer.agency_id !== agency.agency_id) {
        return NextResponse.json(
          { error: "You don't have permission to edit this athlete" },
          { status: 403 },
        );
      }

      // Update the profile
      await writeQuery(
        "UPDATE users SET bio = $1, profile_image_url = $2, sidebar_layout = $3, updated_at = NOW() WHERE username = $4",
        [bio, profile_image_url, sidebar_layout, username],
      );

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error claiming influencer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
