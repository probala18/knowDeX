"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploaderProps {
  onUploaded?: (doc: any) => void;
}

export function DocumentUploader({ onUploaded }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed = [".pdf", ".docx", ".txt", ".md"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error(`Unsupported file type. Please upload a PDF, DOCX, TXT, or Markdown document.`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress("Parsing document & generating hybrid indices...");

      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("aa_token") : null;

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || "Failed to upload document");
      }

      const doc = await res.json();
      toast.success(`Successfully uploaded "${doc.name}" with ${doc.pageCount || 1} pages!`);
      if (onUploaded) onUploaded(doc);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = "copy";
    } catch {}
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (!isUploading) {
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isUploading) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isDragging
          ? "border-primary bg-primary/15 scale-[1.02] shadow-lg shadow-primary/10 ring-2 ring-primary/40"
          : "border-border/80 hover:border-primary/50 bg-card/30 hover:bg-card/60"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
            isDragging
              ? "scale-110 bg-primary/20 border-primary text-primary"
              : "bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-primary shadow-inner"
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
          ) : (
            <UploadCloud className={`w-7 h-7 ${isDragging ? "text-primary animate-bounce" : "text-cyan-400"}`} />
          )}
        </div>

        {isUploading ? (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Processing Academic Document</h4>
            <p className="text-xs text-muted-foreground">{uploadProgress}</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                {isDragging ? (
                  <span className="text-primary font-bold">Release to upload this document</span>
                ) : (
                  <>
                    Drop your document here, or{" "}
                    <span className="text-primary hover:underline font-medium">browse files</span>
                  </>
                )}
              </h4>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOCX, TXT, and Markdown files up to 50MB
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/80 font-mono">
              <span className="px-2 py-0.5 rounded bg-secondary/80 border border-border">PDF</span>
              <span className="px-2 py-0.5 rounded bg-secondary/80 border border-border">DOCX</span>
              <span className="px-2 py-0.5 rounded bg-secondary/80 border border-border">TXT</span>
              <span className="px-2 py-0.5 rounded bg-secondary/80 border border-border">MD</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
