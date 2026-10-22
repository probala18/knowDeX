import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "knowDeX — AI Academic Assistant with LangChain Hybrid RAG",
  description: "Advanced Academic Research & Learning Platform built with Next.js, Bun, TypeScript, Tailwind CSS, and LangChain Hybrid Retrieval.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1 min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
        <Toaster position="top-right" richColors theme="dark" />
      </body>
    </html>
  );
}
