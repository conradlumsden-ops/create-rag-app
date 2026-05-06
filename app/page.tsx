"use client";

import { useState, useRef, useEffect } from "react";

interface Source { path: string; similarity: number; }
interface Msg { role: "user" | "assistant"; content: string; sources?: Source[]; }

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || pending) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages([...next, { role: "assistant", content: "", sources: [] }]);
    setInput("");
    setPending(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: next })
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split("\n\n");
      buf = events.pop() ?? "";
      for (const ev of events) {
        const lines = ev.split("\n");
        let name = "message";
        let data = "";
        for (const l of lines) {
          if (l.startsWith("event:")) name = l.slice(6).trim();
          if (l.startsWith("data:")) data += l.slice(5).trim();
        }
        if (!data) continue;
        try {
          const p = JSON.parse(data);
          if (name === "sources") {
            setMessages((m) => {
              const c = [...m];
              c[c.length - 1] = { ...c[c.length - 1], sources: p as Source[] };
              return c;
            });
          } else if (p.chunk) {
            setMessages((m) => {
              const c = [...m];
              c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + p.chunk };
              return c;
            });
          }
        } catch {}
      }
    }
    setPending(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>RAG over your docs</h1>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>
        Ask anything. Answers cite the source documents.
      </p>

      <div ref={scroll} style={{ height: 480, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        {messages.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>Ingest some docs first: <code>npm run ingest -- ./source</code></p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {m.role}
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content || (pending && i === messages.length - 1 ? "…" : "")}</div>
            {m.sources && m.sources.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                <strong>Sources:</strong>
                <ol style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  {m.sources.map((s, j) => (
                    <li key={j}>{s.path} <span style={{ color: "#999" }}>({(s.similarity * 100).toFixed(0)}%)</span></li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your documents..."
          disabled={pending}
          style={{ flex: 1, padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}
        />
        <button type="submit" disabled={pending || !input.trim()} style={{ padding: "10px 18px", background: "#000", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
          Send
        </button>
      </form>
    </main>
  );
}
