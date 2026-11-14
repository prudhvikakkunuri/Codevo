"use client";

import React from "react";
import { type AssessmentReport } from "@/data/assessment";
import { CheckCircle2, Clock, FileCode, Layers } from "lucide-react";

interface AssessmentScoreCardProps {
  report: AssessmentReport;
}

export function AssessmentScoreCard({ report }: AssessmentScoreCardProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-[#101014] p-6 space-y-6 font-mono select-none">
      {/* Top Strip: Score & Rating */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/50">
        {/* Score Display */}
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-xl bg-zinc-900 border border-border flex flex-col items-center justify-center shrink-0">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {report.overallScore}
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
              / 100
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-900/60 bg-emerald-950/40 text-xs text-emerald-300 font-semibold">
                <CheckCircle2 className="size-3 text-emerald-400" />
                <span>{report.performanceRating}</span>
              </span>
              <span className="text-xs text-zinc-500">· Demonstration Assessment</span>
            </div>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-xl">
              {report.ratingDescription}
            </p>
          </div>
        </div>

        {/* Session Stats Grid */}
        <div className="flex items-center gap-4 text-xs shrink-0 bg-zinc-950/60 border border-border/60 p-3 rounded-lg">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
              <Clock className="size-3 text-zinc-400" />
              <span>Time Spent</span>
            </span>
            <div className="font-semibold text-zinc-200">
              {report.completedDurationMinutes} min / 40 min
            </div>
          </div>

          <div className="h-7 w-px bg-border/60" />

          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
              <FileCode className="size-3 text-zinc-400" />
              <span>Files Edited</span>
            </span>
            <div className="font-semibold text-emerald-400">
              {report.workspaceSnapshotSummary.modifiedFilesCount} files
            </div>
          </div>
        </div>
      </div>

      {/* Mathematical Verification Breakdown (Refinement 2) */}
      <div className="p-3 bg-zinc-950/40 border border-border/50 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
            <Layers className="size-3.5 text-zinc-400" />
            <span>Weighted Rubric Calculation (Totaling 100%):</span>
          </span>
          <span className="text-[10px] text-zinc-500">
            Math: 30.0 + 20.0 + 16.0 + 12.0 = <strong>78.0 pts</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          {report.rubricCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-2 rounded bg-zinc-900/60 border border-border/40 space-y-1"
            >
              <div className="text-[10px] text-zinc-500 truncate">{cat.name}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-zinc-200 font-semibold">{cat.scorePercentage}%</span>
                <span className="text-[10px] text-zinc-400">
                  +{cat.weightedContribution.toFixed(1)} pts
                </span>
              </div>
              <div className="text-[9px] text-zinc-600">Weight: {cat.weightPercentage}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

