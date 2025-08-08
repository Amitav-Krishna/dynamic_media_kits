import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const voyage = new VoyageAIClient(process.env.VOYAGE_API_KEY!);

export async function POST(req: Request) {
  const { searchText, userId } = await req.json();

  try {
    // Generate embedding for the search query
    const {
      data: [queryEmbedding],
    } = await voyage.embed({
      input: [searchText],
      model: "voyage-3-large",
      inputType: "query",
    });

    // Search Pinecone for posts by this specific user
    const index = pinecone.index("post-content-embeddings");
    const { matches } = await index.query({
      vector: queryEmbedding.embedding,
      topK: 3, // Get top 3 most relevant posts
      includeMetadata: true,
      filter: {
        user_id: { $eq: userId },
      },
    });

    // Return posts with relevance scores
    // Get full post data from PostgreSQL
    const postIds = matches.map((match) => match.id);
    const { rows } = await query(
      "SELECT post_id, title, content, view_count, likes FROM posts WHERE post_id = ANY($1)",
      [postIds],
    );

    const relevantPosts = matches.map((match) => {
      const postData = rows.find((row) => row.post_id === match.id);
      return {
        id: match.id,
        title: match.metadata?.title || "Untitled",
        content: match.metadata?.content || "",
        view_count: postData?.view_count || 0,
        likes: postData?.likes || 0,
        relevanceScore: match.score || 0,
      };
    });

    return NextResponse.json({ posts: relevantPosts });
  } catch (error) {
    console.error("Posts search error:", error);
    return NextResponse.json({ error: "Posts search failed" }, { status: 500 });
  }
}
