import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";
import { Pool } from "pg";

// 1. HARDCODED CONFIG - NO MORE ENV BULLSHIT
const CONFIG = {
  POSTGRES: {
    user: "platypus",
    host: "localhost",
    database: "influencer_media_kits",
    password: "dbeaver_cool",
    port: 5432,
  },
  PINECONE: {
    apiKey:
      "pcsk_6BdQXg_AuF3Vgk5s19Z7isJMgsm2jpL52tt599StPwJQSv36h7g3fEysd589dDejvCRqz2",
    indexName: "post-content-embeddings",
  },
  VOYAGE: {
    apiKey: "pa-OD-4_isBwjuSxcsFIBSP67VBaLGcHcf4HFvQvT0hUQ6",
  },
};

// 2. DIRECT DB CONNECTION - NO MORE POOL BULLSHIT
const pgClient = new Pool(CONFIG.POSTGRES);

// 3. INIT CLIENTS - NO MORE DYNAMIC INIT BULLSHIT
const pinecone = new Pinecone({ apiKey: CONFIG.PINECONE.apiKey });
const voyage = new VoyageAIClient({ apiKey: CONFIG.VOYAGE.apiKey });

// 4. MAIN SYNC - NO MORE ERROR HANDLING BULLSHIT
(async () => {
  const client = await pgClient.connect();
  try {
    console.log("🔥 NUKING POSTS TO PINECONE");
    const { rows } = await client.query(
      "SELECT post_id, content, user_id, title FROM public.posts",
    );

    const index = pinecone.index(CONFIG.PINECONE.indexName);
    const BATCH_SIZE = 50;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      console.log(
        `💣 BATCH ${i / BATCH_SIZE + 1}: LOADING ${batch.length} POSTS`,
      );

      const { data: embeddings } = await voyage.embed({
        input: batch.map((p) => p.content),
        model: "voyage-3-large",
        inputType: "document",
      });

      await index.upsert(
        batch.map((post, idx) => ({
          id: post.post_id,
          values: embeddings[idx].embedding,
          metadata: {
            content: post.content,
            user_id: post.user_id,
            title: post.title,
          },
        })),
      );
    }
    console.log(`✅ NUKED ${rows.length} POSTS SUCCESSFULLY`);
  } finally {
    client.release();
    await pgClient.end();
  }
})();
