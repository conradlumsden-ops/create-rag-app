import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
// @ts-expect-error pdf-parse has no types
import pdf from "pdf-parse";
import { embed, chunkText } from "../lib/embed.js";
import { insertChunk, insertDocument, pool } from "../lib/db.js";

async function readDoc(path: string): Promise<string> {
  if (extname(path).toLowerCase() === ".pdf") {
    const buf = readFileSync(path);
    const result = await pdf(buf);
    return result.text;
  }
  return readFileSync(path, "utf8");
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: npm run ingest -- ./source");
    process.exit(1);
  }
  const files = readdirSync(folder).filter((f) => /\.(pdf|md|txt)$/i.test(f));
  console.log(`Ingesting ${files.length} files from ${folder}`);

  for (const file of files) {
    const path = join(folder, file);
    if (!statSync(path).isFile()) continue;
    console.log(`  → ${file}`);
    const text = await readDoc(path);
    const docId = await insertDocument(path);
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      const v = await embed(chunks[i]);
      await insertChunk(docId, i, chunks[i], v);
    }
    console.log(`    ${chunks.length} chunks`);
  }
  await pool.end();
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
