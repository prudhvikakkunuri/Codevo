import React from "react";
import Link from "next/link";
import { DEMO_SESSION_ID } from "@/data/workspace";
import { WorkspaceLayout } from "@/components/application/workspace/workspace-layout";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, PlayCircle } from "lucide-react";

interface WorkspacePageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { sessionId } = await params;

  // Support the explicit demo session ID "ci-001-demo" and user-scoped sessions "ci-001-<userId>".
  if (sessionId !== DEMO_SESSION_ID && !sessionId.startsWith("ci-001-")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090B] text-foreground p-6 text-center select-none">
        <div className="size-12 rounded-lg border border-border/70 bg-secondary/80 flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
          <AlertCircle className="size-6 text-amber-400" />
        </div>

        <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Workspace Error
        </span>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-2">
          Invalid or Expired Workspace Session
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
          The requested session <code className="text-zinc-200 font-mono bg-secondary px-1.5 py-0.5 rounded border border-border/60">{sessionId}</code> does not exist. During Phase 1 Milestone 1.6, the environment operates in deterministic demo mode under session <code className="text-zinc-200 font-mono bg-secondary px-1.5 py-0.5 rounded border border-border/60">{DEMO_SESSION_ID}</code>.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href={`/app/workspace/${DEMO_SESSION_ID}`}
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "gap-1.5 font-medium shadow-sm h-9 px-4 text-xs",
            })}
          >
            <PlayCircle className="size-3.5" />
            <span>Open Demo Workspace ({DEMO_SESSION_ID})</span>
          </Link>

          <Link
            href="/app/challenges"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "gap-1.5 font-medium h-9 px-4 text-xs",
            })}
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Challenges</span>
          </Link>
        </div>
      </div>
    );
  }

  return <WorkspaceLayout sessionId={sessionId} key={sessionId} />;
}

