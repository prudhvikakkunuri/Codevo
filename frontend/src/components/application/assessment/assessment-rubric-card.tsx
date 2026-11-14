"use client";

import React from "react";
import { type RubricCategoryScore } from "@/data/assessment";
import { CheckCircle2, AlertCircle, Lightbulb, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentRubricCardProps {
  categories: RubricCategoryScore[];
}

export function AssessmentRubricCard({ categories }: AssessmentRubricCardProps) {
  return (
    <div className="space-y-4 font-mono select-none">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">
          Evaluation Rubric Breakdown
        </h3>
        <span className="text-[10px] text-zinc-500">
          Illustrative Weights totaling 100%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const isStrong = cat.status === "strong";
          const isAdequate = cat.status === "adequate";

          return (
            <div
              key={cat.id}
              className="rounded-xl border border-border/70 bg-[#101014] p-5 space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      Weight: {cat.weightPercentage}% · +{cat.weightedContribution.toFixed(1)} pts
                    </span>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      {cat.name}
                    </h4>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0",
                      isStrong
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-900/50"
                        : isAdequate
                        ? "bg-blue-950/60 text-blue-300 border border-blue-900/50"
                        : "bg-amber-950/60 text-amber-300 border border-amber-900/50"
                    )}
                  >
                    {isStrong ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <AlertCircle className="size-2.5" />
                    )}
                    <span>{cat.scorePercentage}%</span>
                  </span>
                </div>

                {/* Explanation */}
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  {cat.explanation}
                </p>

                {/* Supporting Demo Evidence Box */}
                <div className="p-2.5 bg-zinc-950 border border-border/60 rounded-md text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                    <Code2 className="size-3 text-zinc-500" />
                    <span>Demonstration Evidence (Illustrative):</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {cat.supportingEvidence}
                  </p>
                </div>
              </div>

              {/* Recommendation Strip */}
              <div className="pt-2 border-t border-border/40 text-[11px] flex items-start gap-1.5 text-zinc-400">
                <Lightbulb className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-zinc-300">Tip:</strong> {cat.actionableRecommendation}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

