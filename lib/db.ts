import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const pool: Pool =
  global.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!global.__pgPool) global.__pgPool = pool;

export async function search(embedding: number[], k = 5) {
  const { rows } = await pool.query(
    `SELECT c.content, c.chunk_index, d.source_path,
            1 - (c.embedding <=> $1::vector) AS similarity
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
      ORDER BY c.embedding <=> $1::vector
      LIMIT $2`,
    [`[${embedding.join(",")}]`, k]
  );
  return rows as { content: string; chunk_index: number; source_path: string; similarity: number }[];
}

export async function insertDocument(sourcePath: string): Promise<number> {
  const { rows } = await pool.query(
    "INSERT INTO documents (source_path) VALUES ($1) RETURNING id",
    [sourcePath]
  );
  return rows[0].id;
}

export async function insertChunk(documentId: number, index: number, content: string, embedding: number[]) {
  await pool.query(
    "INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4::vector)",
    [documentId, index, content, `[${embedding.join(",")}]`]
  );
}
