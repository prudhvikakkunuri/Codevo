"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/common/wordmark";
import { type Challenge } from "@/data/challenges";
import { type TestExecutionStatus } from "@/lib/test-runner";
import { type TestScenarioId, TEST_SCENARIOS } from "@/data/test-fixtures";
import {
  Timer,
  Play,
  CheckSquare,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Square,
  SlidersHorizontal,
  ChevronDown,
  Info,
  FileText,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceToolbarProps {
  challenge: Challenge;
  sessionId?: string;
  testStatus?: TestExecutionStatus;
  onRunTests?: () => void;
  onCancelTests?: () => void;
  selectedScenario?: TestScenarioId;
  onSelectScenario?: (scenario: TestScenarioId) => void;
  isSubmitted?: boolean;
  submissionId?: string;
  onSubmit?: () => void;
  onResetSession?: () => void;
}

export function WorkspaceToolbar({
  challenge,
  sessionId,
  testStatus = "idle",
  onRunTests,
  onCancelTests,
  selectedScenario = "initial-defects",
  onSelectScenario,
  isSubmitted = false,
  submissionId,
  onSubmit,
  onResetSession,
}: WorkspaceToolbarProps) {
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const demoMenuRef = useRef<HTMLDivElement>(null);
  const isRunning = testStatus === "running";

  // Close demo menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (demoMenuRef.current && !demoMenuRef.current.contains(e.target as Node)) {
        setDemoMenuOpen(false);
      }
    };
    if (demoMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [demoMenuOpen]);

  return (
    <header className="flex items-center justify-between h-12 px-3 border-b border-border/60 bg-[#09090B] select-none shrink-0 z-20">
      {/* Left: Brand, Exit & Challenge Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/app/challenges"
          title="Exit workspace to challenges catalogue"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono text-zinc-400 hover:text-foreground hover:bg-white/[0.05] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Exit</span>
        </Link>

        <div className="h-4 w-px bg-border/60 hidden sm:block" />

        <div className="hidden md:flex items-center">
          <Wordmark size="sm" />
        </div>

        <div className="h-4 w-px bg-border/60 hidden md:block" />

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-semibold text-zinc-300 bg-secondary/80 border border-border/70 px-1.5 py-0.5 rounded shrink-0">
            {challenge.id}
          </span>
          <span className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-md">
            {challenge.title}
          </span>
        </div>
      </div>

      {/* Center/Right: Static Timer, Demo Controls & Test Runner */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Demo Session Pill & Evaluator Scenarios Dropdown (Refinement 2) */}
        <div className="relative hidden lg:block" ref={demoMenuRef}>
          <button
            onClick={() => setDemoMenuOpen(!demoMenuOpen)}
            title={
              sessionId
                ? `Demo session (${sessionId}): Development and reset options`
                : "Development-only options for previewing test outcomes"
            }
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono transition-colors cursor-pointer",
              isSubmitted
                ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:border-emerald-700"
                : "border-border/80 bg-secondary/70 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
            )}
          >
            <span className={cn("size-1.5 rounded-full", isSubmitted ? "bg-emerald-400" : "bg-amber-400/80")} />
            <span>{isSubmitted ? "Submitted (Options)" : "Demo Session"}</span>
            <SlidersHorizontal className="size-2.5 ml-0.5 text-zinc-500" />
            <ChevronDown className="size-2 text-zinc-500" />
          </button>

          {/* Evaluator Scenario Selector Menu */}
          {demoMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 p-2 bg-[#101014] border border-border rounded-lg shadow-2xl z-50 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider px-1 pb-1 border-b border-border/50">
                <div className="flex items-center gap-1">
                  <Info className="size-3 text-amber-400" />
                  <span>Demo Options</span>
                </div>
              </div>

              {onResetSession && (
                <button
                  onClick={() => {
                    onResetSession();
                    setDemoMenuOpen(false);
                  }}
                  className="w-full text-left p-1.5 rounded text-[11px] transition-colors flex items-center gap-1.5 text-amber-300 hover:bg-amber-950/40 border border-amber-900/40 hover:border-amber-700/60 font-semibold mb-2"
                >
                  <RotateCcw className="size-3 text-amber-400 shrink-0" />
                  <span>Reset Session (Start Fresh)</span>
                </button>
              )}

              <p className="text-[10px] text-zinc-500 px-1 leading-normal">
                Simulate different test outcomes without executing code:
              </p>

              {(Object.keys(TEST_SCENARIOS) as TestScenarioId[]).map((key) => {
                const scen = TEST_SCENARIOS[key];
                const isSelected = selectedScenario === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (onSelectScenario) onSelectScenario(key);
                      setDemoMenuOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-1.5 rounded text-[11px] transition-colors flex flex-col gap-0.5",
                      isSelected
                        ? "bg-white/[0.08] text-foreground font-semibold border border-border"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{scen.label}</span>
                      {isSelected && <span className="size-1.5 rounded-full bg-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Static Timer Display */}
        <div
          title="Authoritative timer display placeholder (Fixed session duration: 40:00)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/60 bg-secondary/40 text-xs font-mono text-zinc-300"
        >
          <Timer className="size-3.5 text-zinc-400" />
          <span>40:00</span>
        </div>

        {/* Cancel Button (Visible only while running) */}
        {isRunning && onCancelTests && (
          <button
            onClick={onCancelTests}
            title="Cancel test execution"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800 transition-colors animate-pulse"
          >
            <Square className="size-2.5 fill-current" />
            <span>Cancel</span>
          </button>
        )}

        {/* Interactive Run Tests Action */}
        <button
          onClick={onRunTests}
          disabled={isRunning || isSubmitted}
          title={
            isSubmitted
              ? "Session is submitted. Test execution is locked."
              : isRunning
              ? "Simulated test execution in progress..."
              : "Run test suite (simulated execution)"
          }
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors border",
            isSubmitted
              ? "bg-zinc-900 text-zinc-500 border-border/50 cursor-not-allowed"
              : isRunning
              ? "bg-zinc-800 text-zinc-400 border-zinc-700 cursor-not-allowed"
              : "bg-foreground text-background hover:bg-zinc-200 border-transparent shadow-sm cursor-pointer"
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="size-3 animate-spin text-zinc-400" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="size-3 fill-current" />
              <span>Run Tests</span>
              {testStatus === "passed" && (
                <span className="size-1.5 rounded-full bg-emerald-500" />
              )}
              {testStatus === "failed" && (
                <span className="size-1.5 rounded-full bg-red-500" />
              )}
            </>
          )}
        </button>

        {/* Submission Status & Report Navigation (Requirement 5) */}
        {isSubmitted ? (
          <div className="flex items-center gap-2">
            {/* 1. Static Non-Clickable Submitted Status Badge */}
            <div
              title="Interview session finalized and submitted. Workspace is locked in read-only mode."
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-900/80 select-none"
            >
              <CheckCircle2 className="size-3 text-emerald-400" />
              <span>Submitted</span>
            </div>

            {/* 2. Separate View Report Navigation Action */}
            <Link
              href={`/app/results/${submissionId || "sub-ci001-demo-01"}`}
              title="View demonstration assessment report for this submission"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-foreground border border-border/80 hover:border-zinc-600 transition-colors font-mono shadow-sm"
            >
              <FileText className="size-3 text-zinc-400" />
              <span className="hidden sm:inline">View Report</span>
              <span className="sm:hidden">Report</span>
              <ArrowRight className="size-3 text-zinc-400" />
            </Link>
          </div>
        ) : (
          <button
            onClick={onSubmit}
            disabled={isRunning}
            title={
              isRunning
                ? "Complete or stop test execution before submitting"
                : "Submit solution and finalize interview session"
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors border",
              isRunning
                ? "bg-zinc-800 text-zinc-500 border-zinc-700/50 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-sm cursor-pointer"
            )}
          >
            <CheckSquare className="size-3" />
            <span className="hidden sm:inline">Submit Solution</span>
            <span className="sm:hidden">Submit</span>
          </button>
        )}
      </div>
    </header>
  );
}
