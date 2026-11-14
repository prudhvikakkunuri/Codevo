"use client";

import React from "react";
import {
  type FeedbackItem,
  type ActionableRecommendation,
} from "@/data/assessment";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

interface AssessmentFeedbackPanelProps {
  strengths: FeedbackItem[];
  improvementAreas: FeedbackItem[];
  recommendations: ActionableRecommendation[];
}

export function AssessmentFeedbackPanel({
  strengths,
  improvementAreas,
  recommendations,
}: AssessmentFeedbackPanelProps) {
  return (
    <div className="space-y-6 font-mono select-none">
      {/* 1. Strengths & Improvement Areas 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths Column */}
        <div className="rounded-xl border border-border/70 bg-[#101014] p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50 text-emerald-400">
            <CheckCircle2 className="size-4" />
            <h3 className="text-sm font-semibold text-foreground">
              Demonstrated Strengths
            </h3>
          </div>

          <div className="space-y-4">
            {strengths.map((item) => (
              <div key={item.id} className="space-y-1.5 text-xs">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-emerald-400" />
                  <span>{item.title}</span>
                </div>
                <p className="text-zinc-400 font-sans leading-relaxed text-xs pl-2.5">
                  {item.description}
                </p>
                <div className="ml-2.5 p-2 bg-zinc-950 border border-border/50 rounded text-[11px] text-zinc-400">
                  <strong className="text-zinc-300">Illustrative Evidence:</strong> {item.demonstratedEvidence}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Improvement Areas Column */}
        <div className="rounded-xl border border-border/70 bg-[#101014] p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50 text-amber-400">
            <AlertTriangle className="size-4" />
            <h3 className="text-sm font-semibold text-foreground">
              Areas for Improvement
            </h3>
          </div>

          <div className="space-y-4">
            {improvementAreas.map((item) => (
              <div key={item.id} className="space-y-1.5 text-xs">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-amber-400" />
                  <span>{item.title}</span>
                </div>
                <p className="text-zinc-400 font-sans leading-relaxed text-xs pl-2.5">
                  {item.description}
                </p>
                <div className="ml-2.5 p-2 bg-zinc-950 border border-border/50 rounded text-[11px] text-zinc-400">
                  <strong className="text-zinc-300">Illustrative Evidence:</strong> {item.demonstratedEvidence}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Actionable Next Steps (Prioritized Recommendations) */}
      <div className="rounded-xl border border-border/70 bg-[#101014] p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50 text-zinc-300">
          <Lightbulb className="size-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">
            Prioritized Actionable Next Steps
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-3.5 rounded-lg bg-zinc-950/60 border border-border/60 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`px-1.5 py-0.2 rounded font-semibold uppercase ${
                      rec.priority === "High"
                        ? "bg-red-950/80 text-red-300 border border-red-900/60"
                        : rec.priority === "Medium"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-900/60"
                        : "bg-blue-950/80 text-blue-300 border border-blue-900/60"
                    }`}
                  >
                    {rec.priority} Priority
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-200 pt-1 leading-snug">
                  {rec.recommendation}
                </h4>
              </div>

              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1 border-t border-border/30">
                {rec.rationale}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

