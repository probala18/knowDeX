import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRagAnswer, ChatHistoryExchange } from "@/lib/rag/langchain-rag";
import crypto from "crypto";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await params;
    const { content } = await req.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const session = db
      .query("SELECT id, document_id FROM chat_sessions WHERE id = ?")
      .get(sessionId) as any;

    if (!session) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    const documentId = session.document_id;
    const now = new Date().toISOString();

    // 1. Record user message
    const userMsgId = crypto.randomUUID();
    db.run(
      "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [userMsgId, sessionId, "user", content.trim(), now]
    );

    // 2. Fetch past conversation history for conversational context
    const pastRows = db
      .query(
        "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 10"
      )
      .all(sessionId) as { role: "user" | "assistant"; content: string }[];

    const history: ChatHistoryExchange[] = pastRows.map((r) => ({
      role: r.role,
      content: r.content,
    }));

    // 3. Execute LangChain RAG with Hybrid Retrieval (Dense Vector + BM25 + RRF)
    const ragResult = await generateRagAnswer(documentId, content.trim(), history);

    // 4. Save assistant response with sources
    const assistantMsgId = crypto.randomUUID();
    const assistantNow = new Date().toISOString();
    const sourcesJson = JSON.stringify(ragResult.sources);

    db.run(
      "INSERT INTO chat_messages (id, session_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [assistantMsgId, sessionId, "assistant", ragResult.answer, sourcesJson, assistantNow]
    );

    // Update session timestamp
    db.run("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", [assistantNow, sessionId]);

    return NextResponse.json({
      id: assistantMsgId,
      sessionId,
      role: "assistant",
      content: ragResult.answer,
      sources: ragResult.sources,
      createdAt: assistantNow,
    });
  } catch (err: any) {
    console.error("RAG chat error:", err);
    return NextResponse.json(
      { error: "Failed to generate answer", detail: err.message || String(err) },
      { status: 500 }
    );
  }
}
