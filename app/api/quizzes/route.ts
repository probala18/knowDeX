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
      try {
        const model = getLLM({ temperature: 0.3 });

        const prompt = ChatPromptTemplate.fromMessages([
          [
            "system",
            `Generate ${count} academic quiz questions from the provided text.
Difficulty: ${difficulty}.
Include multiple choice questions (with 4 options A, B, C, D) and True/False questions.
Return ONLY a valid JSON array of objects with structure:
[
  {{
    "id": "q1",
    "question": "What is...",
    "questionType": "multiple_choice",
    "options": [
      {{ "label": "A", "text": "Option A" }},
      {{ "label": "B", "text": "Option B" }},
      {{ "label": "C", "text": "Option C" }},
      {{ "label": "D", "text": "Option D" }}
    ],
    "answer": "A",
    "explanation": "Because..."
  }}
]`,
          ],
          ["human", "Document:\n{documentText}\n\nJSON array:"],
        ]);

        const chain = prompt.pipe(model).pipe(new StringOutputParser());
        const raw = await chain.invoke({ documentText: text });
        const start = raw.indexOf("[");
        const end = raw.lastIndexOf("]") + 1;
        if (start !== -1 && end > start) {
          questions = JSON.parse(raw.slice(start, end));
        }
      } catch (err: any) {
        console.warn("LLM quiz generation failed, using document-derived fallback:", err?.message || err);
      }
    }

    if (questions.length === 0) {
      questions = generateSmartQuiz(text, doc.name, difficulty, count);
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

function generateSmartQuiz(text: string, docName: string, difficulty: string, maxCount: number): any[] {
  const questions: any[] = [];
  const cleanName = docName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

  const sentences = text
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 250);

  // 1. Definition-based multiple choice questions
  const defRegex = /^([A-Z][A-Za-z0-9\s-]{2,40}?)\s+(?:is(?: a| an| the)?|refers to|consists of|defined as)\s+(.+)$/i;

  for (const s of sentences) {
    if (questions.length >= maxCount) break;
    const match = s.match(defRegex);
    if (match) {
      const term = match[1].trim();
      const answerText = match[2].trim().replace(/\.$/, "");
      questions.push({
        id: `q_${questions.length + 1}`,
        question: `According to ${cleanName}, what is ${term}?`,
        questionType: "multiple_choice",
        options: [
          { label: "A", text: answerText },
          { label: "B", text: `A secondary byproduct unrelated to ${term}` },
          { label: "C", text: `An obsolete historical concept superseded by ${term}` },
          { label: "D", text: `A random variable with no bearing on ${cleanName}` },
        ],
        answer: "A",
        explanation: `${term} is accurately described as: ${answerText}.`,
      });
    }
  }

  // 2. True / False question derived from a factual sentence
  if (sentences.length > 0 && questions.length < maxCount) {
    const fact = sentences[0];
    questions.push({
      id: `q_${questions.length + 1}`,
      question: `True or False: "${fact}"`,
      questionType: "multiple_choice",
      options: [
        { label: "A", text: "True" },
        { label: "B", text: "False" },
      ],
      answer: "A",
      explanation: `This statement is directly confirmed by the source text of ${cleanName}.`,
    });
  }

  // 3. Sentence comprehension question
  for (let i = 1; i < sentences.length && questions.length < maxCount; i++) {
    const s = sentences[i];
    if (s.length > 40) {
      questions.push({
        id: `q_${questions.length + 1}`,
        question: `Which of the following statements is supported by the text?`,
        questionType: "multiple_choice",
        options: [
          { label: "A", text: s },
          { label: "B", text: "The document claims the exact opposite of established observations." },
          { label: "C", text: "The findings apply only in unconstrained virtual environments." },
          { label: "D", text: "None of the empirical data supports this conclusion." },
        ],
        answer: "A",
        explanation: `The document explicitly states: "${s}".`,
      });
      break;
    }
  }

  // 4. Document focus / overview question
  if (questions.length < maxCount) {
    questions.push({
      id: `q_${questions.length + 1}`,
      question: `What is the primary topic explored in "${docName}"?`,
      questionType: "multiple_choice",
      options: [
        { label: "A", text: `Key principles, mechanisms, and analysis of ${cleanName}` },
        { label: "B", text: "Unrelated fictional narratives" },
        { label: "C", text: "Financial trading stock tickers" },
        { label: "D", text: "Commercial travel itineraries" },
      ],
      answer: "A",
      explanation: `"${docName}" focuses on domain concepts and academic foundations related to ${cleanName}.`,
    });
  }

  // 5. True / False statement on scope
  if (questions.length < maxCount) {
    questions.push({
      id: `q_${questions.length + 1}`,
      question: `True or False: The concepts presented in ${cleanName} provide actionable academic and practical insights.`,
      questionType: "multiple_choice",
      options: [
        { label: "A", text: "True" },
        { label: "B", text: "False" },
      ],
      answer: "A",
      explanation: `The document's structure and concepts are intended to facilitate study, recall, and subject mastery.`,
    });
  }

  return questions.slice(0, maxCount);
}
