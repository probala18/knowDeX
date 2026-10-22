"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  ArrowRight,
  FileText,
  Calendar,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ChatSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Chat Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [sessRes, docsRes] = await Promise.all([
        fetch("/api/chat/sessions"),
        fetch("/api/documents"),
      ]);

      if (sessRes.ok) {
        const sData = await sessRes.json();
        setSessions(sData);
      }
      if (docsRes.ok) {
        const dData = await docsRes.json();
        setDocuments(dData);
        if (dData.length > 0) setSelectedDocId(dData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      toast.error("Please select a document");
      return;
    }

    setIsCreating(true);
    try {
      const selectedDoc = documents.find((d) => d.id === selectedDocId);
      const title = sessionTitle.trim() || `Chat: ${selectedDoc?.name || "Study Session"}`;

      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDocId, title }),
      });

      if (res.ok) {
        const newSession = await res.json();
        toast.success("Chat session started!");
        router.push(`/chat/${newSession.id}`);
      } else {
        toast.error("Failed to create chat session");
      }
    } catch {
      toast.error("Failed to create chat session");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Chat session deleted");
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      toast.error("Failed to delete session");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              RAG Chat Sessions
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              LangChain Hybrid RAG
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Engage in deep question-answering with your documents backed by Dense Vector + BM25 citation sources.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          <span>New RAG Discussion</span>
        </button>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Loading chat sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-card/20 border border-border/80 space-y-4">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No Chat Sessions Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start a discussion with any uploaded document to ask complex academic questions with page citations.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Start First Discussion</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/chat/${session.id}`}
              className="p-5 rounded-2xl bg-card/40 border border-border hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    title="Delete session"
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {session.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{session.documentName || "Academic Document"}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-[11px] font-mono">
                  {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform font-medium">
                  Open Chat <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Start New RAG Discussion</h3>
              <p className="text-xs text-muted-foreground">
                Select an indexed document to question using LangChain Hybrid Retrieval.
              </p>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Document</label>
                {documents.length === 0 ? (
                  <div className="p-3 rounded-xl bg-secondary/50 text-xs text-amber-400 border border-amber-500/30">
                    No documents uploaded yet. Please upload a document first!
                  </div>
                ) : (
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.pageCount || 1} pages)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Discussion Topic (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 Analysis, Exam Prep, Methodology..."
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || documents.length === 0}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Create Discussion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
