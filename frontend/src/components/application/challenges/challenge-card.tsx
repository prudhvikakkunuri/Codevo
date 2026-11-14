"use client";

import React from "react";
import { type Challenge } from "@/data/challenges";
import { Timer, Layers, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeCardProps {
  challenge: Challenge;
  onViewDetails: (challenge: Challenge) => void;
  className?: string;
}

export function ChallengeCard({ challenge, onViewDetails, className }: ChallengeCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border border-border/60 bg-card/25 p-5 transition-all hover:border-border hover:bg-card/40 space-y-4",
        className
      )}
    >
      <div className="space-y-3">
        {/* Top Header: ID, Category & Difficulty */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] font-semibold text-zinc-300 bg-secondary/80 border border-border/70 px-1.5 py-0.5 rounded">
              {challenge.id}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 truncate">
              {challenge.category}
            </span>
          </div>

          <span
            className={cn(
              "font-mono text-[10px] px-1.5 py-0.5 rounded border shrink-0",
              challenge.difficulty === "Hard"
                ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                : "border-border/80 bg-secondary/60 text-zinc-300"
            )}
          >
            {challenge.difficulty}
          </span>
        </div>

        {/* Title & Short Description */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground tracking-tight leading-snug">
            {challenge.title}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Footer: Metadata & View Details Action */}
      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-3 text-zinc-400 min-w-0">
          <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
            <Timer className="size-3 text-zinc-400" />
            <span>{challenge.duration}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500 truncate">
            <Layers className="size-3 shrink-0" />
            <span className="truncate">{challenge.stack}</span>
          </div>
        </div>

        <button
          onClick={() => onViewDetails(challenge)}
          aria-label={`View details and briefing for ${challenge.title}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-border/80 bg-secondary/60 hover:bg-white/[0.08] hover:text-foreground text-zinc-300 transition-colors shrink-0"
        >
          <FileText className="size-3 text-zinc-400" />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
}

