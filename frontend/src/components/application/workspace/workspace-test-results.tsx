"use client";

import React, { useState } from "react";
import {
  type TestExecutionResult,
  type LiveTestCase,
} from "@/lib/test-runner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceTestResultsProps {
  result: TestExecutionResult | null;
  onRunTests: () => void;
  onCancelTests?: () => void;
  isSubmitted?: boolean;
  className?: string;
}

export function WorkspaceTestResults({
  result,
  onRunTests,
  onCancelTests,
  isSubmitted = false,
  className,
}: WorkspaceTestResultsProps) {
  const [filter, setFilter] = useState<"all" | "failed" | "passed">("all");
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({
    // Auto-expand first failed test by default for immediate candidate visibility
    "tc-003": true,
  });

  const toggleExpand = (id: string) => {
    setExpandedTests((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 1. Idle State
  if (!result || result.status === "idle") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full p-6 bg-[#09090B] text-zinc-400 font-mono select-none text-center",
          className
        )}
      >
        <div className="size-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
          <Play className="size-4 fill-current ml-0.5" />
        </div>
        <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-1">
          No Tests Executed Yet
        </h4>
        <p className="text-[11px] text-zinc-500 max-w-sm mb-4">
          Click <strong className="text-zinc-300">&quot;Run Tests&quot;</strong> in the toolbar or type <code className="text-emerald-400 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">pytest</code> in the terminal to execute test fixtures.
        </p>
        <button
          onClick={onRunTests}
          disabled={isSubmitted}
          title={isSubmitted ? "Session is submitted. Test execution is locked." : "Run test suite"}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            isSubmitted
              ? "bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed"
              : "bg-foreground text-background hover:bg-zinc-200 cursor-pointer"
          )}
        >
          <Play className="size-3 fill-current" />
          <span>Run Test Suite</span>
        </button>
        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Info className="size-3 text-zinc-500" />
          <span>Phase 1 Frontend Preview: All results are illustrative simulated fixtures.</span>
        </div>
      </div>
    );
  }

  // Filter test cases
  const displayedCases = result.testCases.filter((tc) => {
    if (filter === "failed") return tc.status === "failed";
    if (filter === "passed") return tc.status === "passed";
    return true;
  });

  const durationSec = (result.durationMs / 1000).toFixed(2);
  const isRunning = result.status === "running";

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#09090B] select-none text-xs font-mono overflow-hidden",
        className
      )}
    >
      {/* Top Results Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-[#0C0C0E] shrink-0">
        {/* Left: Status & Simulation Pill */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-900/60 bg-blue-950/40 text-[10px] text-blue-300 font-semibold">
              <Loader2 className="size-3 animate-spin text-blue-400" />
              <span>RUNNING TESTS...</span>
            </span>
          ) : result.status === "passed" ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-900/60 bg-emerald-950/40 text-[10px] text-emerald-300 font-semibold">
              <CheckCircle2 className="size-3 text-emerald-400" />
              <span>ALL TESTS PASSED</span>
            </span>
          ) : result.status === "failed" ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-900/60 bg-red-950/40 text-[10px] text-red-300 font-semibold">
              <XCircle className="size-3 text-red-400" />
              <span>{result.failedCount} TEST{result.failedCount > 1 ? "S" : ""} FAILED</span>
            </span>
          ) : result.status === "cancelled" ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-900/60 bg-amber-950/40 text-[10px] text-amber-300 font-semibold">
              <AlertTriangle className="size-3 text-amber-400" />
              <span>EXECUTION CANCELLED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-900/60 bg-red-950/40 text-[10px] text-red-300 font-semibold">
              <AlertTriangle className="size-3 text-red-400" />
              <span>EXECUTION ERROR</span>
            </span>
          )}

          {/* Mandatory Simulated Label */}
          <span
            title="All executions in Milestone 1.7 are simulated frontend fixtures"
            className="px-1.5 py-0.5 rounded border border-border/60 bg-secondary/60 text-[9px] text-zinc-400 uppercase tracking-wider"
          >
            Simulated Execution
          </span>
        </div>

        {/* Center / Right: Counters & Rerun Control */}
        <div className="flex items-center gap-3">
          {/* Counters */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span>
              Total: <strong className="text-zinc-200">{result.totalCount}</strong>
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-400">
              Passed: <strong>{result.passedCount}</strong>
            </span>
            <span className="text-zinc-700">|</span>
            <span className={result.failedCount > 0 ? "text-red-400 font-bold" : "text-zinc-500"}>
              Failed: <strong>{result.failedCount}</strong>
            </span>
            <span className="text-zinc-700">|</span>
            <span className="flex items-center gap-1 text-zinc-500 text-[10px]">
              <Clock className="size-3" />
              <span>{durationSec}s</span>
            </span>
          </div>

          {/* Actions */}
          {isRunning ? (
            onCancelTests && (
              <button
                onClick={onCancelTests}
                className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] transition-colors"
              >
                Stop Execution
              </button>
            )
          ) : (
            <button
              onClick={onRunTests}
              disabled={isSubmitted}
              title={isSubmitted ? "Session is submitted. Test execution is locked." : "Rerun test suite"}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors border",
                isSubmitted
                  ? "bg-zinc-950 text-zinc-500 border-zinc-800 cursor-not-allowed opacity-60"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700 cursor-pointer"
              )}
            >
              <RotateCcw className="size-2.5" />
              <span>Rerun</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (Visible while running) */}
      {isRunning && (
        <div className="h-1 w-full bg-zinc-900 overflow-hidden relative">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{
              width: `${
                result.totalCount > 0
                  ? ((result.passedCount + result.failedCount) / result.totalCount) * 100
                  : 15
              }%`,
            }}
          />
        </div>
      )}

      {/* Secondary Subbar: Filters & Search */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-[#09090B] shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
              filter === "all"
                ? "bg-white/[0.08] text-foreground font-semibold"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            All ({result.totalCount})
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
              filter === "failed"
                ? "bg-red-950/60 text-red-300 font-semibold border border-red-900/50"
                : "text-zinc-500 hover:text-red-400"
            )}
          >
            Failed ({result.failedCount})
          </button>
          <button
            onClick={() => setFilter("passed")}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
              filter === "passed"
                ? "bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-900/50"
                : "text-zinc-500 hover:text-emerald-400"
            )}
          >
            Passed ({result.passedCount})
          </button>
        </div>

        <span className="text-[10px] text-zinc-600 hidden sm:inline">
          FastAPI Auth Service Fixtures (CI-001)
        </span>
      </div>

      {/* Main Test List / Traceback View */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {/* Runtime Exception State */}
        {result.status === "error" && result.errorOutput && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Simulated Execution Crash (Pre-test compilation/syntax error)</span>
            </div>
            <pre className="p-3 bg-red-950/20 border border-red-900/50 rounded-md text-[11px] text-red-300 overflow-x-auto whitespace-pre-wrap select-text">
              {result.errorOutput}
            </pre>
          </div>
        )}

        {/* Regular Test Cases */}
        {displayedCases.length === 0 && result.status !== "error" ? (
          <div className="p-8 text-center text-zinc-500 text-[11px]">
            No tests match the current &quot;{filter}&quot; filter.
          </div>
        ) : (
          displayedCases.map((tc: LiveTestCase) => {
            const isExpanded = !!expandedTests[tc.id];
            const isFailed = tc.status === "failed";
            const isPassed = tc.status === "passed";
            const isTestRunning = tc.status === "running";

            return (
              <div
                key={tc.id}
                className={cn(
                  "transition-colors",
                  isFailed ? "bg-red-950/[0.08]" : "hover:bg-white/[0.02]"
                )}
              >
                {/* Row Header */}
                <div
                  onClick={() => isFailed && toggleExpand(tc.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 gap-2",
                    isFailed && "cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Status Icon */}
                    {isTestRunning ? (
                      <Loader2 className="size-3.5 animate-spin text-blue-400 shrink-0" />
                    ) : isPassed ? (
                      <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                    ) : isFailed ? (
                      <XCircle className="size-3.5 text-red-400 shrink-0" />
                    ) : (
                      <div className="size-3.5 rounded-full border border-zinc-700 shrink-0" />
                    )}

                    {/* Test Name & File */}
                    <span className="font-semibold text-zinc-200 text-xs truncate">
                      {tc.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 hidden md:inline truncate">
                      {tc.file}
                    </span>
                  </div>

                  {/* Right: Duration & Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {tc.durationMs !== undefined && (
                      <span className="text-[10px] text-zinc-500">{tc.durationMs}ms</span>
                    )}

                    {isFailed && (
                      <span className="text-zinc-500 hover:text-zinc-300">
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Failure Details */}
                {isFailed && isExpanded && (
                  <div className="px-4 pb-3 pt-1 space-y-2 border-t border-red-950/40 select-text bg-[#08080A]">
                    {/* Failure Summary Message */}
                    {tc.failureMessage && (
                      <div className="text-[11px] text-red-300 font-medium">
                        {tc.failureMessage}
                      </div>
                    )}

                    {/* Assertion Diff */}
                    {tc.assertionDetails && (
                      <div className="p-2 bg-zinc-950 border border-border/50 rounded text-[11px] font-mono space-y-1">
                        <div className="text-zinc-400 text-[10px] uppercase font-semibold">
                          Assertion Diff:
                        </div>
                        <div className="text-emerald-400 text-[10px]">
                          Expected: {tc.assertionDetails.expected}
                        </div>
                        <div className="text-red-400 text-[10px]">
                          Actual:&nbsp;&nbsp; {tc.assertionDetails.actual}
                        </div>
                      </div>
                    )}

                    {/* Full Traceback */}
                    {tc.traceback && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-zinc-500 font-semibold uppercase">
                          Simulated Pytest Traceback:
                        </div>
                        <pre className="p-2.5 bg-zinc-950 border border-border/40 rounded text-[10px] text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {tc.traceback}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

