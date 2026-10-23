"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Plus, ArrowRight, FileText, CheckCircle2, Award } from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/cache";

export default function QuizzesPage() {
  const cached = typeof window !== "undefined" ? getCachedData<any[]>("/api/quizzes") : null;
  const [quizzes, setQuizzes] = useState<any[]>(() => cached || []);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    fetch("/api/quizzes")
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setQuizzes(arr);
        setCachedData("/api/quizzes", arr);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Academic Quizzes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Test your comprehension with auto-generated multiple-choice and conceptual quizzes.
          </p>
        </div>

        <Link
          href="/documents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate New Quiz</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Loading quizzes...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-card/20 border border-border/80 space-y-3">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto text-amber-400" />
          <h3 className="text-base font-semibold text-foreground">No Quizzes Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Open any document from the Documents tab and click "Generate Quiz" to test your knowledge!
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition mt-2"
          >
            <span>View Documents</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/quizzes/${quiz.id}`}
              className="p-5 rounded-2xl bg-card/40 border border-border hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {quiz.difficulty || "Medium"}
                  </span>
                  {quiz.score !== null && quiz.score !== undefined && (
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {quiz.score}%
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-foreground group-hover:text-amber-400 transition-colors line-clamp-1">
                  {quiz.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{quiz.documentName || "Academic Document"}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{quiz.questionCount || 5} Questions</span>
                <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Take Quiz <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
