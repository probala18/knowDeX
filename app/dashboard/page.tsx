"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
  Upload,
  Cpu,
  Database,
  Search,
  BookOpen,
  Calendar,
  Clock,
} from "lucide-react";
import { DocumentUploader } from "@/components/document-uploader";
import { getCachedData, setCachedData } from "@/lib/cache";

export default function DashboardPage() {
  const cached = typeof window !== "undefined" ? getCachedData<any>("/api/dashboard") : null;
  const [data, setData] = useState<{
    stats: { documents: number; chats: number; quizzes: number; flashcardDecks: number };
    recentDocuments: any[];
    recentChats: any[];
  }>(() => cached || {
    stats: { documents: 0, chats: 0, quizzes: 0, flashcardDecks: 0 },
    recentDocuments: [],
    recentChats: [],
  });

  const [isLoading, setIsLoading] = useState(!cached);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setCachedData("/api/dashboard", json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-card border border-purple-500/20 p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-300">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Academic Assistant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to <span className="text-gradient">knowDeX</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Upload textbooks, research papers, and lecture slides. Ask deep questions powered by{" "}
            <span className="text-foreground font-semibold">LangChain Hybrid Retrieval</span> (Dense Vector + BM25 Sparse Search), generate quizzes, and master concepts.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Documents",
            value: data.stats.documents,
            icon: FileText,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            href: "/documents",
          },
          {
            title: "RAG Chats",
            value: data.stats.chats,
            icon: MessageSquare,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
            href: "/chat",
          },
          {
            title: "Quizzes",
            value: data.stats.quizzes,
            icon: Sparkles,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            href: "/quizzes",
          },
          {
            title: "Flashcard Decks",
            value: data.stats.flashcardDecks,
            icon: Layers,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            href: "/flashcards",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              href={stat.href}
              className={`p-5 rounded-2xl glass-card transition-all hover:scale-[1.02] border ${stat.border} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Hybrid Retrieval Architecture Explainer */}
      <div className="p-6 rounded-2xl bg-card/40 border border-border/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-foreground">
              Hybrid Retrieval Architecture (LangChain RAG)
            </h3>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-full">
            Active in knowDeX
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-1.5">
            <div className="font-semibold text-purple-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              1. Dense Vector Search
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Generates embeddings to calculate cosine similarity across chunk vectors for deep semantic and thematic alignment.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-1.5">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              2. Sparse BM25 Search
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Tokenizes document text and runs Okapi BM25 scoring for exact keyword, acronym, equation, and academic terminology precision.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              3. Reciprocal Rank Fusion
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Fuses dense and sparse rankings using RRF to prioritize chunks with maximum conceptual and lexical relevance.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Upload Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Upload Study Materials</h2>
          <span className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD supported</span>
        </div>
        <DocumentUploader onUploaded={() => fetchDashboard()} />
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="p-6 rounded-2xl bg-card/30 border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Recent Documents
            </h3>
            <Link href="/documents" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>

          {data.recentDocuments.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No documents uploaded yet. Upload a document above to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{doc.pageCount || 1} pages</span>
                      <span>•</span>
                      <span>{(doc.size / 1024).toFixed(1)} KB</span>
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Chats */}
        <div className="p-6 rounded-2xl bg-card/30 border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Recent RAG Chats
            </h3>
            <Link href="/chat" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>

          {data.recentChats.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No chat discussions initiated yet. Click "RAG Chat" in the sidebar to ask questions!
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-purple-400 transition-colors">
                      {chat.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {chat.documentName || "Academic Study"}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
