import { NextRequest } from "next/server";
import OpenAI from "openai";
import { embed } from "@/lib/embed";
import { search } from "@/lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[] };
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return new Response("no user msg", { status: 400 });

  const queryEmbedding = await embed(last.content);
  const hits = await search(queryEmbedding, 5);

  const context = hits
    .map((h, i) => `[${i + 1}] (${h.source_path})\n${h.content}`)
    .join("\n\n---\n\n");

  const system = `You are a RAG assistant. Answer ONLY using the context below. If the answer is not in the context, say "I don't see that in the documents." Always cite with [1], [2], etc.

# Context
${context}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`event: sources\ndata: ${JSON.stringify(hits.map((h) => ({ path: h.source_path, similarity: h.similarity })))}\n\n`)
      );
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages]
      });
      for await (const part of completion) {
        const chunk = part.choices?.[0]?.delta?.content;
        if (chunk) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" }
  });
}
