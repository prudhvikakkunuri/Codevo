"use client";

import React, { useEffect, useRef } from "react";
import { type Challenge } from "@/data/challenges";
import {
  X,
  Timer,
  Layers,
  Code2,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeDetailsDialogProps {
  challenge: Challenge | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChallengeDetailsDialog({
  challenge,
  isOpen,
  onClose,
}: ChallengeDetailsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !challenge) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border/80 bg-[#0E0E11] shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border/50">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-zinc-300 bg-secondary/80 border border-border/70 px-2 py-0.5 rounded">
                {challenge.id}
              </span>
              <span className="font-mono text-xs text-zinc-400">
                {challenge.category}
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
            </div>

            <h2
              id="briefing-dialog-title"
              className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug"
            >
              {challenge.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close challenge briefing"
            className="size-8 rounded-md hover:bg-white/[0.06] text-zinc-400 hover:text-foreground flex items-center justify-center transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm">
          {/* Metadata Grid Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg border border-border/50 bg-secondary/30">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Duration</span>
              <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300">
                <Timer className="size-3.5 text-zinc-400" />
                <span>{challenge.duration}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Languages</span>
              <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300">
                <Code2 className="size-3.5 text-zinc-400" />
                <span>{challenge.supportedLanguages.join(", ")}</span>
              </div>
            </div>

            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Stack</span>
              <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300 truncate">
                <Layers className="size-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{challenge.stack}</span>
              </div>
            </div>
          </div>

          {/* Section: Problem Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Cpu className="size-3.5 text-zinc-400" />
              <span>Problem Summary</span>
            </h3>
            <p className="text-zinc-400 leading-relaxed text-xs sm:text-sm">
              {challenge.problemSummary}
            </p>
          </div>

          {/* Section: Key Requirements */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-zinc-400" />
              <span>Key Assessment Requirements</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-zinc-400">
              {challenge.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <span className="size-1.5 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section: Expected Engineering Focus */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Layers className="size-3.5 text-zinc-400" />
              <span>Engineering Competency Focus</span>
            </h3>
            <p className="text-zinc-400 leading-relaxed text-xs sm:text-sm">
              {challenge.engineeringFocus}
            </p>
          </div>

          {/* Security & Verification Notice */}
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3.5 flex items-start gap-3">
            <ShieldAlert className="size-4 text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Automated public unit tests verify core functionality, while separate server-side hidden test fixtures validate robustness against regressions and edge cases upon submission.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0A0A0C]">
          <span className="text-[11px] font-mono text-zinc-500 text-center sm:text-left">
            Interactive IDE Workspace: Milestone 1.6
          </span>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-border/80 text-zinc-300 hover:text-foreground hover:bg-white/[0.04] transition-colors"
            >
              Close Briefing
            </button>
            <button
              disabled
              title="Session workspace provisioning will be available in Phase 1, Milestone 1.7"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed"
            >
              <PlayCircle className="size-3.5" />
              <span>Start Interview (Milestone 1.7)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

