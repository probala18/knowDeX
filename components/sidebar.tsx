"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  Cpu,
  Database,
  ArrowRight
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "RAG Chat", icon: MessageSquare, badge: "Hybrid" },
  { href: "/quizzes", label: "Quizzes", icon: Sparkles },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-64 border-r border-border/60 bg-card/40 backdrop-blur-xl flex flex-col justify-between hidden md:flex shrink-0 min-h-screen">
      <div className="p-4 space-y-6">
        {/* Brand */}
        <Link href="/dashboard" prefetch={true} className="flex items-center gap-3 px-2 py-1 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
              knowDeX
            </span>
            <span className="block text-[10px] font-medium text-cyan-400 tracking-wider uppercase">
              Next.js • Bun • LangChain
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            Workspace
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => router.prefetch(item.href)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/25 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Retrieval Engine Info Card */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/80 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Database className="w-4 h-4 text-purple-400" />
            <span>Hybrid Retrieval</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Combines Dense Vector Semantic Search + Sparse BM25 Keyword Search with Reciprocal Rank Fusion.
          </p>
          <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-cyan-400">
            <span>Dense + Sparse</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">RRF Fusion</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Bun Runtime 1.3.14</span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
}
