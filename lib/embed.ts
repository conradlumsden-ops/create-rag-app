import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embed(text: string): Promise<number[]> {
  const r = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return r.data[0].embedding;
}

/** Naive word-window chunker. Swap for a smarter one (semantic, sentence-aware) when you outgrow this. */
export function chunkText(text: string, words = 220, overlap = 40): string[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < tokens.length; i += words - overlap) {
    chunks.push(tokens.slice(i, i + words).join(" "));
    if (i + words >= tokens.length) break;
  }
  return chunks;
}
