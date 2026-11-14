"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { DEMO_INTERVIEW_HISTORY, type InterviewHistoryRecord } from "@/data/dashboard";
import { getStoredSubmission } from "@/data/assessment";
import {
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CheckSquare,
} from "lucide-react";

const emptySubscribe = () => () => {};

export default function HistoryPage() {
  const storedTimestamp = useSyncExternalStore(
    emptySubscribe,
    () => getStoredSubmission("ci-001-demo")?.submittedAt ?? null,
    () => null
  );

  const historyItems: InterviewHistoryRecord[] = useMemo(() => {
    if (storedTimestamp) {
      return [
        {
          ...DEMO_INTERVIEW_HISTORY[0],
          completedAt: storedTimestamp,
        },
      ];
    }
    return DEMO_INTERVIEW_HISTORY;
  }, [storedTimestamp]);

  return (
    <div className="space-y-8 pb-16 font-mono select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Interview History
            </h1>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border/70 bg-secondary/60 text-zinc-400">
              Evaluated Sessions
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed font-sans">
            Review completed challenge submissions, automated test verification snapshots, and evidence-based scorecards.
          </p>
        </div>
      </div>

      {/* History Records List */}
      <div className="space-y-3">
        {historyItems.map((record) => {
          const formattedDate = new Date(record.completedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              key={record.id}
              className="p-5 rounded-xl border border-border/70 bg-[#101014] hover:border-zinc-700 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Challenge Info */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded border border-border/80 bg-secondary/80 text-[10px] font-semibold text-zinc-300">
                      {record.challengeId}
                    </span>
                    <span className="text-xs text-zinc-500">· {record.category}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded border border-border/60 bg-zinc-900 text-zinc-400">
                      {record.difficulty}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {record.challengeTitle}
                  </h3>
                </div>

                {/* Score & Evaluation Pill */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right space-y-0.5">
                    <div className="text-lg font-bold text-foreground">
                      {record.scorePercentage}%
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="size-2.5" />
                      <span>Evaluated</span>
                    </span>
                  </div>

                  <Link
                    href={`/app/results/${record.submissionId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background hover:bg-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>View Report</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>

              {/* Sub-strip Details */}
              <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Calendar className="size-3" />
                    <span>{formattedDate}</span>
                  </span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Clock className="size-3" />
                    <span>{record.durationMinutes} min</span>
                  </span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <CheckSquare className="size-3 text-zinc-400" />
                    <span>
                      {record.assertionsPassed}/{record.assertionsTotal} Public Assertions
                    </span>
                  </span>
                </div>

                <span className="text-[10px] text-zinc-600">
                  Submission ID: {record.submissionId}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy Note */}
      <div className="rounded-lg border border-border/60 bg-card/25 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-zinc-300">
          <FileText className="size-3.5 text-zinc-400" />
          <span>Evaluation Retention &amp; Privacy Policy</span>
        </div>
        <p className="text-zinc-400 leading-relaxed font-sans text-xs max-w-2xl">
          Historical reports preserve your diff snapshots and pass/fail breakdowns across all test assertions without ever exposing private evaluation test fixtures, reference solutions, or maintainer rubrics.
        </p>
      </div>
    </div>
  );
}
