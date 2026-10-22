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

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        isDragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-border/80 hover:border-border bg-card/30 hover:bg-card/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-primary shadow-inner">
          {isUploading ? (
            <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
          ) : (
            <UploadCloud className="w-7 h-7 text-cyan-400" />
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
                Drop your document here, or{" "}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-primary hover:underline font-medium"
                >
                  browse files
                </button>
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
