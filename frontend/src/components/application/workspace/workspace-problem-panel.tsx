"use client";

import React from "react";
import { OFFICIAL_CHALLENGES } from "@/data/challenges";
import { BookOpen, X, Timer, Code2, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceProblemPanelProps {
  challengeId?: string;
  onClose?: () => void;
  className?: string;
}

export function WorkspaceProblemPanel({
  challengeId = "CI-001",
  onClose,
  className,
}: WorkspaceProblemPanelProps) {
  // Use OFFICIAL_CHALLENGES as the single source of truth
  const challenge =
    OFFICIAL_CHALLENGES.find((c) => c.id === challengeId) || OFFICIAL_CHALLENGES[0];

  return (
    <div
      className={cn(
        "w-80 lg:w-96 h-full flex flex-col bg-[#09090B] border-l border-border/50 select-none overflow-hidden shrink-0",
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between h-8 px-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 text-zinc-400" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            Problem Briefing
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Collapse problem panel"
            className="size-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Title & Badges */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold text-zinc-300 bg-secondary/80 border border-border/70 px-1.5 py-0.5 rounded">
              {challenge.id}
            </span>
            <span
              className={cn(
                "font-mono text-[10px] px-1.5 py-0.5 rounded border",
                challenge.difficulty === "Hard"
                  ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                  : "border-border/80 bg-secondary/60 text-zinc-300"
              )}
            >
              {challenge.difficulty}
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              {challenge.category}
            </span>
          </div>

          <h2 className="text-sm font-bold tracking-tight text-foreground leading-snug">
            {challenge.title}
          </h2>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-border/50 bg-secondary/20 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Timer className="size-3 text-zinc-500" />
            <span>{challenge.duration}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Code2 className="size-3 text-zinc-500" />
            <span>{challenge.supportedLanguages[0]}</span>
          </div>
        </div>

        {/* Problem Summary */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            Problem Summary
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {challenge.problemSummary}
          </p>
        </div>

        {/* Key Requirements */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            Key Requirements
          </span>
          <ul className="space-y-1.5 text-xs text-zinc-400">
            {challenge.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="size-3 text-zinc-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Engineering Focus */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            Engineering Competency Focus
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {challenge.engineeringFocus}
          </p>
        </div>

        {/* Automated Tests Note */}
        <div className="rounded-md border border-border/50 bg-secondary/20 p-3 flex items-start gap-2 text-[11px] text-zinc-500">
          <ShieldAlert className="size-3.5 text-zinc-400 shrink-0 mt-0.5" />
          <span>
            Run tests using the terminal command <code className="text-zinc-300">pytest</code>. Public tests are visible in <code className="text-zinc-300">tests/</code>; hidden evaluation tests execute upon submission.
          </span>
        </div>
      </div>
    </div>
  );
}
