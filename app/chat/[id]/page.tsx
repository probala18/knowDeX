"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  Sparkles,
  BookOpen,
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Quote,
} from "lucide-react";
import { toast } from "sonner";

interface SourceItem {
  content: string;
  pageNumber: number;
  relevanceScore: number;
  retrievalType: string;
  denseScore?: number;
  sparseScore?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceItem[];
  createdAt: string;
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [expandedSourceMsgId, setExpandedSourceMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/chat/sessions/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Chat session not found");
        return res.json();
      })
      .then((data) => {
        setSession(data);
        setMessages(data.messages || []);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load session");
        router.push("/chat");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const query = input.trim();
    setInput("");

    // Optimistically append user message
    const tempUserMsg: Message = {
      id: "temp-" + Date.now(),
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/chat/sessions/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: query }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || "Failed to retrieve answer");
      }

      const botMsg = await res.json();
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      toast.error(err.message || "Failed to retrieve answer");
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: `Sorry, an error occurred while processing your query: ${err.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Loading discussion context...</span>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
        <div className="space-y-0.5">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Discussions</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground truncate max-w-md">
              {session.title}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              Dense + BM25 Hybrid
            </span>
          </div>
          <Link
            href={`/documents/${session.documentId}`}
            className="text-xs text-muted-foreground hover:text-primary transition flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{session.documentName || "View Source Document"}</span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-muted-foreground font-mono">
            RRF k=60
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-muted-foreground font-mono">
            OpenRouter Free Models
          </span>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-primary mx-auto">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Ready for your questions
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Ask anything about{" "}
              <span className="text-foreground font-medium">{session.documentName}</span>.
              Answers are cited directly with extracted page numbers and hybrid relevance scores.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const isExpanded = expandedSourceMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-3 ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10"
                      : "bg-card/50 border border-border rounded-tl-none text-foreground/95"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Sources citations drawer (Assistant only) */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSourceMsgId(isExpanded ? null : msg.id)
                          }
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>
                            {msg.sources.length} Hybrid Citation Source
                            {msg.sources.length > 1 ? "s" : ""}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <span className="text-[10px] text-muted-foreground font-mono">
                          Top Match: {(msg.sources[0].relevanceScore * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Expandable Sources Details */}
                      {isExpanded && (
                        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  Page {src.pageNumber}
                                </span>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  {src.denseScore !== undefined && (
                                    <span>Dense: {src.denseScore}</span>
                                  )}
                                  {src.sparseScore !== undefined && (
                                    <span>BM25: {src.sparseScore}</span>
                                  )}
                                  <span className="text-cyan-400 font-bold">
                                    {(src.relevanceScore * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground italic leading-relaxed">
                                "{src.content}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex items-center gap-3 text-muted-foreground text-xs py-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <span>
              Searching with Dense Vector + BM25 Hybrid Retrieval and generating response...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="shrink-0 pt-2">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask a question about this document (e.g. key findings, methodology, definitions)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            className="w-full pl-4 pr-12 py-3 rounded-2xl bg-card/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="absolute right-2 p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition shadow-sm"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
