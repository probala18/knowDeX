import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    engine: "Next.js + Bun",
    rag: "LangChain Hybrid Retrieval (Dense Vector + BM25)",
    time: new Date().toISOString(),
  });
}
