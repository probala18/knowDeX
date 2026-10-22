import { db } from "@/lib/db";
import { tokenizeKeywords } from "@/lib/document-parser";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number;
  relevanceScore: number;
  denseScore: number;
  sparseScore: number;
  rrfScore: number;
}

export interface StoredChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number;
  token_count: number;
  embedding: string | null;
  keywords: string | null;
}

// ─── Mistral Embeddings API ──────────────────────────────────────────────────
export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.mistral.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-embed",
        input: [text],
      }),
    });

    if (!res.ok) {
      console.warn(`Mistral embedding API error: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    return json.data[0].embedding;
  } catch (err) {
    console.error("Error generating embedding:", err);
    return null;
  }
}

export async function getBatchEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || texts.length === 0) return texts.map(() => null);

  try {
    // Process in batches of 16 to respect payload limits
    const results: (number[] | null)[] = [];
    const batchSize = 16;
    for (let i = 0; i < texts.length; i += batchSize) {
      const slice = texts.slice(i, i + batchSize);
      const res = await fetch("https://api.mistral.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-embed",
          input: slice,
        }),
      });

      if (!res.ok) {
        results.push(...slice.map(() => null));
        continue;
      }

      const json = await res.json();
      const embs: number[][] = json.data.map((d: { embedding: number[] }) => d.embedding);
      results.push(...embs);
    }
    return results;
  } catch (err) {
    console.error("Batch embedding error:", err);
    return texts.map(() => null);
  }
}

// ─── Vector Cosine Similarity ────────────────────────────────────────────────
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

// ─── BM25 Sparse Keyword Retrieval ──────────────────────────────────────────
export class BM25Retriever {
  private chunks: StoredChunk[];
  private chunkKeywords: string[][];
  private docFreqs: Map<string, number> = new Map();
  private avgDocLen: number = 0;
  private k1: number = 1.5;
  private b: number = 0.75;

  constructor(chunks: StoredChunk[]) {
    this.chunks = chunks;
    this.chunkKeywords = chunks.map((c) => {
      if (c.keywords) {
        try {
          return JSON.parse(c.keywords);
        } catch {
          return tokenizeKeywords(c.content);
        }
      }
      return tokenizeKeywords(c.content);
    });

    let totalLen = 0;
    for (const kwList of this.chunkKeywords) {
      totalLen += kwList.length;
      const uniqueInChunk = new Set(kwList);
      for (const kw of uniqueInChunk) {
        this.docFreqs.set(kw, (this.docFreqs.get(kw) || 0) + 1);
      }
    }
    this.avgDocLen = chunks.length > 0 ? totalLen / chunks.length : 1;
  }

  public score(query: string): { chunk: StoredChunk; score: number }[] {
    const queryTokens = tokenizeKeywords(query);
    const N = this.chunks.length;
    if (N === 0 || queryTokens.length === 0) {
      return this.chunks.map((c) => ({ chunk: c, score: 0 }));
    }

    const scores = this.chunks.map((chunk, idx) => {
      const docTokens = this.chunkKeywords[idx];
      const docLen = docTokens.length;
      let score = 0;

      // Calculate term frequency in this doc
      const tfMap = new Map<string, number>();
      for (const t of docTokens) {
        tfMap.set(t, (tfMap.get(t) || 0) + 1);
      }

      for (const qToken of queryTokens) {
        const tf = tfMap.get(qToken) || 0;
        if (tf === 0) continue;

        const df = this.docFreqs.get(qToken) || 0;
        // Inverted Document Frequency (IDF) with smoothing
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

        // BM25 term weighting formula
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLen));
        score += idf * (numerator / denominator);
      }

      return { chunk, score };
    });

    return scores;
  }
}

// ─── Hybrid Ensemble Search (Dense + Sparse + RRF) ───────────────────────────
export async function hybridRetrieve(
  documentId: string,
  query: string,
  topK: number = 5,
  alpha: number = 0.5 // 0.5 = equal weight to dense vector and sparse BM25
): Promise<RetrievedChunk[]> {
  // 1. Fetch chunks for the document from database
  const rows = db
    .query(
      `SELECT id, document_id, chunk_index, content, page_number, token_count, embedding, keywords 
       FROM document_chunks 
       WHERE document_id = ? 
       ORDER BY chunk_index ASC`
    )
    .all(documentId) as StoredChunk[];

  if (rows.length === 0) {
    return [];
  }

  // 2. BM25 Sparse Ranking
  const bm25 = new BM25Retriever(rows);
  const bm25Scored = bm25.score(query);
  bm25Scored.sort((a, b) => b.score - a.score);

  // 3. Dense Vector Ranking
  const queryEmbedding = await getEmbedding(query);
  const denseScored = rows.map((chunk) => {
    let score = 0;
    if (queryEmbedding && chunk.embedding) {
      try {
        const chunkEmb = JSON.parse(chunk.embedding);
        score = cosineSimilarity(queryEmbedding, chunkEmb);
      } catch {
        score = 0;
      }
    }
    return { chunk, score };
  });
  denseScored.sort((a, b) => b.score - a.score);

  // 4. Reciprocal Rank Fusion (RRF) & Weighted Ensemble
  const rankDense = new Map<string, number>();
  denseScored.forEach((item, idx) => rankDense.set(item.chunk.id, idx + 1));

  const rankBM25 = new Map<string, number>();
  bm25Scored.forEach((item, idx) => rankBM25.set(item.chunk.id, idx + 1));

  // Max scores for min-max normalization
  const maxDense = Math.max(...denseScored.map((d) => d.score), 0.0001);
  const maxBM25 = Math.max(...bm25Scored.map((b) => b.score), 0.0001);

  const k_rrf = 60; // Standard RRF smoothing constant

  const scoredMap = new Map<
    string,
    {
      chunk: StoredChunk;
      denseScore: number;
      sparseScore: number;
      rrfScore: number;
      combinedScore: number;
    }
  >();

  for (const chunk of rows) {
    const dScore = denseScored.find((x) => x.chunk.id === chunk.id)?.score || 0;
    const bScore = bm25Scored.find((x) => x.chunk.id === chunk.id)?.score || 0;

    const rDense = rankDense.get(chunk.id) || rows.length;
    const rBM25 = rankBM25.get(chunk.id) || rows.length;

    // RRF score
    const rrf = 1 / (k_rrf + rDense) + 1 / (k_rrf + rBM25);

    // Normalized scores
    const normDense = Math.max(0, dScore) / maxDense;
    const normBM25 = Math.max(0, bScore) / maxBM25;

    // Hybrid combined score
    const combined = alpha * normDense + (1 - alpha) * normBM25;

    scoredMap.set(chunk.id, {
      chunk,
      denseScore: dScore,
      sparseScore: bScore,
      rrfScore: rrf,
      combinedScore: combined,
    });
  }

  // Sort by combined hybrid score (fallback to RRF)
  const sorted = Array.from(scoredMap.values()).sort(
    (a, b) => b.combinedScore - a.combinedScore || b.rrfScore - a.rrfScore
  );

  return sorted.slice(0, topK).map((item) => ({
    id: item.chunk.id,
    documentId: item.chunk.document_id,
    content: item.chunk.content,
    pageNumber: item.chunk.page_number || 1,
    relevanceScore: Math.round(item.combinedScore * 100) / 100,
    denseScore: Math.round(item.denseScore * 1000) / 1000,
    sparseScore: Math.round(item.sparseScore * 100) / 100,
    rrfScore: Math.round(item.rrfScore * 10000) / 10000,
  }));
}
