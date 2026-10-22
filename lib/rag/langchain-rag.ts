import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { hybridRetrieve, RetrievedChunk } from "./hybrid-retriever";
import { getLLM } from "@/lib/llm";

export interface ChatHistoryExchange {
  role: "user" | "assistant";
  content: string;
}

export interface RagResponse {
  answer: string;
  sources: {
    content: string;
    pageNumber: number;
    relevanceScore: number;
    retrievalType: "hybrid";
    denseScore: number;
    sparseScore: number;
  }[];
}

const RAG_SYSTEM_PROMPT = `You are knowDeX, an advanced academic AI assistant specializing in deep document comprehension and learning support.
Use the following retrieved context passages from the student's study material to provide an insightful, accurate, and comprehensive answer.

Guidelines:
1. Always ground your explanations in the provided context.
2. Cite the exact page numbers [Page X] where key facts or concepts originate.
3. If the context does not contain enough information to fully answer, state what the document mentions and honestly clarify what is missing.
4. Maintain an encouraging, clear, and scholarly tone. Format using Markdown (headings, bullet points, bold key terms).`;

export async function generateRagAnswer(
  documentId: string,
  question: string,
  history: ChatHistoryExchange[] = [],
  topK: number = 5
): Promise<RagResponse> {
  // 1. Perform Hybrid Retrieval (Dense Vector + BM25 Sparse + RRF)
  const chunks = await hybridRetrieve(documentId, question, topK);

  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't locate any relevant text passages in this document for your question. Please ensure the document has been fully uploaded and processed.",
      sources: [],
    };
  }

  // 2. Format context with source citations
  const contextText = chunks
    .map(
      (c, idx) =>
        `[Passage ${idx + 1}] (Page ${c.pageNumber}, Hybrid Relevance: ${(c.relevanceScore * 100).toFixed(0)}%):\n${c.content}`
    )
    .join("\n\n---\n\n");

  // 3. Format conversation history
  const historyText =
    history.length > 0
      ? history
          .slice(-6)
          .map((m) => `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`)
          .join("\n\n")
      : "No previous conversation.";

  // 4. Construct LangChain Prompt Template
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", RAG_SYSTEM_PROMPT],
    [
      "human",
      `Document Context:\n{context}\n\nRecent Discussion:\n{history}\n\nStudent Question: {question}\n\nPlease provide your detailed academic response with page citations:`,
    ],
  ]);

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return {
      answer: `Context found from document (Hybrid Retrieval): \n\n${chunks[0].content}\n\n*(Note: Please set OPENROUTER_API_KEY in your .env file to enable full generative AI answers with OpenRouter free models).*`,
      sources: chunks.map((c) => ({
        content: c.content.slice(0, 300) + (c.content.length > 300 ? "..." : ""),
        pageNumber: c.pageNumber,
        relevanceScore: c.relevanceScore,
        retrievalType: "hybrid",
        denseScore: c.denseScore,
        sparseScore: c.sparseScore,
      })),
    };
  }

  // 5. Initialize OpenRouter LangChain Chat model
  const model = getLLM({ temperature: 0.2 });

  // 6. Chain execution with StringOutputParser
  const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());

  try {
    const response = await chain.invoke({
      context: contextText,
      history: historyText,
      question: question,
    });

    const sources = chunks.map((c) => ({
      content: c.content.slice(0, 300) + (c.content.length > 300 ? "..." : ""),
      pageNumber: c.pageNumber,
      relevanceScore: c.relevanceScore,
      retrievalType: "hybrid" as const,
      denseScore: c.denseScore,
      sparseScore: c.sparseScore,
    }));

    return {
      answer: response,
      sources,
    };
  } catch (err: any) {
    console.error("LangChain RAG generation error:", err);
    return {
      answer: `An error occurred while generating the answer: ${err.message || String(err)}`,
      sources: chunks.map((c) => ({
        content: c.content.slice(0, 300) + "...",
        pageNumber: c.pageNumber,
        relevanceScore: c.relevanceScore,
        retrievalType: "hybrid",
        denseScore: c.denseScore,
        sparseScore: c.sparseScore,
      })),
    };
  }
}
