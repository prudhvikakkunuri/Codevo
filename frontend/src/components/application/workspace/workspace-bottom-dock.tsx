"use client";

import React from "react";
import { Terminal as TerminalIcon, CheckSquare, X, Loader2 } from "lucide-react";
import { WorkspaceTerminal } from "./workspace-terminal";
import { WorkspaceTestResults } from "./workspace-test-results";
import { type TestExecutionResult } from "@/lib/test-runner";
import { cn } from "@/lib/utils";

export type BottomDockTab = "terminal" | "tests";

interface WorkspaceBottomDockProps {
  activeTab: BottomDockTab;
  onSelectTab: (tab: BottomDockTab) => void;
  onClose: () => void;
  testResult: TestExecutionResult | null;
  onRunTests: () => void;
  onCancelTests: () => void;
  terminalStream?: string;
  isSubmitted?: boolean;
  className?: string;
}

export function WorkspaceBottomDock({
  activeTab,
  onSelectTab,
  onClose,
  testResult,
  onRunTests,
  onCancelTests,
  terminalStream,
  isSubmitted = false,
  className,
}: WorkspaceBottomDockProps) {
  const isRunning = testResult?.status === "running";

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#09090B] border-t border-border/60 select-none overflow-hidden",
        className
      )}
    >
      {/* Dock Header Tab Bar */}
      <div className="flex items-center justify-between h-8 px-2 bg-[#09090B] border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1 h-full">
          {/* Terminal Tab */}
          <button
            onClick={() => onSelectTab("terminal")}
            role="tab"
            aria-selected={activeTab === "terminal"}
            className={cn(
              "flex items-center gap-1.5 h-full px-2.5 text-xs font-mono border-b-2 transition-colors",
              activeTab === "terminal"
                ? "border-foreground text-foreground font-semibold bg-white/[0.04]"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
            )}
          >
            <TerminalIcon className="size-3" />
            <span>Terminal</span>
          </button>

          {/* Test Results Tab */}
          <button
            onClick={() => onSelectTab("tests")}
            role="tab"
            aria-selected={activeTab === "tests"}
            className={cn(
              "flex items-center gap-1.5 h-full px-2.5 text-xs font-mono border-b-2 transition-colors",
              activeTab === "tests"
                ? "border-foreground text-foreground font-semibold bg-white/[0.04]"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
            )}
          >
            <CheckSquare className="size-3" />
            <span>Test Results</span>

            {/* Live Indicator Badges */}
            {isRunning ? (
              <Loader2 className="size-3 animate-spin text-blue-400 ml-1" />
            ) : testResult?.status === "passed" ? (
              <span className="size-1.5 rounded-full bg-emerald-400 ml-1" />
            ) : testResult?.status === "failed" ? (
              <span className="px-1 py-0.2 rounded text-[9px] bg-red-950 text-red-400 border border-red-900/60 ml-1 font-bold">
                {testResult.failedCount}
              </span>
            ) : testResult?.status === "error" ? (
              <span className="size-1.5 rounded-full bg-red-400 ml-1" />
            ) : null}
          </button>
        </div>

        {/* Right Dock Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            title="Minimize bottom dock"
            aria-label="Close bottom dock"
            className="size-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      <div className="flex-1 min-h-0 w-full relative">
        {/* Terminal Canvas */}
        <div className={cn("h-full w-full", activeTab !== "terminal" && "hidden")}>
          <WorkspaceTerminal
            onClose={onClose}
            onRunTests={onRunTests}
            terminalStream={terminalStream}
            isSubmitted={isSubmitted}
          />
        </div>

        {/* Test Results Canvas */}
        <div className={cn("h-full w-full", activeTab !== "tests" && "hidden")}>
          <WorkspaceTestResults
            result={testResult}
            onRunTests={onRunTests}
            onCancelTests={onCancelTests}
            isSubmitted={isSubmitted}
          />
        </div>
      </div>
    </div>
  );
}

