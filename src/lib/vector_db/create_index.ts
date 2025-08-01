import { config } from 'dotenv';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';

// Load .env.local from the project root
config({ path: path.resolve(__dirname, '../../../.env.local') });

async function main() {
    // Initialize clients
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const vc = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });

    // Example texts
    const documents = [
        "I am having a call with a platypus on November 30th",
        "I am having a call with a brown bear on December 21st",
        "I am having a call with a narwhal on March 7th"
    ];

    // Generate embeddings
    console.log('Generating embeddings...');
    const embedResponse = await vc.embed({
        input: documents,
        model: 'voyage-3-large', // Using voyage-2 as it's a general purpose model
        truncation: true
    });
    const embeds = embedResponse.data?.map(item => item.embedding) || [];

    console.log(`Created ${embeds.length} embeddings with dimension ${embeds[0]?.length || 0}`);

    // Create Pinecone index
    const indexName = 'animal-meetings';
    console.log(`Creating index ${indexName}...`);
    
    await pc.createIndex({
        name: indexName,
        dimension: embeds[0]?.length || 1024,
        metric: 'cosine',
        spec: {
            serverless: {
                cloud: 'aws',
                region: 'us-east-1'
            }
        }
    });

    // Wait for index to be ready
    console.log('Waiting for index to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    const index = pc.index(indexName);

    // Prepare data for upsert
    const vectors = documents.map((text, idx) => ({
        id: idx.toString(),
        values: embeds[idx],
        metadata: { text }
    }));

    // Upsert data
    console.log('Uploading embeddings to Pinecone...');
    await index.upsert(vectors);

    // Check index stats
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);

    // Perform a sample query
    const query = "When is my meeting with the aquatic mammal?";
    console.log(`Query: ${query}`);

}

main().catch(console.error);