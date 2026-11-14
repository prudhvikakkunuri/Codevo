"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, FileCheck, Info } from "lucide-react";
import { getStoredSubmission } from "@/data/assessment";

interface AssessmentHeaderProps {
  challengeId: string;
  challengeTitle: string;
  submissionId: string;
  submittedAt: string;
}

const emptySubscribe = () => () => {};

export function AssessmentHeader({
  challengeId,
  challengeTitle,
  submissionId,
  submittedAt,
}: AssessmentHeaderProps) {
  const currentTimestamp = useSyncExternalStore(
    emptySubscribe,
    () => getStoredSubmission("ci-001-demo")?.submittedAt ?? submittedAt,
    () => submittedAt
  );

  const formattedDate = new Date(currentTimestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4 pb-6 border-b border-border/50">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <Link
          href="/app/history"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Interview History</span>
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-200">{submissionId}</span>
      </div>

      {/* Main Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded border border-border/80 bg-secondary/80 text-xs font-mono font-semibold text-zinc-300">
              {challengeId}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {challengeTitle}
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FileCheck className="size-3.5 text-zinc-500" />
              <span>Submission: <strong className="text-zinc-300">{submissionId}</strong></span>
            </span>
            <span className="text-zinc-700">|</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-zinc-500" />
              <span>{formattedDate}</span>
            </span>
          </p>
        </div>

        {/* Prominent Simulated Assessment Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-900/60 bg-amber-950/30 text-amber-300 font-mono text-xs font-semibold">
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span>DEMO ASSESSMENT (SIMULATED)</span>
          </span>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div className="p-3 bg-secondary/40 border border-border/60 rounded-lg flex items-start gap-2.5 text-xs font-mono text-zinc-400">
        <Info className="size-4 shrink-0 text-amber-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-200">Phase 1 Frontend Demonstration:</strong> All scorecard metrics, category weights, test summaries, and qualitative observations on this page are deterministic demo fixtures. Live evaluator execution and AI evaluation will be connected in Phase 6.
        </p>
      </div>
    </div>
  );
}
