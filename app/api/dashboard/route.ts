import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const docCount = (db.query("SELECT COUNT(*) as count FROM documents").get() as any)?.count || 0;
    const chatCount = (db.query("SELECT COUNT(*) as count FROM chat_sessions").get() as any)?.count || 0;
    const quizCount = (db.query("SELECT COUNT(*) as count FROM quizzes").get() as any)?.count || 0;
    const flashcardCount = (db.query("SELECT COUNT(*) as count FROM flashcard_decks").get() as any)?.count || 0;

    const recentDocs = db
      .query("SELECT id, name, size, page_count, created_at FROM documents ORDER BY created_at DESC LIMIT 5")
      .all() as any[];

    const recentChats = db
      .query(
        `SELECT cs.id, cs.title, cs.updated_at, d.name as document_name 
         FROM chat_sessions cs 
         LEFT JOIN documents d ON cs.document_id = d.id 
         ORDER BY cs.updated_at DESC LIMIT 5`
      )
      .all() as any[];

    return NextResponse.json({
      stats: {
        documents: docCount,
        chats: chatCount,
        quizzes: quizCount,
        flashcardDecks: flashcardCount,
      },
      recentDocuments: recentDocs.map((d) => ({
        id: d.id,
        name: d.name,
        size: d.size,
        pageCount: d.page_count,
        createdAt: d.created_at,
      })),
      recentChats: recentChats.map((c) => ({
        id: c.id,
        title: c.title,
        documentName: c.document_name,
        updatedAt: c.updated_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
