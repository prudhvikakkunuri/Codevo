import React from "react";
import Link from "next/link";
import { OFFICIAL_CHALLENGES } from "@/data/challenges";
import { DashboardChallengeCard } from "./dashboard-challenge-card";
import { Code2, ArrowRight } from "lucide-react";

export function AvailableChallenges() {
  return (
    <section className="space-y-3.5" aria-labelledby="available-challenges-heading">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="space-y-0.5">
          <h2
            id="available-challenges-heading"
            className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2"
          >
            <Code2 className="size-3.5 text-zinc-300" />
            Available Challenges
          </h2>
          <p className="text-xs text-zinc-400">
            Practical Engineering Interview Challenges from authentic codebases.
          </p>
        </div>

        <Link
          href="/app/challenges"
          className="text-xs font-mono text-zinc-400 hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <span>View all ({OFFICIAL_CHALLENGES.length})</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {OFFICIAL_CHALLENGES.map((challenge) => (
          <DashboardChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>
    </section>
  );
}

