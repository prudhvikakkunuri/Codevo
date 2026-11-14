"use client";

import React from "react";
import { ALL_CATEGORIES, ALL_DIFFICULTIES } from "@/data/challenges";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeFiltersProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedDifficulty: string;
  onSelectDifficulty: (difficulty: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  className?: string;
}

export function ChallengeFilters({
  selectedCategory,
  onSelectCategory,
  selectedDifficulty,
  onSelectDifficulty,
  hasActiveFilters,
  onResetFilters,
  className,
}: ChallengeFiltersProps) {
  return (
    <div className={cn("space-y-3.5", className)}>
      {/* 1. Category Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 shrink-0 w-20">
          Category:
        </span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
          {ALL_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                aria-pressed={isActive}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                  isActive
                    ? "bg-white/[0.08] text-foreground border-zinc-600 font-semibold"
                    : "bg-card/25 text-zinc-400 border-border/60 hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Difficulty Filter Pills & Reset Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 shrink-0 w-20">
            Difficulty:
          </span>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by difficulty">
            {ALL_DIFFICULTIES.map((diff) => {
              const isActive = selectedDifficulty === diff;
              return (
                <button
                  key={diff}
                  onClick={() => onSelectDifficulty(diff)}
                  aria-pressed={isActive}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                    isActive
                      ? "bg-white/[0.08] text-foreground border-zinc-600 font-semibold"
                      : "bg-card/25 text-zinc-400 border-border/60 hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset Action */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            aria-label="Reset all search and filter options"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-foreground transition-colors self-start sm:self-auto py-1"
          >
            <RotateCcw className="size-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
    </div>
  );
}

