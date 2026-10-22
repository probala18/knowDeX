import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = db
      .query(
        "SELECT id, user_id, name, mime_type, size, status, page_count, word_count, summary, created_at FROM documents WHERE id = ?"
      )
      .get(id) as any;

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Fetch chunks for preview
    const chunks = db
      .query("SELECT id, chunk_index, content, page_number FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC LIMIT 20")
      .all(id) as any[];

    return NextResponse.json({
      id: doc.id,
      userId: doc.user_id,
      name: doc.name,
      mimeType: doc.mime_type,
      size: doc.size,
      status: doc.status,
      pageCount: doc.page_count,
      wordCount: doc.word_count,
      summary: doc.summary,
      createdAt: doc.created_at,
      chunks: chunks.map((c) => ({
        id: c.id,
        chunkIndex: c.chunk_index,
        content: c.content,
        pageNumber: c.page_number,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    db.run("DELETE FROM document_chunks WHERE document_id = ?", [id]);
    db.run("DELETE FROM summaries WHERE document_id = ?", [id]);
    db.run("DELETE FROM concepts WHERE document_id = ?", [id]);
    db.run("DELETE FROM quizzes WHERE document_id = ?", [id]);
    db.run("DELETE FROM flashcard_decks WHERE document_id = ?", [id]);
    db.run("DELETE FROM chat_sessions WHERE document_id = ?", [id]);
    db.run("DELETE FROM documents WHERE id = ?", [id]);

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
