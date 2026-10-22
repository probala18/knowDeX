"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Plus, ArrowRight, FileText, BookOpen } from "lucide-react";

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/flashcards")
      .then((res) => res.json())
      .then((data) => setDecks(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Flashcard Decks
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Active recall and spaced repetition flashcards extracted from your course materials.
          </p>
        </div>

        <Link
          href="/documents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Layers className="w-4 h-4" />
          <span>Generate New Deck</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Loading flashcard decks...
        </div>
      ) : decks.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-2xl bg-card/20 border border-border/80 space-y-3">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto text-emerald-400" />
          <h3 className="text-base font-semibold text-foreground">No Flashcard Decks Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Open any document from the Documents tab and click "Flashcards" to auto-generate a deck with LangChain!
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
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/flashcards/${deck.id}`}
              className="p-5 rounded-2xl bg-card/40 border border-border hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                  <Layers className="w-5 h-5" />
                </div>

                <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {deck.topic}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{deck.documentName || "Academic Document"}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{deck.cardCount || 8} Flashcards</span>
                <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Study Deck <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
