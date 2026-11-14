"use client";

import React, { useState, useMemo, useEffect, useRef, useSyncExternalStore } from "react";
import {
  INITIAL_WORKSPACE_FILES,
  WORKSPACE_FILE_TREE,
  DEMO_SESSION_ID,
  type WorkspaceFile,
} from "@/data/workspace";
import {
  saveWorkspaceState,
  getInitialWorkspaceState,
  clearWorkspaceState,
  type PersistedDocumentState,
} from "@/lib/workspace-storage";
import { OFFICIAL_CHALLENGES } from "@/data/challenges";
import {
  isSessionSubmitted,
  getStoredSubmission,
  subscribeToSubmissionChanges,
  clearClientSubmission,
} from "@/data/assessment";
import { WorkspaceToolbar } from "./workspace-toolbar";
import { WorkspaceActivityBar } from "./workspace-activity-bar";
import { WorkspaceFileExplorer } from "./workspace-file-explorer";
import { WorkspaceEditor, type EditorTab } from "./workspace-editor";
import { WorkspaceBottomDock, type BottomDockTab } from "./workspace-bottom-dock";
import { WorkspaceProblemPanel } from "./workspace-problem-panel";
import { WorkspaceAiAssistant } from "./workspace-ai-assistant";
import { WorkspaceSubmissionDialog } from "./workspace-submission-dialog";
import {
  executeSimulatedTests,
  parsePytestCases,
  type TestExecutionResult,
} from "@/lib/test-runner";
import { type TestScenarioId } from "@/data/test-fixtures";
import { Files, Code2, Terminal as TerminalIcon, CheckSquare, BookOpen, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentState = PersistedDocumentState;

interface WorkspaceLayoutProps {
  sessionId?: string;
}

export function WorkspaceLayout({ sessionId }: WorkspaceLayoutProps) {
  const targetSessionId = sessionId || DEMO_SESSION_ID;

  // Challenge reference (CI-001 for demo session)
  const challenge = OFFICIAL_CHALLENGES[0];

  // Hydration indicator: false during SSR and initial HTML mount, true once hydrated on client.
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Authoritative submission state subscribed to storage changes (Requirement 1)
  const isSubmitted = useSyncExternalStore(
    subscribeToSubmissionChanges,
    () => isSessionSubmitted(targetSessionId),
    () => false
  );

  const submissionRecord = useMemo(() => {
    if (!isSubmitted) return null;
    return getStoredSubmission(targetSessionId);
  }, [isSubmitted, targetSessionId]);

  // Centralized in-memory document state keyed by file path.
  const [documents, setDocuments] = useState<Record<string, DocumentState>>(() => {
    return getInitialWorkspaceState(targetSessionId).documents;
  });

  // Open tabs list (array of file paths)
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(() => {
    return getInitialWorkspaceState(targetSessionId).openFilePaths;
  });

  // Active file path
  const [activeFilePath, setActiveFilePath] = useState<string | null>(() => {
    return getInitialWorkspaceState(targetSessionId).activeFilePath;
  });

  // Keep a ref to the latest state to allow synchronous flushing without stale closures
  const latestStateRef = useRef({ documents, openFilePaths, activeFilePath });
  useEffect(() => {
    latestStateRef.current = { documents, openFilePaths, activeFilePath };
  }, [documents, openFilePaths, activeFilePath]);

  // Debounced Autosave: Automatically save complete document buffer to localStorage
  useEffect(() => {
    if (!isHydrated || isSubmitted) return;

    const timer = setTimeout(() => {
      saveWorkspaceState(targetSessionId, {
        documents,
        openFilePaths,
        activeFilePath,
      });
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [documents, openFilePaths, activeFilePath, isHydrated, targetSessionId, isSubmitted]);

  // Page Lifecycle: Flush changes synchronously on beforeunload, pagehide, or unmount
  useEffect(() => {
    if (!isHydrated || isSubmitted) return;

    const handleFlush = () => {
      saveWorkspaceState(targetSessionId, latestStateRef.current);
    };

    window.addEventListener("beforeunload", handleFlush);
    window.addEventListener("pagehide", handleFlush);

    return () => {
      window.removeEventListener("beforeunload", handleFlush);
      window.removeEventListener("pagehide", handleFlush);
      handleFlush();
    };
  }, [isHydrated, targetSessionId, isSubmitted]);

  // Derive active WorkspaceFile combining metadata with latest document content
  const activeFile: WorkspaceFile | null = useMemo(() => {
    if (!activeFilePath) return null;
    const fileMeta = INITIAL_WORKSPACE_FILES[activeFilePath];
    if (!fileMeta) return null;
    const docState = documents[activeFilePath];
    return {
      ...fileMeta,
      content: docState ? docState.content : fileMeta.content,
    };
  }, [activeFilePath, documents]);

  // Derive editor tabs combining tab metadata with isModified state
  const tabs: EditorTab[] = useMemo(() => {
    return openFilePaths.map((path) => {
      const fileMeta = INITIAL_WORKSPACE_FILES[path];
      const docState = documents[path];
      return {
        path,
        name: fileMeta?.name || path.split("/").pop() || path,
        isModified: docState?.isModified || false,
      };
    });
  }, [openFilePaths, documents]);

  // Desktop panel collapse states
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [problemPanelOpen, setProblemPanelOpen] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // Bottom dock active tab ("terminal" | "tests")
  const [activeBottomTab, setActiveBottomTab] = useState<BottomDockTab>("terminal");

  // Test Runner State (Milestone 1.7)
  const [selectedScenario, setSelectedScenario] = useState<TestScenarioId>("initial-defects");
  const [testResult, setTestResult] = useState<TestExecutionResult | null>(null);
  const [terminalStream, setTerminalStream] = useState<string>("");
  const cancelRunnerRef = useRef<(() => void) | null>(null);

  // Submission Flow State (Milestone 1.8)
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

  // Calculate count of modified files
  const modifiedFilesCount = useMemo(() => {
    return Object.values(documents).filter((d) => d.isModified).length;
  }, [documents]);

  // Set of modified file paths for visual explorer indicators
  const modifiedFilePaths = useMemo(() => {
    const set = new Set<string>();
    Object.entries(documents).forEach(([filePath, doc]) => {
      if (doc.isModified) {
        set.add(filePath);
      }
    });
    return set;
  }, [documents]);

  // Mobile view selector: "editor" | "files" | "terminal" | "tests" | "problem" | "assistant"
  const [mobileView, setMobileView] = useState<
    "editor" | "files" | "terminal" | "tests" | "problem" | "assistant"
  >("editor");

  // Clean up any in-flight execution on component unmount
  useEffect(() => {
    return () => {
      if (cancelRunnerRef.current) {
        cancelRunnerRef.current();
      }
    };
  }, []);

  // Track authoritative file revisions to enforce optimistic concurrency control
  const fileRevisionsRef = useRef<Record<string, number>>({});

  // Function to refresh documents from backend disk workspace
  const refreshBackendFiles = React.useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/workspace/${targetSessionId}/files`);
      if (res.ok) {
        const data = await res.json();
        if (data.documents) {
          setDocuments((prev) => {
            const updated = { ...prev };
            for (const [path, doc] of Object.entries<{ content: string; revision?: number }>(data.documents)) {
              if (typeof doc.revision === "number") {
                fileRevisionsRef.current[path] = doc.revision;
              }
              const original = INITIAL_WORKSPACE_FILES[path]?.content ?? "";
              updated[path] = {
                content: doc.content,
                isModified: doc.content !== original,
              };
            }
            return updated;
          });
        }
      }
    } catch {
      // Backend not yet ready or offline
    }
  }, [targetSessionId]);

  // Initialize workspace on backend mount
  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/workspace/${targetSessionId}/init`, { method: "POST" })
      .then(() => refreshBackendFiles())
      .catch(() => {});
  }, [targetSessionId, refreshBackendFiles]);

  // Handler: Full session reset (clears submission lock and resets workspace storage)
  const handleResetSession = React.useCallback(async () => {
    try {
      clearClientSubmission(targetSessionId);
      clearWorkspaceState(targetSessionId);
      await fetch(`http://localhost:8000/api/v1/workspace/${targetSessionId}/reset`, { method: "POST" });
      await refreshBackendFiles();
    } catch {
      clearClientSubmission(targetSessionId);
      clearWorkspaceState(targetSessionId);
      await refreshBackendFiles();
    }
  }, [targetSessionId, refreshBackendFiles]);

  // Handler: Execute tests via real backend runner or fallback simulation
  const handleRunTests = async () => {
    if (isSubmitted) {
      console.warn(`[Codevo] Test execution rejected: workspace session "${targetSessionId}" is submitted and locked.`);
      return;
    }
    if (testResult?.status === "running") return;

    // Open bottom dock and switch to tests tab
    setDockOpen(true);
    setActiveBottomTab("tests");
    if (mobileView === "files" || mobileView === "problem") {
      setMobileView("tests");
    }

    setTerminalStream("Connecting to isolated test runner...\nExecuting: pytest -v /trusted_tests/test_ci001_trusted.py\n\n");
    const runStartTime = Date.now();
    setTestResult({
      scenarioId: selectedScenario,
      status: "running",
      passedCount: 0,
      failedCount: 0,
      totalCount: 6,
      durationMs: 0,
      testCases: [],
      rawLogs: ["Connecting to isolated test runner..."],
      startedAt: runStartTime,
    });

    try {
      const res = await fetch(`http://localhost:8000/api/v1/runner/${targetSessionId}/run`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const logs = data.stdout || data.stderr || "No test output returned.";
        setTerminalStream(logs);
        const parsedCases = parsePytestCases(logs);
        const passedCount = typeof data.passed_tests === "number" ? data.passed_tests : (data.passed ? 6 : 0);
        const totalCount = typeof data.total_tests === "number" ? data.total_tests : 6;
        const durationMs = typeof data.duration_seconds === "number" ? Math.round(data.duration_seconds * 1000) : 1000;
        setTestResult({
          scenarioId: selectedScenario,
          status: data.passed ? "passed" : "failed",
          passedCount,
          failedCount: Math.max(0, totalCount - passedCount),
          totalCount,
          durationMs,
          testCases: parsedCases,
          rawLogs: logs.split("\n"),
          startedAt: runStartTime,
          completedAt: Date.now(),
        });
        return;
      }
    } catch (err) {
      console.warn("[Codevo] Backend runner offline, falling back to simulated suite:", err);
    }

    setTerminalStream("");

    const cancel = executeSimulatedTests(selectedScenario, {
      onProgress: (state, newText) => {
        setTestResult(state);
        if (newText) {
          setTerminalStream(newText);
        }
      },
      onComplete: (finalState) => {
        setTestResult(finalState);
        cancelRunnerRef.current = null;
      },
    });

    cancelRunnerRef.current = cancel;
  };

  // Handler: Cancel simulated tests
  const handleCancelTests = () => {
    if (cancelRunnerRef.current) {
      cancelRunnerRef.current();
      cancelRunnerRef.current = null;
    }
  };

  // Handler: Selecting a file from the explorer
  const handleSelectFile = (file: WorkspaceFile) => {
    setActiveFilePath(file.path);
    setOpenFilePaths((prev) => (prev.includes(file.path) ? prev : [...prev, file.path]));
    setMobileView("editor");
  };

  // Handler: Switching active tab
  const handleSelectTab = (filePath: string) => {
    setActiveFilePath(filePath);
  };

  // Handler: Closing a tab (removes only the tab, preserving document edits)
  const handleCloseTab = (filePath: string) => {
    setOpenFilePaths((prev) => {
      const remaining = prev.filter((p) => p !== filePath);
      if (activeFilePath === filePath) {
        setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
      return remaining;
    });
  };

  // Handler: Editing code in Monaco (updates centralized document state)
  const handleContentChange = (filePath: string, newContent: string) => {
    if (isSubmitted) {
      console.warn(`[Codevo] Content modification rejected: workspace session "${targetSessionId}" is submitted and locked.`);
      return;
    }

    const originalContent = INITIAL_WORKSPACE_FILES[filePath]?.content ?? "";
    const isModified = newContent !== originalContent;

    setDocuments((prev) => ({
      ...prev,
      [filePath]: {
        content: newContent,
        isModified,
      },
    }));

    // Debounced sync to backend workspace storage with optimistic revision concurrency
    const currentBaseRevision = fileRevisionsRef.current[filePath] ?? 1;

    fetch(`http://localhost:8000/api/v1/workspace/${targetSessionId}/files`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: filePath,
        content: newContent,
        base_revision: currentBaseRevision,
      }),
    })
      .then(async (res) => {
        if (res.status === 409) {
          // Stale edit conflict: Agent or backend modified file concurrently
          const conflict = await res.json().catch(() => ({}));
          console.warn("[Codevo] Revision conflict on save (newer Agent change detected):", conflict);
          // Refresh authoritative backend state to prevent stale overwrite
          await refreshBackendFiles();
        } else if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (typeof resData.revision === "number") {
            fileRevisionsRef.current[filePath] = resData.revision;
          }
        }
      })
      .catch(() => {});
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090B] text-foreground overflow-hidden select-none">
      {/* 1. Top IDE Toolbar */}
      <WorkspaceToolbar
        challenge={challenge}
        sessionId={sessionId}
        testStatus={testResult?.status || "idle"}
        onRunTests={handleRunTests}
        onCancelTests={handleCancelTests}
        selectedScenario={selectedScenario}
        onSelectScenario={setSelectedScenario}
        isSubmitted={isSubmitted}
        submissionId={submissionRecord?.submissionId}
        onSubmit={() => setSubmissionDialogOpen(true)}
        onResetSession={handleResetSession}
      />

      {/* 2. Mobile View Switcher (Visible on < md screens) */}
      <div className="flex md:hidden items-center justify-between h-9 px-2 bg-[#09090B] border-b border-border/50 text-xs shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobileView("files")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono",
              mobileView === "files" ? "bg-white/[0.08] text-foreground font-semibold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Files className="size-3" />
            <span>Files</span>
          </button>

          <button
            onClick={() => setMobileView("editor")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono",
              mobileView === "editor" ? "bg-white/[0.08] text-foreground font-semibold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Code2 className="size-3" />
            <span>Editor</span>
          </button>

          <button
            onClick={() => {
              setMobileView("tests");
              setActiveBottomTab("tests");
              setDockOpen(true);
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono",
              mobileView === "tests" ? "bg-white/[0.08] text-foreground font-semibold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <CheckSquare className="size-3" />
            <span>Tests</span>
          </button>

          <button
            onClick={() => {
              setMobileView("terminal");
              setActiveBottomTab("terminal");
              setDockOpen(true);
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono",
              mobileView === "terminal" ? "bg-white/[0.08] text-foreground font-semibold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <TerminalIcon className="size-3" />
            <span>Term</span>
          </button>

          <button
            onClick={() => setMobileView("problem")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono",
              mobileView === "problem" ? "bg-white/[0.08] text-foreground font-semibold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <BookOpen className="size-3" />
            <span>Briefing</span>
          </button>

          <button
            onClick={() => setMobileView("assistant")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono",
              mobileView === "assistant" ? "bg-white/[0.08] text-foreground font-semibold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Bot className="size-3" />
            <span>AI</span>
          </button>
        </div>
      </div>

      {/* 3. Main IDE Work Area */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {/* Activity Bar (Desktop/Tablet) */}
        <WorkspaceActivityBar
          explorerOpen={explorerOpen}
          onToggleExplorer={() => setExplorerOpen(!explorerOpen)}
          problemPanelOpen={problemPanelOpen}
          onToggleProblemPanel={() => setProblemPanelOpen(!problemPanelOpen)}
          terminalOpen={dockOpen}
          onToggleTerminal={() => setDockOpen(!dockOpen)}
          aiAssistantOpen={aiAssistantOpen}
          onToggleAiAssistant={() => setAiAssistantOpen(!aiAssistantOpen)}
          className="hidden md:flex"
        />

        {/* File Explorer (Desktop: collapsible; Mobile: conditional) */}
        <div
          className={cn(
            "h-full shrink-0",
            // Desktop
            "hidden md:block",
            !explorerOpen && "md:hidden",
            // Mobile
            mobileView === "files" && "block! w-full! md:w-56! md:block"
          )}
        >
          <WorkspaceFileExplorer
            tree={WORKSPACE_FILE_TREE}
            activeFilePath={activeFile?.path || ""}
            onSelectFile={handleSelectFile}
            modifiedFilePaths={modifiedFilePaths}
            className="w-full md:w-56 lg:w-60"
          />
        </div>

        {/* Center Canvas: Editor + Bottom Dock */}
        <div
          className={cn(
            "flex-1 flex flex-col h-full min-w-0 overflow-hidden",
            // Mobile visibility
            mobileView !== "editor" && mobileView !== "terminal" && mobileView !== "tests" && "hidden md:flex"
          )}
        >
          {/* Editor Area */}
          <div
            className={cn(
              "flex-1 min-h-0 w-full select-text",
              // Mobile view switch
              (mobileView === "terminal" || mobileView === "tests") && "hidden md:block"
            )}
          >
            {isHydrated ? (
              <WorkspaceEditor
                tabs={tabs}
                activeFile={activeFile}
                onSelectTab={handleSelectTab}
                onCloseTab={handleCloseTab}
                onContentChange={handleContentChange}
                originalContent={activeFile ? INITIAL_WORKSPACE_FILES[activeFile.path]?.content : undefined}
                readOnly={isSubmitted}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-[#09090B] text-zinc-500 font-mono text-xs select-none">
                <div className="animate-pulse">Loading workspace session...</div>
              </div>
            )}
          </div>

          {/* Bottom Dock (Terminal + Test Results) */}
          {dockOpen && (
            <div
              className={cn(
                "h-56 lg:h-72 shrink-0 w-full",
                // Mobile view switch
                (mobileView === "terminal" || mobileView === "tests") ? "block! h-full!" : "hidden md:block"
              )}
            >
              <WorkspaceBottomDock
                activeTab={activeBottomTab}
                onSelectTab={setActiveBottomTab}
                onClose={() => setDockOpen(false)}
                testResult={testResult}
                onRunTests={handleRunTests}
                onCancelTests={handleCancelTests}
                terminalStream={terminalStream}
                isSubmitted={isSubmitted}
              />
            </div>
          )}
        </div>

        {/* Problem Briefing Panel (Desktop: collapsible right; Mobile: view-switched) */}
        <div
          className={cn(
            "h-full shrink-0",
            // Desktop
            "hidden lg:block",
            !problemPanelOpen && "lg:hidden",
            // Mobile
            mobileView === "problem" && "block! w-full! lg:w-80! lg:block"
          )}
        >
          <WorkspaceProblemPanel
            challengeId={challenge.id}
            onClose={() => setProblemPanelOpen(false)}
            className="w-full lg:w-80 xl:w-96"
          />
        </div>

        {/* AI Assistant Drawer (Overlay on right side) */}
        <div
          className={cn(
            "h-full shrink-0",
            // Desktop overlay
            !aiAssistantOpen && "hidden",
            // Mobile view switch
            mobileView === "assistant" && "block! w-full! md:w-80! lg:w-96!"
          )}
        >
          <WorkspaceAiAssistant
            isOpen={aiAssistantOpen || mobileView === "assistant"}
            onClose={() => {
              setAiAssistantOpen(false);
              if (mobileView === "assistant") setMobileView("editor");
            }}
            sessionId={targetSessionId}
            onFilesChanged={refreshBackendFiles}
            onTestExecuted={(output, passed) => {
              setTerminalStream(output);
              const parsedCases = parsePytestCases(output);
              const totalCount = parsedCases.length > 0 ? parsedCases.length : 6;
              const passedCount = parsedCases.length > 0
                ? parsedCases.filter((c) => c.status === "passed").length
                : (passed ? 6 : 0);
              setTestResult({
                scenarioId: selectedScenario,
                status: passed ? "passed" : "failed",
                passedCount,
                failedCount: totalCount - passedCount,
                totalCount,
                durationMs: 2750,
                testCases: parsedCases,
                rawLogs: output.split("\n"),
                startedAt: Date.now() - 2750,
                completedAt: Date.now(),
              });
              setDockOpen(true);
              setActiveBottomTab("tests");
            }}
            className="w-full md:w-80 lg:w-96"
          />
        </div>
      </div>

      {/* 4. Candidate Submission Dialog (Milestone 1.8) */}
      <WorkspaceSubmissionDialog
        isOpen={submissionDialogOpen}
        onClose={() => setSubmissionDialogOpen(false)}
        challenge={challenge}
        sessionId={targetSessionId}
        modifiedFilesCount={modifiedFilesCount}
        documents={documents}
      />
    </div>
  );
}
