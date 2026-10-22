import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const session = await getUserFromRequest(req);
    const userId = session?.userId;

    let rows: any[];
    if (userId) {
      rows = db
        .query(
          `SELECT cs.id, cs.user_id, cs.document_id, cs.title, cs.created_at, cs.updated_at, d.name as document_name 
           FROM chat_sessions cs 
           LEFT JOIN documents d ON cs.document_id = d.id 
           WHERE cs.user_id = ? 
           ORDER BY cs.updated_at DESC`
        )
        .all(userId);
    } else {
      rows = db
        .query(
          `SELECT cs.id, cs.user_id, cs.document_id, cs.title, cs.created_at, cs.updated_at, d.name as document_name 
           FROM chat_sessions cs 
           LEFT JOIN documents d ON cs.document_id = d.id 
           ORDER BY cs.updated_at DESC LIMIT 50`
        )
        .all();
    }

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        documentId: r.document_id,
        documentName: r.document_name,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch chat sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getUserFromRequest(req);
    const userId = session?.userId || "guest-user";
    const body = await req.json();
    const { documentId, title } = body;

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const doc = db.query("SELECT name FROM documents WHERE id = ?").get(documentId) as any;
    const sessionTitle = title || (doc ? `Chat: ${doc.name}` : "New Academic Discussion");

    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      "INSERT INTO chat_sessions (id, user_id, document_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [sessionId, userId, documentId, sessionTitle, now, now]
    );

    return NextResponse.json({
      id: sessionId,
      userId,
      documentId,
      documentName: doc?.name || "",
      title: sessionTitle,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 });
  }
}
