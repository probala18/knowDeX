import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = db
      .query(
        `SELECT cs.id, cs.user_id, cs.document_id, cs.title, cs.created_at, cs.updated_at, d.name as document_name 
         FROM chat_sessions cs 
         LEFT JOIN documents d ON cs.document_id = d.id 
         WHERE cs.id = ?`
      )
      .get(id) as any;

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = db
      .query(
        "SELECT id, session_id, role, content, sources, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC"
      )
      .all(id) as any[];

    return NextResponse.json({
      id: session.id,
      userId: session.user_id,
      documentId: session.document_id,
      documentName: session.document_name,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ? JSON.parse(m.sources) : [],
        createdAt: m.created_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    db.run("DELETE FROM chat_messages WHERE session_id = ?", [id]);
    db.run("DELETE FROM chat_sessions WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
