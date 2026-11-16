"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { type AssessmentReport } from "@/data/assessment";
import { AssessmentHeader } from "@/components/application/assessment/assessment-header";
import { AssessmentScoreCard } from "@/components/application/assessment/assessment-score-card";
import { AssessmentTestSummary } from "@/components/application/assessment/assessment-test-summary";
import { AssessmentRubricCard } from "@/components/application/assessment/assessment-rubric-card";
import { AssessmentFeedbackPanel } from "@/components/application/assessment/assessment-feedback-panel";
import { History, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { BACKEND_API_URL } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface ResultsPageProps {
  params: Promise<{
    submissionId: string;
  }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { submissionId } = use(params);
  const { session, isLoading: authLoading } = useAuth();
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      if (authLoading) return;

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      try {
        const res = await fetch(`${BACKEND_API_URL}/api/v1/submissions/${submissionId}`, {
          headers,
          cache: "no-store",
        });

        if (!isMounted) return;

        if (res.ok) {
          const data = (await res.json()) as AssessmentReport;
          setReport(data);
          setErrorStatus(null);
        } else {
          setErrorStatus(res.status);
          const errData = await res.json().catch(() => ({}));
          const msg =
            errData.error?.message ||
            errData.detail ||
            (res.status === 403
              ? "You do not have permission to view this submission."
              : res.status === 404
                ? "Submission report not found."
                : "Failed to load submission report.");
          setErrorMessage(msg);
        }
      } catch {
        if (!isMounted) return;
        setErrorStatus(500);
        setErrorMessage("Network error: Unable to contact assessment service.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [submissionId, session?.access_token, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3 font-mono">
        <Loader2 className="size-6 text-zinc-400 animate-spin" />
        <p className="text-xs text-zinc-400">Loading authoritative assessment report...</p>
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 font-mono select-none">
        <div className="size-12 rounded-lg border border-red-500/30 bg-red-950/20 flex items-center justify-center text-red-400">
          <ShieldAlert className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            {errorMessage || "You do not have permission to view this submission report. Candidate assessments are strictly private to their owner."}
          </p>
        </div>
        <Link
          href="/app/history"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-secondary text-zinc-300 hover:text-foreground text-xs font-medium border border-border transition-colors"
        >
          <History className="size-3.5" />
          <span>Back to Your Interview History</span>
        </Link>
      </div>
    );
  }

  if (errorStatus === 404 || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 font-mono select-none">
        <div className="size-12 rounded-lg border border-border/80 bg-secondary flex items-center justify-center text-zinc-400">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Report Not Found</h2>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            {errorMessage || `Submission ID "${submissionId}" does not exist or has not been finalized.`}
          </p>
        </div>
        <Link
          href="/app/history"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-secondary text-zinc-300 hover:text-foreground text-xs font-medium border border-border transition-colors"
        >
          <History className="size-3.5" />
          <span>View Interview History</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Report Header */}
      <AssessmentHeader
        challengeId={report.challengeId}
        challengeTitle={report.challengeTitle}
        submissionId={report.submissionId}
        submittedAt={report.submittedAt}
        isDemoAssessment={report.isDemoAssessment}
      />

      {/* 2. Score Overview Hero Card */}
      <AssessmentScoreCard report={report} />

      {/* 3. Automated Test Evidence (Isolated from Qualitative Evaluation) */}
      <AssessmentTestSummary tests={report.automatedTests} />

      {/* 4. Rubric Breakdown */}
      <AssessmentRubricCard categories={report.rubricCategories} />

      {/* 5. Qualitative Feedback & Actionable Recommendations */}
      <AssessmentFeedbackPanel
        strengths={report.strengths}
        improvementAreas={report.improvementAreas}
        recommendations={report.recommendations}
      />

      {/* 6. Footer Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50 text-xs font-mono">
        <Link
          href="/app/history"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary/80 hover:bg-secondary text-zinc-300 border border-border/70 transition-colors"
        >
          <History className="size-3.5" />
          <span>View All in Interview History</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/app/challenges"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-foreground text-background hover:bg-zinc-200 transition-colors font-medium"
          >
            <span>Explore More Challenges</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

