import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { parseDocument, chunkDocument } from "@/lib/document-parser";
import { getBatchEmbeddings } from "@/lib/rag/hybrid-retriever";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const session = await getUserFromRequest(req);
    const userId = session?.userId;

    let docs: any[];
    if (userId) {
      docs = db
        .query(
          "SELECT id, user_id, name, mime_type, size, status, page_count, word_count, summary, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC"
        )
        .all(userId);
    } else {
      docs = db
        .query(
          "SELECT id, user_id, name, mime_type, size, status, page_count, word_count, summary, created_at FROM documents ORDER BY created_at DESC LIMIT 50"
        )
        .all();
    }

    // Format fields to camelCase for frontend compatibility
    const formatted = docs.map((d) => ({
      id: d.id,
      userId: d.user_id,
      name: d.name,
      mimeType: d.mime_type,
      size: d.size,
      status: d.status,
      pageCount: d.page_count,
      wordCount: d.word_count,
      summary: d.summary,
      createdAt: d.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("Fetch documents error:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getUserFromRequest(req);
    // Allow guest / fallback user ID if not authenticated for easy onboarding
    const userId = session?.userId || "guest-user";

    // Ensure guest user exists if using guest id
    const existingUser = db.query("SELECT id FROM users WHERE id = ?").get(userId);
    if (!existingUser) {
      db.run("INSERT OR IGNORE INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)", [
        userId,
        `${userId}@knowdex.local`,
        "Guest Student",
        "guest-hash",
      ]);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name;
    const mimeType = file.type || "application/octet-stream";
    const size = file.size;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Parse document text & pages
    const parsed = await parseDocument(buffer, mimeType, filename);

    // 2. Split into chunks with page numbers and BM25 keywords
    const chunks = chunkDocument(parsed, 1000, 200);

    // 3. Batch generate dense embeddings for chunks
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await getBatchEmbeddings(chunkTexts);

    // 4. Save document
    const documentId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO documents (id, user_id, name, mime_type, size, status, page_count, word_count, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        userId,
        filename,
        mimeType,
        size,
        "ready",
        parsed.pageCount,
        parsed.wordCount,
        parsed.text.slice(0, 300) + "...",
        now,
      ]
    );

    // 5. Save chunks into database
    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (id, document_id, chunk_index, content, page_number, token_count, embedding, keywords, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    chunks.forEach((chunk, idx) => {
      const chunkId = `${documentId}_${idx}`;
      const embJson = embeddings[idx] ? JSON.stringify(embeddings[idx]) : null;
      const kwJson = JSON.stringify(chunk.keywords);

      insertChunk.run(
        chunkId,
        documentId,
        chunk.chunkIndex,
        chunk.content,
        chunk.pageNumber,
        chunk.tokenCount,
        embJson,
        kwJson,
        now
      );
    });

    return NextResponse.json({
      id: documentId,
      userId,
      name: filename,
      mimeType,
      size,
      status: "ready",
      pageCount: parsed.pageCount,
      wordCount: parsed.wordCount,
      summary: parsed.text.slice(0, 300) + "...",
      createdAt: now,
    });
  } catch (err: any) {
    console.error("Document upload error:", err);
    return NextResponse.json(
      { error: "Failed to process document", detail: err.message || String(err) },
      { status: 500 }
    );
  }
}
