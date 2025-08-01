import { config } from 'dotenv';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

// Load .env.local from the project root
config({ path: path.resolve(__dirname, '../../../.env.local') });

const pc= new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!, // Now properly loaded
});
async function main() {
    const pc = new Pinecone({apiKey: process.env.PINECONE_API_KEY!})
    console.log(process.env.PINECONE_API_KEY!)
    await pc.createIndex({
        name: 'standard-dense-js',
        dimension: 1024,
        metric: 'cosine',
        spec: {
            serverless: {
                cloud: 'aws',
                region: 'us-east-1'
            }
        },
            deletionProtection: 'disabled',
    tags: { environment: 'development'}
})
    console.log('Index creation initiated successfully');
}

main().catch(console.error);