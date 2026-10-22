import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quiz = db
      .query(
        `SELECT q.id, q.document_id, q.title, q.difficulty, q.questions, q.score, q.created_at, d.name as document_name 
         FROM quizzes q 
         LEFT JOIN documents d ON q.document_id = d.id 
         WHERE q.id = ?`
      )
      .get(id) as any;

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: quiz.id,
      documentId: quiz.document_id,
      documentName: quiz.document_name,
      title: quiz.title,
      difficulty: quiz.difficulty,
      questions: JSON.parse(quiz.questions || "[]"),
      score: quiz.score,
      createdAt: quiz.created_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { answers } = body; // Map or object of { questionId: selectedOption }

    const quiz = db.query("SELECT questions FROM quizzes WHERE id = ?").get(id) as any;
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questions: any[] = JSON.parse(quiz.questions || "[]");
    let correct = 0;

    const results = questions.map((q) => {
      const userAnswer = answers?.[q.id];
      const isCorrect = String(userAnswer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
      if (isCorrect) correct++;
      return {
        questionId: q.id,
        userAnswer,
        correctAnswer: q.answer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    db.run("UPDATE quizzes SET score = ? WHERE id = ?", [score, id]);

    return NextResponse.json({
      score,
      total: questions.length,
      correct,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to submit quiz attempt" }, { status: 500 });
  }
}
