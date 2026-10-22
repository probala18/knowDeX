import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getLLM } from "@/lib/llm";
import crypto from "crypto";

export async function GET() {
  try {
    const rows = db
      .query(
        `SELECT q.id, q.document_id, q.title, q.difficulty, q.questions, q.score, q.created_at, d.name as document_name 
         FROM quizzes q 
         LEFT JOIN documents d ON q.document_id = d.id 
         ORDER BY q.created_at DESC`
      )
      .all() as any[];

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        documentId: r.document_id,
        documentName: r.document_name,
        title: r.title,
        difficulty: r.difficulty,
        questionCount: JSON.parse(r.questions || "[]").length,
        score: r.score,
        createdAt: r.created_at,
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, title, difficulty = "medium", count = 5 } = body;

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
      return NextResponse.json({ error: "Document has no extracted content" }, { status: 400 });
    }

    const text = chunks.map((c) => c.content).join("\n\n").slice(0, 8000);
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.MISTRAL_API_KEY;

    let questions: any[] = [];

    if (apiKey) {
      const model = getLLM({ temperature: 0.3 });

      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `Generate ${count} academic quiz questions from the provided text.
Difficulty: ${difficulty}.
Include multiple choice questions (with 4 options A, B, C, D) and True/False questions.
Return ONLY a valid JSON array of objects with structure:
[
  {
    "id": "q1",
    "question": "What is...",
    "questionType": "multiple_choice",
    "options": [
      { "label": "A", "text": "Option A" },
      { "label": "B", "text": "Option B" },
      { "label": "C", "text": "Option C" },
      { "label": "D", "text": "Option D" }
    ],
    "answer": "A",
    "explanation": "Because..."
  }
]`,
        ],
        ["human", `Document:\n${text}\n\nJSON array:`],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      const raw = await chain.invoke({});
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]") + 1;
      if (start !== -1 && end > start) {
        questions = JSON.parse(raw.slice(start, end));
      }
    }

    if (questions.length === 0) {
      questions = [
        {
          id: "q1",
          question: `What is the central focus of ${doc.name}?`,
          questionType: "multiple_choice",
          options: [
            { label: "A", text: "Theoretical foundation and methodology" },
            { label: "B", text: "Historical fiction narrative" },
            { label: "C", text: "Unrelated marketing guidelines" },
            { label: "D", text: "None of the above" },
          ],
          answer: "A",
          explanation: "The document details foundational principles and analysis.",
        },
      ];
    }

    const quizId = crypto.randomUUID();
    const quizTitle = title || `Quiz: ${doc.name} (${difficulty})`;
    const now = new Date().toISOString();

    db.run(
      "INSERT INTO quizzes (id, document_id, title, difficulty, questions, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [quizId, documentId, quizTitle, difficulty, JSON.stringify(questions), now]
    );

    return NextResponse.json({
      id: quizId,
      documentId,
      documentName: doc.name,
      title: quizTitle,
      difficulty,
      questions,
      createdAt: now,
    });
  } catch (err: any) {
    console.error("Quiz generation error:", err);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
