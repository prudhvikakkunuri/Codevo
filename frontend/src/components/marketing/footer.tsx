import React from "react";
import { Wordmark } from "@/components/common/wordmark";

export function Footer() {
  return (
    <footer className="border-t border-border bg-[#09090B] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-border/60">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Wordmark size="md" withTagline />
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              The practical technical interview platform. Enter unfamiliar codebases, debug defects, build features, and prove your engineering capability.
            </p>
          </div>

          {/* Platform Column */}
          <div className="space-y-3.5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold block">
              Platform
            </span>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>
                <a href="#preview" className="hover:text-foreground transition-colors">
                  Workspace IDE
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">
                  How it works
                </a>
              </li>
              <li>
                <a href="#challenges" className="hover:text-foreground transition-colors">
                  Challenges
                </a>
              </li>
              <li>
                <a href="#ai-modes" className="hover:text-foreground transition-colors">
                  AI Assistance (BYOK)
                </a>
              </li>
            </ul>
          </div>

          {/* Challenges Column */}
          <div className="space-y-3.5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold block">
              Challenges
            </span>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>
                <a href="#challenges" className="hover:text-foreground transition-colors">
                  FastAPI Auth (CI-001)
                </a>
              </li>
              <li>
                <a href="#challenges" className="hover:text-foreground transition-colors">
                  RAG Pipeline (CI-002)
                </a>
              </li>
              <li>
                <a href="#challenges" className="hover:text-foreground transition-colors">
                  React Integration (CI-003)
                </a>
              </li>
              <li>
                <a href="#challenges" className="hover:text-foreground transition-colors">
                  ETL Pipeline (CI-004)
                </a>
              </li>
              <li>
                <a href="#challenges" className="hover:text-foreground transition-colors">
                  ML Prediction (CI-005)
                </a>
              </li>
            </ul>
          </div>

          {/* Principles Column */}
          <div className="space-y-3.5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold block">
              Principles
            </span>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-zinc-200 font-medium">Deterministic Scoring</span>
              </li>
              <li>
                <span className="text-zinc-400">Server-Authoritative Timer</span>
              </li>
              <li>
                <span className="text-zinc-400">Isolated Sandboxing</span>
              </li>
              <li>
                <span className="text-zinc-400">Zero Inference Markup</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <span>&copy; {new Date().getFullYear()} Codevo. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Dark-First · Minimal · Monochrome</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
