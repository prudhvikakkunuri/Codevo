"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { type InterviewHistoryRecord } from "@/data/dashboard";
import { type SubmissionRecord } from "@/data/assessment";
import { BACKEND_API_URL } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/application/empty-state";
import {
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CheckSquare,
  History as HistoryIcon,
  Loader2,
} from "lucide-react";

export default function HistoryPage() {
  const { session, isLoading: authLoading } = useAuth();
  const [backendSubmissions, setBackendSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchSubmissions() {
      if (!session?.access_token) {
        if (isMounted) {
          setBackendSubmissions([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${BACKEND_API_URL}/api/v1/submissions`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.submissions)) {
            setBackendSubmissions(data.submissions);
          }
        }
      } catch {
        // Backend offline or unreachable
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!authLoading) {
      fetchSubmissions();
    }

    return () => {
      isMounted = false;
    };
  }, [session?.access_token, authLoading]);

  const historyItems: InterviewHistoryRecord[] = useMemo(() => {
    return backendSubmissions.map((sub) => ({
      id: sub.submissionId,
      submissionId: sub.submissionId,
      challengeId: sub.challengeId || "CI-001",
      challengeTitle: sub.challengeTitle || "Debug a Broken FastAPI Authentication API",
      category: "Backend Security",
      difficulty: "Medium",
      completedAt: sub.submittedAt,
      scorePercentage: Math.round(sub.scorePercentage),
      assertionsPassed: sub.passedTests ?? 6,
      assertionsTotal: sub.totalTests ?? 6,
      durationMinutes: 25,
      status: sub.scorePercentage >= 70 ? ("passed" as const) : ("failed" as const),
    }));
  }, [backendSubmissions]);

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3 font-mono">
        <Loader2 className="size-6 text-zinc-400 animate-spin" />
        <p className="text-xs text-zinc-400">Loading interview history...</p>
      </div>
    );
  }

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

      {/* History Records List or Empty State */}
      {historyItems.length > 0 ? (
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
      ) : (
        <EmptyState
          icon={HistoryIcon}
          title="No interview history yet"
          description="Once you complete a challenge or submit a solution, your final code snapshot, test verification results, and rubric feedback will appear here."
          actionLabel="Explore Challenges"
          actionHref="/app/challenges"
        />
      )}

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
