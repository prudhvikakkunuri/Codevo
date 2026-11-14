import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_ASSESSMENT_REPORT, type AssessmentReport } from "@/data/assessment";
import { AssessmentHeader } from "@/components/application/assessment/assessment-header";
import { AssessmentScoreCard } from "@/components/application/assessment/assessment-score-card";
import { AssessmentTestSummary } from "@/components/application/assessment/assessment-test-summary";
import { AssessmentRubricCard } from "@/components/application/assessment/assessment-rubric-card";
import { AssessmentFeedbackPanel } from "@/components/application/assessment/assessment-feedback-panel";
import { History } from "lucide-react";

interface ResultsPageProps {
  params: Promise<{
    submissionId: string;
  }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { submissionId } = await params;

  let report: AssessmentReport = DEMO_ASSESSMENT_REPORT;
  let isVerifiedBackendReport = false;

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/submissions/${submissionId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      report = (await res.json()) as AssessmentReport;
      isVerifiedBackendReport = true;
    }
  } catch {
    // Backend offline or local network error; fallback gracefully
  }

  const isDemoMatch =
    submissionId === DEMO_ASSESSMENT_REPORT.submissionId ||
    submissionId === "latest" ||
    submissionId.startsWith("sub-");

  if (!isVerifiedBackendReport && !isDemoMatch) {
    notFound();
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

