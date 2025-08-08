import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const agency = await getSession();

    if (!agency) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const data = await request.formData();
    const file: File | null = data.get("image") as unknown as File;
    const username = data.get("username") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max size is 5MB." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${username}-${timestamp}.${fileExtension}`;

    // Create uploads directory path
    const uploadsDir = join(process.cwd(), "public", "uploads", "profiles");
    const filePath = join(uploadsDir, filename);

    // Ensure directory exists
    await writeFile(filePath, buffer).catch(async (error) => {
      if (error.code === "ENOENT") {
        // Directory doesn't exist, create it
        const { mkdir } = await import("fs/promises");
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(filePath, buffer);
      } else {
        throw error;
      }
    });

    // Return the public URL
    const imageUrl = `/uploads/profiles/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
