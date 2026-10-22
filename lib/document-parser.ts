import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  text: string;
  pageCount: number;
  wordCount: number;
  pages: ParsedPage[];
}

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  pageNumber: number;
  tokenCount: number;
  keywords: string[];
}

export async function parseDocument(buffer: Buffer, mimeType: string, filename: string): Promise<ParsedDocument> {
  const isPdf = mimeType.includes("pdf") || filename.toLowerCase().endsWith(".pdf");
  const isDocx =
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("docx") ||
    filename.toLowerCase().endsWith(".docx");

  if (isPdf) {
    return parsePdf(buffer);
  } else if (isDocx) {
    return parseDocx(buffer);
  } else {
    return parsePlainText(buffer.toString("utf-8"));
  }
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const data = await pdfParse(buffer);
  const text = cleanText(data.text);
  const pageCount = data.numpages || 1;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Approximate per-page splitting or uniform distribution if markers aren't explicit
  const rawPages = data.text.split(/\f/);
  const pages: ParsedPage[] = [];

  if (rawPages.length > 1) {
    rawPages.forEach((pText, i) => {
      const cleaned = cleanText(pText);
      if (cleaned.length > 0) {
        pages.push({ pageNumber: i + 1, text: cleaned });
      }
    });
  } else {
    // If form-feed not present, distribute chunks roughly across pageCount
    const totalLen = text.length;
    const lenPerPage = Math.max(1, Math.ceil(totalLen / pageCount));
    for (let i = 0; i < pageCount; i++) {
      const pageText = text.slice(i * lenPerPage, (i + 1) * lenPerPage);
      if (pageText.trim()) {
        pages.push({ pageNumber: i + 1, text: pageText.trim() });
      }
    }
  }

  return { text, pageCount, wordCount, pages: pages.length > 0 ? pages : [{ pageNumber: 1, text }] };
}

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const text = cleanText(result.value);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 300));

  const pages: ParsedPage[] = [];
  const wordsPerPage = 300;
  for (let i = 0; i < pageCount; i++) {
    const pageWords = words.slice(i * wordsPerPage, (i + 1) * wordsPerPage);
    if (pageWords.length > 0) {
      pages.push({ pageNumber: i + 1, text: pageWords.join(" ") });
    }
  }

  return { text, pageCount, wordCount, pages };
}

function parsePlainText(rawText: string): ParsedDocument {
  const text = cleanText(rawText);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 300));

  const pages: ParsedPage[] = [];
  const wordsPerPage = 300;
  for (let i = 0; i < pageCount; i++) {
    const pageWords = words.slice(i * wordsPerPage, (i + 1) * wordsPerPage);
    if (pageWords.length > 0) {
      pages.push({ pageNumber: i + 1, text: pageWords.join(" ") });
    }
  }

  return { text, pageCount, wordCount, pages };
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function tokenizeKeywords(text: string): string[] {
  // Normalize and tokenize into lowercase words, filter common stopwords
  const stopWords = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
    "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she",
    "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

export function chunkDocument(
  parsed: ParsedDocument,
  chunkSize: number = 1000,
  overlap: number = 200
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const page of parsed.pages) {
    const pageText = page.text;
    if (pageText.length <= chunkSize) {
      chunks.push({
        chunkIndex: chunkIndex++,
        content: pageText,
        pageNumber: page.pageNumber,
        tokenCount: Math.ceil(pageText.length / 4),
        keywords: tokenizeKeywords(pageText),
      });
      continue;
    }

    let start = 0;
    while (start < pageText.length) {
      let end = start + chunkSize;
      if (end < pageText.length) {
        // Try to break at a paragraph or sentence boundary
        const lastPara = pageText.lastIndexOf("\n\n", end);
        const lastPeriod = pageText.lastIndexOf(". ", end);
        if (lastPara > start + chunkSize * 0.5) {
          end = lastPara + 2;
        } else if (lastPeriod > start + chunkSize * 0.5) {
          end = lastPeriod + 1;
        }
      } else {
        end = pageText.length;
      }

      const chunkContent = pageText.slice(start, end).trim();
      if (chunkContent.length > 20) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: chunkContent,
          pageNumber: page.pageNumber,
          tokenCount: Math.ceil(chunkContent.length / 4),
          keywords: tokenizeKeywords(chunkContent),
        });
      }

      if (end >= pageText.length) break;
      start = Math.max(start + 1, end - overlap);
    }
  }

  return chunks;
}
