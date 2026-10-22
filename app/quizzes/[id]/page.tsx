"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Award, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/quizzes/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Quiz not found");
        return res.json();
      })
      .then((data) => setQuiz(data))
      .catch((err) => {
        toast.error(err.message || "Failed to load quiz");
        router.push("/quizzes");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        toast.success(`Quiz completed! You scored ${data.score}%`);
      } else {
        toast.error("Failed to submit quiz");
      }
    } catch {
      toast.error("Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading quiz questions...</span>
      </div>
    );
  }

  if (!quiz) return null;

  const questions: any[] = quiz.questions || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-2">
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Quizzes</span>
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {quiz.title}
          </h1>
          <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {quiz.difficulty || "Medium"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Document: {quiz.documentName || "Academic Study"}
        </p>
      </div>

      {/* Result score banner if submitted */}
      {result && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-card border border-emerald-500/30 space-y-2 text-center animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Your Score: {result.score}%
          </h2>
          <p className="text-xs text-muted-foreground">
            You answered {result.correct} out of {result.total} questions correctly.
          </p>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const qResult = result?.results?.find((r: any) => r.questionId === q.id);
          const hasSubmitted = !!result;

          return (
            <div
              key={q.id || idx}
              className={`p-6 rounded-2xl bg-card/40 border transition-all space-y-4 ${
                hasSubmitted
                  ? qResult?.isCorrect
                    ? "border-emerald-500/40 bg-emerald-950/10"
                    : "border-destructive/40 bg-destructive/10"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                  Question {idx + 1}
                </span>
                {hasSubmitted && (
                  <span
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      qResult?.isCorrect ? "text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {qResult?.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" /> Incorrect (Answer: {q.answer})
                      </>
                    )}
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                {q.question}
              </h3>

              {/* Options */}
              {q.options && q.options.length > 0 ? (
                <div className="space-y-2">
                  {q.options.map((opt: any) => {
                    const isSelected = answers[q.id] === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        disabled={hasSubmitted}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))
                        }
                        className={`w-full p-3 rounded-xl text-left text-xs sm:text-sm font-medium transition-all flex items-center gap-3 border ${
                          isSelected
                            ? "bg-primary/20 text-primary border-primary/40"
                            : "bg-secondary/40 text-foreground/90 border-border hover:bg-secondary/70"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  disabled={hasSubmitted}
                  placeholder="Type your answer here..."
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              )}

              {/* Explanation if submitted */}
              {hasSubmitted && q.explanation && (
                <div className="p-3 rounded-xl bg-secondary/60 text-xs text-muted-foreground border border-border/50">
                  <span className="font-semibold text-foreground">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
        {result ? (
          <button
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Quiz</span>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(answers).length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Submit Quiz for Grading</span>
          </button>
        )}
      </div>
    </div>
  );
}
