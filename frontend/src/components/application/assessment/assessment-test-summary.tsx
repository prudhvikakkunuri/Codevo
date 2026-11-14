"use client";

import React from "react";
import { type AutomatedTestSnapshot } from "@/data/assessment";
import { CheckCircle2, XCircle, Clock, CheckSquare, Info } from "lucide-react";

interface AssessmentTestSummaryProps {
  tests: AutomatedTestSnapshot;
}

export function AssessmentTestSummary({ tests }: AssessmentTestSummaryProps) {
  const isSimulated = tests.isSimulatedOnly;
  const hasDynamicCases = Array.isArray(tests.testCases) && tests.testCases.length > 0;

  return (
    <div className="rounded-xl border border-border/70 bg-[#101014] p-5 space-y-4 font-mono select-none">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <CheckSquare className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-foreground">
            {isSimulated ? "Simulated Public Test Results" : "Verified Public Test Results"}
          </h3>
          <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase tracking-wider ${
            isSimulated
              ? "border-border/60 bg-secondary/60 text-zinc-400"
              : "border-emerald-800/60 bg-emerald-950/40 text-emerald-300 font-semibold"
          }`}>
            {isSimulated ? "Simulated" : `Docker Isolated (${tests.runnerType || "docker"})`}
          </span>
        </div>

        {/* Counter Summary Strip */}
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>
            Total: <strong className="text-zinc-200">{tests.total}</strong>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-emerald-400">
            Passed: <strong>{tests.passed}</strong>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-red-400">
            Failed: <strong>{tests.failed}</strong>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1 text-zinc-500 text-[11px]">
            <Clock className="size-3" />
            <span>{tests.simulatedDurationSec}s</span>
          </span>
        </div>
      </div>

      {/* Explanatory Boundary Callout (Invariants #4 & #5) */}
      <div className="p-3 bg-zinc-950/60 border border-border/50 rounded-lg flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed font-sans">
        <Info className="size-3.5 text-zinc-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-zinc-300 font-mono text-[11px]">Decoupled Signal:</strong> Automated test suites are primary functional correctness indicators, while code review assesses security hygiene and maintainability. The overall assessment score is computed from the weighted rubric, not solely from the test pass ratio.
        </p>
      </div>

      {/* Test Case Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
        {hasDynamicCases ? (
          tests.testCases!.map((tc) => {
            const isPassed = tc.status === "passed";
            return (
              <div
                key={tc.id}
                className={`p-2.5 rounded border flex items-center justify-between ${
                  isPassed
                    ? "bg-zinc-900/50 border-border/40"
                    : "bg-red-950/20 border-red-900/40"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {isPassed ? (
                    <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="size-3.5 text-red-400 shrink-0" />
                  )}
                  <span className={isPassed ? "text-zinc-200 truncate" : "text-red-200 truncate"}>
                    {tc.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold shrink-0 ${
                    isPassed ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {isPassed ? "PASSED" : (tc.failureMessage || "FAILED")}
                </span>
              </div>
            );
          })
        ) : (
          <>
            <div className="p-2.5 rounded bg-zinc-900/50 border border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-200 truncate">test_register_new_user</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold shrink-0">PASSED</span>
            </div>

            <div className="p-2.5 rounded bg-zinc-900/50 border border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-200 truncate">test_duplicate_email</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold shrink-0">PASSED</span>
            </div>

            <div className="p-2.5 rounded bg-red-950/20 border border-red-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <XCircle className="size-3.5 text-red-400 shrink-0" />
                <span className="text-red-200 truncate">test_password_hashing</span>
              </div>
              <span className="text-[10px] text-red-400 font-semibold shrink-0">FAILED (Salt Verification)</span>
            </div>

            <div className="p-2.5 rounded bg-zinc-900/50 border border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-200 truncate">test_login_valid_credentials</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold shrink-0">PASSED</span>
            </div>

            <div className="p-2.5 rounded bg-red-950/20 border border-red-900/40 flex items-center justify-between sm:col-span-2">
              <div className="flex items-center gap-2 truncate">
                <XCircle className="size-3.5 text-red-400 shrink-0" />
                <span className="text-red-200 truncate">test_login_invalid_credentials</span>
              </div>
              <span className="text-[10px] text-red-400 font-semibold shrink-0">FAILED (Expected 401, got 500)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

