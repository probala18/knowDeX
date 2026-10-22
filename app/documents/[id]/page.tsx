"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Copy,
  Loader2,
  ListFilter,
  Brain,
  Quote,
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chunks" | "summary" | "concepts">("chunks");
  const [isLoading, setIsLoading] = useState(true);

  // Summary state
  const [summaryType, setSummaryType] = useState<"short" | "detailed" | "bullet" | "executive">("detailed");
  const [summaryContent, setSummaryContent] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Concepts state
  const [concepts, setConcepts] = useState<any[]>([]);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/documents/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Document not found");
        return res.json();
      })
      .then((data) => setDoc(data))
      .catch((err) => {
        toast.error(err.message || "Failed to load document");
        router.push("/documents");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch(`/api/documents/${id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryType }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryContent(data.content);
        toast.success(`Generated ${summaryType} summary!`);
      } else {
        toast.error("Failed to generate summary");
      }
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleLoadConcepts = async () => {
    setIsLoadingConcepts(true);
    try {
      const res = await fetch(`/api/documents/${id}/concepts`);
      if (res.ok) {
        const data = await res.json();
        setConcepts(data);
      }
    } catch {
      toast.error("Failed to extract concepts");
    } finally {
      setIsLoadingConcepts(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id, title: `Chat: ${doc?.name}` }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/chat/${session.id}`);
      }
    } catch {
      toast.error("Failed to start chat session");
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      toast.loading("Generating quiz with LangChain...", { id: "quiz-gen" });
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id, difficulty: "medium", count: 5 }),
      });
      if (res.ok) {
        const quiz = await res.json();
        toast.success("Quiz generated successfully!", { id: "quiz-gen" });
        router.push(`/quizzes/${quiz.id}`);
      } else {
        toast.error("Failed to generate quiz", { id: "quiz-gen" });
      }
    } catch {
      toast.error("Failed to generate quiz", { id: "quiz-gen" });
    }
  };

  const handleGenerateFlashcards = async () => {
    try {
      toast.loading("Generating flashcards with LangChain...", { id: "fc-gen" });
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id, count: 8 }),
      });
      if (res.ok) {
        const deck = await res.json();
        toast.success("Flashcards deck created!", { id: "fc-gen" });
        router.push(`/flashcards/${deck.id}`);
      } else {
        toast.error("Failed to create flashcards", { id: "fc-gen" });
      }
    } catch {
      toast.error("Failed to create flashcards", { id: "fc-gen" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading document details...</span>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="space-y-6">
      {/* Back button & title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Documents</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-xl">
              {doc.name}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Hybrid Indexed
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>{doc.pageCount || 1} Pages</span>
            <span>•</span>
            <span>{doc.wordCount || 0} Words</span>
            <span>•</span>
            <span>{(doc.size / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        {/* Quick Study Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleStartChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>RAG Chat</span>
          </button>
          <button
            onClick={handleGenerateQuiz}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate Quiz</span>
          </button>
          <button
            onClick={handleGenerateFlashcards}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Flashcards</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-px">
        {[
          { id: "chunks", label: "Chunks & Hybrid Index", icon: ListFilter },
          { id: "summary", label: "AI Summaries", icon: BookOpen },
          { id: "concepts", label: "Key Concepts", icon: Brain },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === "concepts" && concepts.length === 0) {
                  handleLoadConcepts();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Chunks & Hybrid Index */}
      {activeTab === "chunks" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-foreground">Extracted Passages: </span>
              <span className="text-muted-foreground">
                Showing top parsed chunks with page citations ready for Dense Vector + BM25 retrieval.
              </span>
            </div>
            <span className="text-muted-foreground font-mono">{doc.chunks?.length || 0} Chunks</span>
          </div>

          <div className="space-y-3">
            {doc.chunks?.map((chunk: any) => (
              <div
                key={chunk.id}
                className="p-4 rounded-xl bg-card/40 border border-border space-y-2 hover:border-purple-500/20 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px]">
                      Chunk #{chunk.chunkIndex + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[11px]">
                      Page {chunk.pageNumber}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(chunk.content);
                      toast.success("Chunk copied to clipboard");
                    }}
                    className="p-1 hover:text-foreground text-muted-foreground transition"
                    title="Copy chunk text"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: AI Summaries */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card/40 border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Generate Academic Summary</h3>
                <p className="text-xs text-muted-foreground">
                  Select a summary mode and execute synthesis via LangChain.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(["short", "detailed", "bullet", "executive"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSummaryType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      summaryType === type
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {type}
                  </button>
                ))}

                <button
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSummarizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Summary Output Area */}
            {summaryContent ? (
              <div className="p-5 rounded-xl bg-secondary/30 border border-border/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-2">
                  <span className="font-semibold uppercase tracking-wider text-purple-400">
                    {summaryType} Summary
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(summaryContent);
                      toast.success("Summary copied");
                    }}
                    className="flex items-center gap-1 hover:text-foreground text-muted-foreground"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {summaryContent}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-muted-foreground">
                Choose a format and click "Generate" to create a structured summary.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Key Concepts */}
      {activeTab === "concepts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Core Theories & Terminology</h3>
            <button
              onClick={handleLoadConcepts}
              disabled={isLoadingConcepts}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {isLoadingConcepts ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>Re-extract concepts</span>
            </button>
          </div>

          {isLoadingConcepts ? (
            <div className="text-center py-12 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Extracting conceptual frameworks with LangChain...</span>
            </div>
          ) : concepts.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No concepts extracted yet. Click above to extract.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {concepts.map((concept) => (
                <div
                  key={concept.id}
                  className="p-4 rounded-xl bg-card/40 border border-border space-y-2 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground">{concept.concept}</h4>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        concept.importance === "core"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                          : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                      }`}
                    >
                      {concept.importance}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {concept.definition}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
