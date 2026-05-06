# create-rag-app

RAG chatbot over your documents in 5 minutes. Next.js + pgvector + OpenAI + citation-first answers.

## What you get

```
create-rag-app/
├── app/
│   ├── page.tsx              ← chat UI with streaming + sources
│   ├── layout.tsx
│   └── api/chat/route.ts     ← /api/chat: SSE-streaming RAG endpoint
├── lib/
│   ├── db.ts                 ← pg pool + similarity search
│   └── embed.ts              ← OpenAI embeddings + chunker
├── scripts/
│   └── ingest.ts             ← npm run ingest -- ./source
├── schema.sql                ← pgvector tables + IVFFlat index
└── .env.example
```

## Run locally

```bash
cp .env.example .env       # set OPENAI_API_KEY + DATABASE_URL
npm install
npm run db:setup           # applies schema.sql to your Postgres
npm run ingest -- ./source # drop PDFs/MDs/TXTs in ./source first
npm run dev
```

Open http://localhost:3000 and ask anything about your docs. Citations appear under each answer.

## Deploy

**Vercel + Supabase (recommended):**
1. Push to GitHub.
2. New Supabase project → enable `pgvector` extension → run `schema.sql` in SQL editor.
3. Vercel: import the repo. Add `OPENAI_API_KEY` and `DATABASE_URL` (the Supabase pooled connection string).
4. Re-run `npm run ingest -- ./source` locally pointing at the prod `DATABASE_URL` to populate.

## Going local-only (no cloud)

Swap Postgres for a local Postgres with pgvector, set `DATABASE_URL=postgresql://localhost:5432/rag`, swap embeddings to a local model:

```ts
// lib/embed.ts — replace OpenAI with Ollama
const r = await fetch("http://localhost:11434/api/embeddings", {
  method: "POST",
  body: JSON.stringify({ model: "nomic-embed-text", prompt: text })
});
```

Now your RAG runs entirely on-prem. No cloud, no API bill, no data leaves the box.

## What this is not

- It's not a fine-tuned chatbot — it's retrieval-augmented over docs you ingest.
- It's not a SaaS. You self-host.
- It's not multi-user out of the box. Wrap `/api/chat` in your auth (Clerk, Lucia, BetterAuth).
