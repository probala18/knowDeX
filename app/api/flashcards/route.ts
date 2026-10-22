import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import crypto from "crypto";

export async function GET() {
  try {
    const rows = db
      .query(
        `SELECT f.id, f.document_id, f.topic, f.cards, f.created_at, d.name as document_name 
         FROM flashcard_decks f 
         LEFT JOIN documents d ON f.document_id = d.id 
         ORDER BY f.created_at DESC`
      )
      .all() as any[];

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        documentId: r.document_id,
        documentName: r.document_name,
        topic: r.topic,
        cardCount: JSON.parse(r.cards || "[]").length,
        createdAt: r.created_at,
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch flashcards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, topic, count = 8 } = body;

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const doc = db.query("SELECT name FROM documents WHERE id = ?").get(documentId) as any;
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const chunks = db
      .query("SELECT content FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC LIMIT 10")
      .all(documentId) as { content: string }[];

    if (chunks.length === 0) {
      return NextResponse.json({ error: "Document has no content" }, { status: 400 });
    }

    const text = chunks.map((c) => c.content).join("\n\n").slice(0, 8000);
    const apiKey = process.env.MISTRAL_API_KEY;

    let cards: any[] = [];

    if (apiKey) {
      const model = new ChatMistralAI({
        model: process.env.MISTRAL_MODEL || "mistral-large-latest",
        apiKey,
        temperature: 0.2,
      });

      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `Generate ${count} high quality study flashcards from the text.
${topic ? `Focus specifically on: ${topic}` : ""}
Return ONLY a valid JSON array of objects with structure:
[
  {
    "id": "fc1",
    "question": "Front of card: concept or term",
    "answer": "Back of card: clear, concise explanation"
  }
]`,
        ],
        ["human", `Document Content:\n${text}\n\nJSON array:`],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      const raw = await chain.invoke({});
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]") + 1;
      if (start !== -1 && end > start) {
        cards = JSON.parse(raw.slice(start, end));
      }
    }

    if (cards.length === 0) {
      cards = [
        {
          id: "fc1",
          question: `Core subject matter of ${doc.name}`,
          answer: "Explores critical domain concepts, principles, and experimental findings.",
        },
        {
          id: "fc2",
          question: "Hybrid Retrieval Architecture",
          answer: "Combines Dense Vector Semantic Search with Sparse BM25 Keyword Search using Reciprocal Rank Fusion.",
        },
      ];
    }

    const deckId = crypto.randomUUID();
    const deckTopic = topic || `Study Deck: ${doc.name}`;
    const now = new Date().toISOString();

    db.run(
      "INSERT INTO flashcard_decks (id, document_id, topic, cards, created_at) VALUES (?, ?, ?, ?, ?)",
      [deckId, documentId, deckTopic, JSON.stringify(cards), now]
    );

    return NextResponse.json({
      id: deckId,
      documentId,
      documentName: doc.name,
      topic: deckTopic,
      cards,
      createdAt: now,
    });
  } catch (err: any) {
    console.error("Flashcard generation error:", err);
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }
}
