import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
});

export const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    // Start a read-only transaction
    await client.query('BEGIN');
    await client.query('SET TRANSACTION READ ONLY');

    // Execute the query
    const result = await client.query(text, params);

    // Commit if read-only succeeded
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
