import { Pool } from "pg";

// Create a shared connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD || "",
  port: Number(process.env.POSTGRES_PORT),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close clients after 30 seconds of inactivity
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Read-only query function (existing functionality)
export const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    // Start a read-only transaction
    await client.query("BEGIN");
    await client.query("SET TRANSACTION READ ONLY");

    // Execute the query
    const result = await client.query(text, params);

    // Commit if read-only succeeded
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // Rollback on any error
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Read-write query function for authentication and management operations
export const writeQuery = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

// Transactional query function for complex operations
export const transaction = async (
  queries: Array<{ text: string; params?: any[] }>,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const results = [];
    for (const query of queries) {
      const result = await client.query(query.text, query.params);
      results.push(result);
    }

    await client.query("COMMIT");
    return results;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Export the pool for direct access if needed
export const dbPool = {
  query: writeQuery,
  pool,
};
