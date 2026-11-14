import React from "react";
import { OFFICIAL_CHALLENGES } from "@/data/challenges";
import { ChallengeLibrary } from "@/components/application/challenges/challenge-library";

export default function ChallengesPage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Challenges
            </h1>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border/70 bg-secondary/60 text-zinc-300">
              {OFFICIAL_CHALLENGES.length} Available Challenges
            </span>
          </div>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Browse and inspect practical engineering interview challenges. Diagnose defects, implement production features, and verify solutions in authentic multi-file codebases under timed constraints.
          </p>
        </div>
      </div>

      {/* Interactive Challenge Library (Search, Filters, Cards, and Briefing Modal) */}
      <ChallengeLibrary />
    </div>
  );
}
