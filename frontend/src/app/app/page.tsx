import React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/application/empty-state";
import { DashboardMetrics } from "@/components/application/dashboard/dashboard-metrics";
import { AvailableChallenges } from "@/components/application/dashboard/available-challenges";
import { DEMO_INTERVIEW_HISTORY } from "@/data/dashboard";
import {
  Code2,
  ArrowRight,
  PlayCircle,
  Activity,
  History,
  Terminal,
  ShieldCheck,
  Cpu,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-10 pb-16">
      {/* 1. Section A: Welcome Section (Editorial, direct on canvas) */}
      <section className="space-y-6 pt-2" aria-labelledby="dashboard-welcome-heading">
        <div className="space-y-3">
          {/* Status Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/70 px-3 py-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-medium text-zinc-300 uppercase tracking-wider">
              Engineering Practice Environment
            </span>
          </div>

          {/* Heading */}
          <h1
            id="dashboard-welcome-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            Welcome to Codevo
          </h1>

          {/* Supporting Description */}
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Practice practical technical interviews inside authentic repositories. Understand unfamiliar architectures, debug real defects, and prove your engineering ability under timed conditions.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/app/challenges"
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "gap-1.5 font-medium shadow-sm h-9 px-4 text-xs",
            })}
          >
            <Code2 className="size-3.5" />
            Explore Challenges
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Three Platform Highlights */}
        <div className="pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="size-6 rounded-md border border-border/80 bg-secondary flex items-center justify-center text-zinc-300 shrink-0">
              <Terminal className="size-3" />
            </div>
            <span>Realistic multi-file codebases</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="size-6 rounded-md border border-border/80 bg-secondary flex items-center justify-center text-zinc-300 shrink-0">
              <ShieldCheck className="size-3" />
            </div>
            <span>Automated public &amp; hidden tests</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="size-6 rounded-md border border-border/80 bg-secondary flex items-center justify-center text-zinc-300 shrink-0">
              <Cpu className="size-3" />
            </div>
            <span>Candidate BYOK AI assistance</span>
          </div>
        </div>
      </section>

      {/* 2. Section B: Summary Metrics (Mock / Demo Preview) */}
      <DashboardMetrics />

      {/* 3. Section C: Available Challenges Preview (5 PRD challenges) */}
      <AvailableChallenges />

      {/* 4. Section D: Continue Practicing */}
      <section className="space-y-3.5" aria-labelledby="continue-practicing-heading">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="space-y-0.5">
            <h2
              id="continue-practicing-heading"
              className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2"
            >
              <PlayCircle className="size-3.5 text-zinc-300" />
              Continue Practicing
            </h2>
            <p className="text-xs text-zinc-400">
              Active and in-progress timed interview sessions.
            </p>
          </div>
          <span className="font-mono text-[11px] text-zinc-500">
            0 active sessions
          </span>
        </div>

        {/* Compact Empty State */}
        <EmptyState
          compact
          icon={PlayCircle}
          title="No active interview sessions"
          description="You don't have any in-progress interviews. Browse the challenge catalogue and start your first practical assessment."
          actionLabel="Browse Challenges"
          actionHref="/app/challenges"
        />
      </section>

      {/* 5. Sections E & F: Recent Interviews & Your Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section E: Recent Interviews (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-3.5" aria-labelledby="recent-interviews-heading">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="space-y-0.5">
              <h2
                id="recent-interviews-heading"
                className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2"
              >
                <History className="size-3.5 text-zinc-300" />
                Recent Interviews
              </h2>
              <p className="text-xs text-zinc-400">
                Completed code submissions, test outputs, and evaluation reports.
              </p>
            </div>
            <Link
              href="/app/history"
              className="text-xs font-mono text-zinc-400 hover:text-foreground transition-colors"
            >
              View all history &rarr;
            </Link>
          </div>

          {/* Recent Interview Cards or Empty State */}
          {DEMO_INTERVIEW_HISTORY.length > 0 ? (
            <div className="space-y-2.5">
              {DEMO_INTERVIEW_HISTORY.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-border/70 bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded border border-border/80 bg-secondary/80 text-[10px] text-zinc-300">
                        {item.challengeId}
                      </span>
                      <span className="font-semibold text-foreground truncate">
                        {item.challengeTitle}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Score: <strong className="text-emerald-400">{item.scorePercentage}%</strong> · Completed in {item.durationMinutes} min
                    </div>
                  </div>

                  <Link
                    href={`/app/results/${item.submissionId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background hover:bg-zinc-200 text-xs font-medium transition-colors shrink-0"
                  >
                    <span>View Report</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={History}
              title="No interview history yet"
              description="Once you complete a challenge or reach a session deadline, your final code snapshot, test results, and rubric feedback will be archived here."
              actionLabel="Start Your First Challenge"
              actionHref="/app/challenges"
            />
          )}
        </div>

        {/* Section F: Your Activity (1 col on lg) */}
        <div className="space-y-3.5" aria-labelledby="your-activity-heading">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="space-y-0.5">
              <h2
                id="your-activity-heading"
                className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2"
              >
                <Activity className="size-3.5 text-zinc-300" />
                Your Activity
              </h2>
              <p className="text-xs text-zinc-400">
                Practice cadence and signals.
              </p>
            </div>
          </div>

          {/* Clean Activity Panel */}
          <div className="rounded-lg border border-border/60 bg-card/25 p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                Activity Signals
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Activity tracking and practice metrics are scheduled for Milestone 1.4 preview.
              </p>
            </div>

            <div className="border-t border-border/40 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Activity Metrics</span>
                <span className="font-mono text-[11px] text-zinc-400">Coming Soon</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Session History</span>
                <span className="font-mono text-[11px] text-zinc-400">Planned Feature</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Automated Evaluation</span>
                <span className="font-mono text-[11px] text-zinc-400">Planned Feature</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
