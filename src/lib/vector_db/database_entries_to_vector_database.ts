import { VoyageAIClient } from "voyageai";
import { config } from 'dotenv';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

// Load .env.local from the project root
config({ path: path.resolve(__dirname, '../../../.env.local') });
async function main() {
    const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY})

    const response = await client.embed({
        input: ["input1"],
        model: "voyage-3-large",})

    return response;
}
main().catch(console.error);