"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Trash2,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
  Upload,
  BookOpen,
  Calendar,
  Layers as LayersIcon,
  Search,
} from "lucide-react";
import { DocumentUploader } from "@/components/document-uploader";
import { Button } from "@/components/ui-button";
import { toast } from "sonner";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const json = await res.json();
        setDocuments(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Document deleted");
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        toast.error("Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleStartChat = async (docId: string, docName: string) => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, title: `Chat: ${docName}` }),
      });
      if (res.ok) {
        const session = await res.json();
        window.location.href = `/chat/${session.id}`;
      } else {
        toast.error("Failed to start chat session");
      }
    } catch {
      toast.error("Failed to start chat session");
    }
  };

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Academic Documents
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your uploaded textbooks, papers, and notes indexed with Hybrid Retrieval.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <DocumentUploader onUploaded={() => fetchDocuments()} />

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card/40 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Documents Grid / Table */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Loading documents...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-card/20 border border-border/80 space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-semibold text-foreground">No documents found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Upload your first document above to explore chunking, summaries, quizzes, and RAG chat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-card/40 border border-border hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {doc.status || "Ready"}
                  </span>
                </div>

                <div>
                  <Link href={`/documents/${doc.id}`}>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {doc.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {doc.summary || "Document indexed for semantic search and keyword retrieval."}
                  </p>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{doc.pageCount || 1} pages</span>
                  <span>{doc.wordCount || 0} words</span>
                  <span>{(doc.size / 1024).toFixed(1)} KB</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleStartChat(doc.id, doc.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium border border-primary/20 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>RAG Chat</span>
                  </button>

                  <Link
                    href={`/documents/${doc.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Study</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    title="Delete document"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
