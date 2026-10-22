import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getLLM } from "@/lib/llm";
import crypto from "crypto";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const concepts = db
      .query("SELECT id, document_id, concept, definition, importance, created_at FROM concepts WHERE document_id = ?")
      .all(id) as any[];

    if (concepts.length > 0) {
      return NextResponse.json(
        concepts.map((c) => ({
          id: c.id,
          documentId: c.document_id,
          concept: c.concept,
          definition: c.definition,
          importance: c.importance,
        }))
      );
    }

    // If none exist yet, extract them using LangChain
    const chunks = db
      .query("SELECT content FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC LIMIT 10")
      .all(id) as { content: string }[];

    if (chunks.length === 0) {
      return NextResponse.json([]);
    }

    const text = chunks.map((c) => c.content).join("\n\n").slice(0, 6000);
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.MISTRAL_API_KEY;

    let items: { concept: string; definition: string; importance: string }[] = [];

    if (apiKey) {
      const model = getLLM({ temperature: 0.1 });

      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `Extract 5 to 8 key academic concepts, theories, or terms from the text.
Return ONLY a valid JSON array of objects with the keys:
"concept": name of the concept,
"definition": clear definition or explanation,
"importance": "high" | "medium" | "core"`,
        ],
        ["human", `Text:\n${text}\n\nJSON array:`],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      const raw = await chain.invoke({});
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]") + 1;
      if (start !== -1 && end > start) {
        items = JSON.parse(raw.slice(start, end));
      }
    }

    if (items.length === 0) {
      items = [
        { concept: "Key Principle", definition: "Primary concept highlighted in study materials", importance: "core" },
        { concept: "Methodology", definition: "Framework for analysis and examination", importance: "high" },
      ];
    }

    const now = new Date().toISOString();
    const inserted = items.map((item) => {
      const conceptId = crypto.randomUUID();
      db.run(
        "INSERT INTO concepts (id, document_id, concept, definition, importance, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [conceptId, id, item.concept, item.definition, item.importance, now]
      );
      return {
        id: conceptId,
        documentId: id,
        concept: item.concept,
        definition: item.definition,
        importance: item.importance,
      };
    });

    return NextResponse.json(inserted);
  } catch (err: any) {
    console.error("Concept extraction error:", err);
    return NextResponse.json({ error: "Failed to extract concepts" }, { status: 500 });
  }
}
