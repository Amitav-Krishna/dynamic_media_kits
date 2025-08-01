import { config } from 'dotenv';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';

// Load .env.local from the project root
config({ path: path.resolve(__dirname, '../../../.env.local') });
const vc = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

async function main(){

    const query = "When is my meeting with the aquatic mammal?";
    const queryEmbedding = await vc.embed({
        input: [query],
        model: 'voyage-3-large',
        inputType: 'query',
        truncation: true
    });
    const indexName = "animal-meetings";
    const index = pc.index(indexName);
    const results = await index.query({
        vector: queryEmbedding.data?.[0]?.embedding || [],
        topK: 2,
        includeMetadata: true
    });

    console.log('\nTop results:');
    results.matches?.forEach(match => {
        console.log(`${match.score?.toFixed(2)}: ${(match.metadata as any)?.text}`);
    });
}
main().catch(console.error);