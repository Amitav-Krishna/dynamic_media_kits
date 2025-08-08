import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";
import { NextResponse } from "next/server";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const voyage = new VoyageAIClient(process.env.VOYAGE_API_KEY!);

export async function POST(req: Request) {
  const { searchText } = await req.json();

  try {
    // Generate embedding for any search query
    const {
      data: [queryEmbedding],
    } = await voyage.embed({
      input: [searchText],
      model: "voyage-3-large",
      inputType: "query",
    });

    // Search Pinecone for relevant posts
    const index = pinecone.index("post-content-embeddings");
    const { matches } = await index.query({
      vector: queryEmbedding.embedding,
      topK: 1000,
      includeMetadata: true,
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
