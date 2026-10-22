"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  XCircle,
  Award,
  Loader2,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export default function FlashcardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [deck, setDeck] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [reviewCards, setReviewCards] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/flashcards/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Deck not found");
        return res.json();
      })
      .then((data) => setDeck(data))
      .catch((err) => {
        toast.error(err.message || "Failed to load deck");
        router.push("/flashcards");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading flashcards...</span>
      </div>
    );
  }

  if (!deck) return null;

  const cards: any[] = deck.cards || [];
  const currentCard = cards[currentIndex];
  const total = cards.length;
  const isFinished = knownCards.size + reviewCards.size === total && total > 0;

  const handleMark = (known: boolean) => {
    setIsFlipped(false);
    if (known) {
      setKnownCards((prev) => new Set(prev).add(currentIndex));
      setReviewCards((prev) => {
        const next = new Set(prev);
        next.delete(currentIndex);
        return next;
      });
    } else {
      setReviewCards((prev) => new Set(prev).add(currentIndex));
      setKnownCards((prev) => {
        const next = new Set(prev);
        next.delete(currentIndex);
        return next;
      });
    }

    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setReviewCards(new Set());
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Flashcard Decks</span>
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-lg">
            {deck.topic}
          </h1>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
            {currentIndex + 1} of {total}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Document: {deck.documentName || "Academic Study"}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((knownCards.size + reviewCards.size) / (total || 1)) * 100}%` }}
        />
      </div>

      {isFinished ? (
        <div className="p-8 rounded-2xl bg-card/40 border border-emerald-500/30 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">Session Completed!</h2>
            <p className="text-xs text-muted-foreground">
              Mastered {knownCards.size} cards • Needs Review: {reviewCards.size} cards
            </p>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Study Again</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3D Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer select-none perspective-[1000px]"
          >
            <div
              className={`min-h-[280px] sm:min-h-[320px] rounded-3xl p-8 flex flex-col justify-between text-center border transition-all duration-300 relative ${
                isFlipped
                  ? "bg-secondary/60 border-purple-500/40 text-foreground"
                  : "bg-card/60 border-border/80 text-foreground hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono uppercase font-bold tracking-wider text-[11px] text-cyan-400">
                  {isFlipped ? "Answer / Explanation" : "Question / Concept"}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <RotateCw className="w-3 h-3" /> Click to flip
                </span>
              </div>

              <div className="my-auto py-6">
                <p className="text-base sm:text-lg font-medium leading-relaxed">
                  {isFlipped ? currentCard?.answer : currentCard?.question}
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono">
                Card #{currentIndex + 1}
              </div>
            </div>
          </div>

          {/* Feedback buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex((p) => p - 1);
                  setIsFlipped(false);
                }
              }}
              disabled={currentIndex === 0}
              className="p-3 rounded-xl bg-secondary/60 border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 flex-1 justify-center max-w-sm">
              <button
                onClick={() => handleMark(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/25 hover:bg-destructive/25 transition"
              >
                <XCircle className="w-4 h-4" />
                <span>Need Review</span>
              </button>

              <button
                onClick={() => handleMark(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Got It!</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (currentIndex < total - 1) {
                  setCurrentIndex((p) => p + 1);
                  setIsFlipped(false);
                }
              }}
              disabled={currentIndex >= total - 1}
              className="p-3 rounded-xl bg-secondary/60 border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
