import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deck = db
      .query(
        `SELECT f.id, f.document_id, f.topic, f.cards, f.created_at, d.name as document_name 
         FROM flashcard_decks f 
         LEFT JOIN documents d ON f.document_id = d.id 
         WHERE f.id = ?`
      )
      .get(id) as any;

    if (!deck) {
      return NextResponse.json({ error: "Flashcard deck not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: deck.id,
      documentId: deck.document_id,
      documentName: deck.document_name,
      topic: deck.topic,
      cards: JSON.parse(deck.cards || "[]"),
      createdAt: deck.created_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch flashcard deck" }, { status: 500 });
  }
}
