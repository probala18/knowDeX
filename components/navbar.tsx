"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./ui-button";
import { Cpu, Upload, LogOut, User as UserIcon, BookOpen } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("knowdex_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("aa_token");
    localStorage.removeItem("knowdex_user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <header className="h-16 border-b border-border/60 bg-card/20 backdrop-blur-lg flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Mobile brand & title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex md:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">knowDeX</span>
        </Link>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Next.js 15
          </span>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            LangChain RAG
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Hybrid Retrieval
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-border/60">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-medium text-foreground">{user.name}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-secondary"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition border border-border"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
