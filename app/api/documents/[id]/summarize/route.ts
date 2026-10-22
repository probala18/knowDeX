import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import crypto from "crypto";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const summaryType = body.summaryType || "detailed";

    const doc = db.query("SELECT id, name FROM documents WHERE id = ?").get(id) as any;
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const chunks = db
      .query("SELECT content FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC LIMIT 15")
      .all(id) as { content: string }[];

    if (chunks.length === 0) {
      return NextResponse.json({ error: "No document content available" }, { status: 400 });
    }

    const textToSummarize = chunks.map((c) => c.content).join("\n\n").slice(0, 8000);

    const typePrompts: Record<string, string> = {
      short: "Provide a concise 1-paragraph summary capturing the core premise and main finding.",
      detailed: "Provide a comprehensive, multi-section summary with clear academic headings and detailed explanations.",
      bullet: "Provide a structured bullet-point summary highlighting the key takeaways, arguments, and takeaways.",
      executive: "Provide an executive briefing suitable for high-level review, including Problem, Key Insights, and Conclusions.",
    };

    const instruction = typePrompts[summaryType] || typePrompts.detailed;

    const apiKey = process.env.MISTRAL_API_KEY;
    let content = "";

    if (apiKey) {
      const model = new ChatMistralAI({
        model: process.env.MISTRAL_MODEL || "mistral-large-latest",
        apiKey,
        temperature: 0.3,
      });

      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are an expert academic research summarizer. ${instruction}`,
        ],
        ["human", `Academic Document Text:\n\n${textToSummarize}\n\nGenerate the summary:`],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      content = await chain.invoke({});
    } else {
      content = `Summary (${summaryType}) for ${doc.name}:\n\n` + textToSummarize.slice(0, 500) + "...";
    }

    const summaryId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      "INSERT INTO summaries (id, document_id, summary_type, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [summaryId, id, summaryType, content, now]
    );

    return NextResponse.json({
      id: summaryId,
      documentId: id,
      summaryType,
      content,
      createdAt: now,
    });
  } catch (err: any) {
    console.error("Summarization error:", err);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
