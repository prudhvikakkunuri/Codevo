"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Challenge } from "@/data/challenges";
import {
  recordClientSubmission,
  DEMO_ASSESSMENT_REPORT,
} from "@/data/assessment";
import {
  CheckCircle2,
  Loader2,
  X,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BACKEND_API_URL } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface WorkspaceSubmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge;
  sessionId: string;
  modifiedFilesCount: number;
  documents?: Record<string, { content: string; isModified: boolean }>;
}

type SubmissionPhase = "confirm" | "processing" | "success" | "error";

interface ProcessingStep {
  label: string;
  description: string;
}

const PROCESSING_STEPS: ProcessingStep[] = [
  {
    label: "Capturing Workspace Snapshot",
    description: "Recording document modifications and repository state...",
  },
  {
    label: "Compiling Automated Test Evidence",
    description: "Aggregating public test assertions and execution logs...",
  },
  {
    label: "Generating Demonstration Scorecard",
    description: "Applying illustrative rubric weights and evidence analysis...",
  },
  {
    label: "Assessment Finalized",
    description: "Demonstration report ready for candidate review.",
  },
];

export function WorkspaceSubmissionDialog({
  isOpen,
  onClose,
  challenge,
  sessionId,
  modifiedFilesCount,
  documents,
}: WorkspaceSubmissionDialogProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [phase, setPhase] = useState<SubmissionPhase>("confirm");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [submissionId, setSubmissionId] = useState<string>(DEMO_ASSESSMENT_REPORT.submissionId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const handleClose = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhase("confirm");
    setCurrentStepIndex(0);
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && phase === "confirm") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, phase, handleClose]);

  if (!isOpen) return null;

  const handleConfirmSubmit = async () => {
    if (phase !== "confirm") return;
    setPhase("processing");
    setErrorMessage(null);
    setCurrentStepIndex(0);

    // Staged progression with clean timeouts
    const step1 = setTimeout(() => setCurrentStepIndex(1), 400);
    const step2 = setTimeout(() => setCurrentStepIndex(2), 800);
    timeoutsRef.current.push(step1, step2);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${BACKEND_API_URL}/api/v1/workspace/${sessionId}/submit`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Submission request failed." }));
        const msg =
          typeof errData.detail === "string"
            ? errData.detail
            : "Submission validation failed. Please check test execution results.";
        setErrorMessage(msg);
        setPhase("error");
        return;
      }

      const data = await res.json();
      const realSubId = data.submission_id || DEMO_ASSESSMENT_REPORT.submissionId;
      setSubmissionId(realSubId);
      setCurrentStepIndex(3);
      setPhase("success");

      // Record client submission state in localStorage with documents snapshot
      recordClientSubmission(sessionId, realSubId, documents);

      // Auto-redirect to assessment results after short confirmation
      const redirect = setTimeout(() => {
        router.replace(`/app/results/${realSubId}`);
      }, 900);
      timeoutsRef.current.push(redirect);
    } catch {
      // Local offline fallback
      recordClientSubmission(sessionId, DEMO_ASSESSMENT_REPORT.submissionId, documents);
      setCurrentStepIndex(3);
      setPhase("success");
      const redirect = setTimeout(() => {
        router.replace(`/app/results/${DEMO_ASSESSMENT_REPORT.submissionId}`);
      }, 900);
      timeoutsRef.current.push(redirect);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-[#101014] border border-border rounded-xl shadow-2xl overflow-hidden font-mono flex flex-col">
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="size-2 rounded-full bg-amber-400" />
            <h3 id="submission-dialog-title" className="text-sm font-semibold text-foreground">
              {phase === "confirm"
                ? "Submit Challenge Solution"
                : phase === "processing"
                  ? "Processing Demonstration Submission"
                  : phase === "error"
                    ? "Submission Notice"
                    : "Submission Completed"}
            </h3>
          </div>

          {(phase === "confirm" || phase === "success" || phase === "error") && (
            <button
              onClick={handleClose}
              aria-label="Close dialog"
              className="size-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Dialog Body */}
        <div className="p-5 space-y-4">
          {/* A. Confirmation Phase */}
          {phase === "confirm" && (
            <>
              {/* Challenge Snapshot Info */}
              <div className="p-3 bg-zinc-900/60 border border-border/60 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Challenge ID:</span>
                  <span className="font-semibold text-zinc-200">{challenge.id}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Challenge:</span>
                  <span className="font-semibold text-zinc-200 truncate max-w-[280px]">
                    {challenge.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Session:</span>
                  <span className="text-zinc-300">{sessionId}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 text-[11px] pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="size-3.5 text-zinc-400" />
                    <span>Workspace Modifications:</span>
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {modifiedFilesCount} file{modifiedFilesCount === 1 ? "" : "s"} edited
                  </span>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg flex items-start gap-2.5 text-xs text-amber-300">
                <ShieldAlert className="size-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold">Final Submission Notice</span>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed font-sans">
                    Submitting finalizes this interview session. Once confirmed, you will be directed to the assessment report and cannot make further edits to this workspace.
                  </p>
                </div>
              </div>

              {/* Simulated Notice */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-1">
                <Info className="size-3.5 shrink-0 text-zinc-400" />
                <span>
                  Phase 1 Preview: This client-side demonstration produces an illustrative scorecard. No live backend evaluation occurs.
                </span>
              </div>
            </>
          )}

          {/* B. Processing Phase */}
          {phase === "processing" && (
            <div className="py-4 space-y-5">
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100}%` }}
                />
              </div>

              {/* Step Sequence */}
              <div className="space-y-3">
                {PROCESSING_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-lg border transition-all text-xs",
                        isCurrent
                          ? "bg-zinc-900 border-border text-foreground"
                          : isDone
                            ? "bg-zinc-950/40 border-border/40 text-zinc-400"
                            : "bg-transparent border-transparent text-zinc-600"
                      )}
                    >
                      <div className="mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="size-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <Loader2 className="size-4 animate-spin text-amber-400" />
                        ) : (
                          <div className="size-4 rounded-full border border-zinc-700" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs">{step.label}</div>
                        <div className="text-[11px] text-zinc-500 font-sans">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* C. Success Phase */}
          {phase === "success" && (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="size-12 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Submission Successfully Recorded
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm font-sans">
                Your demonstration assessment report is ready. Redirecting to evaluation scorecard...
              </p>
              <Link
                href={`/app/results/${submissionId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-emerald-400 hover:text-emerald-300 font-mono bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/80 transition-colors pt-2 cursor-pointer"
              >
                <span>Opening /app/results/{submissionId}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}

          {/* D. Error Phase */}
          {phase === "error" && (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="size-12 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400">
                <ShieldAlert className="size-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Submission Notice
              </h4>
              <p className="text-xs text-zinc-300 max-w-sm font-sans leading-relaxed">
                {errorMessage || "Submission validation could not be completed."}
              </p>
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        {phase === "success" && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/60 bg-zinc-950/40">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              Stay in Workspace
            </button>
            <Link
              href={`/app/results/${submissionId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <span>View Assessment Report</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}

        {phase === "error" && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-zinc-950/40">
            <button
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {phase === "confirm" && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-zinc-950/40">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSubmit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <span>Confirm &amp; Submit Solution</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

