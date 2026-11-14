import React from "react";
import Link from "next/link";
import { type Challenge } from "@/data/challenges";
import { Timer, ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardChallengeCardProps {
  challenge: Challenge;
  className?: string;
}

export function DashboardChallengeCard({ challenge, className }: DashboardChallengeCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border border-border/60 bg-card/25 p-4 sm:p-5 transition-all hover:border-border hover:bg-card/40 space-y-4",
        className
      )}
    >
      <div className="space-y-2.5">
        {/* Top Badges: ID, Category & Difficulty */}
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

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {challenge.title}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Footer Metadata & CTA */}
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

        <Link
          href="/app/challenges"
          className="text-xs font-mono text-zinc-300 hover:text-foreground inline-flex items-center gap-1 shrink-0 transition-colors"
        >
          <span>Explore</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

