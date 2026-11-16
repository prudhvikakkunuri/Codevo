"use client";

import React, { useState } from "react";
import {
  Bot,
  X,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  FileCode2,
  ChevronDown,
  ChevronRight,
  Terminal,
  MessageSquare,
  Sparkles,
  Shield,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BACKEND_API_URL } from "@/lib/supabase";

export interface AgentEvent {
  event_type:
    | "thinking"
    | "message"
    | "tool_call"
    | "tool_result"
    | "file_edit"
    | "test_result"
    | "completed"
    | "error";
  content?: string;
  data?: Record<string, unknown>;
}

export interface ChatEntry {
  id: string;
  sender: "user" | "agent";
  text?: string;
  events?: AgentEvent[];
  timestamp: string;
  mode?: "chat" | "agent";
}

interface WorkspaceAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  sessionId?: string;
  onFilesChanged?: () => void;
  onTestExecuted?: (output: string, passed: boolean) => void;
}

/** Formatted text and syntax-highlighted code block component for Chat Mode */
function FormattedMessage({ text }: { text: string }) {
  if (!text) return null;

  // Split content on triple backtick markdown code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const firstLine = lines[0].trim();
          const language = /^[a-zA-Z0-9_-]+$/.test(firstLine) ? firstLine : "";
          const code = language ? lines.slice(1).join("\n") : lines.join("\n");

          return (
            <div
              key={idx}
              className="rounded-md border border-border/70 bg-[#070709] overflow-hidden my-2.5 font-mono select-text"
            >
              <div className="flex items-center justify-between px-3 py-1 bg-zinc-950/80 border-b border-border/40 text-[10px] text-zinc-400">
                <span className="font-semibold text-zinc-300">{language || "code"}</span>
                <span className="text-zinc-600 uppercase text-[9px]">Read-Only Suggestion</span>
              </div>
              <pre className="p-2.5 text-[11px] text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-wrap select-text">
            {part}
          </p>
        );
      })}
    </div>
  );
}

export function WorkspaceAiAssistant({
  isOpen,
  onClose,
  className,
  sessionId = "ci-001-demo",
  onFilesChanged,
  onTestExecuted,
}: WorkspaceAiAssistantProps) {
  const [activeMode, setActiveMode] = useState<"chat" | "agent">("agent");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});

  // Separate conversation history for Chat Mode
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([
    {
      id: "chat-init",
      sender: "agent",
      mode: "chat",
      text: "Welcome to Chat Mode. I'm your pair programming assistant. In this mode, I explain code architecture, analyze bugs, and provide code guidance without making file edits or running tests.",
      timestamp: "Just now",
    },
  ]);

  // Separate conversation history for Agent Mode
  const [agentHistory, setAgentHistory] = useState<ChatEntry[]>([
    {
      id: "agent-init",
      sender: "agent",
      mode: "agent",
      text: "Welcome to Agent Mode. I have bounded tool permissions to inspect code, apply patches, and run containerized Docker tests on CI-001.",
      timestamp: "Just now",
    },
  ]);

  const chatSuggestedPrompts = [
    "Explain the bug in app/utils/security.py.",
    "Why does duplicate registration need HTTP 409 Conflict?",
    "How should missing-user errors be sanitized in authenticate_user?",
    "What is the recommended Argon2id password verification flow?",
  ];

  const agentSuggestedPrompts = [
    "Fix duplicate registration handling and password verification, then run tests.",
    "Patch app/utils/security.py to fix inverted verify_password.",
    "Run tests and summarize which assertions are failing.",
  ];

  const toggleDiff = (id: string) => {
    setExpandedDiffs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");
    const isChat = activeMode === "chat";

    const currentHistory = isChat ? chatHistory : agentHistory;
    const msgIndex = currentHistory.length + 1;
    const userMsg: ChatEntry = {
      id: `user-${isChat ? "chat" : "agent"}-${msgIndex}`,
      sender: "user",
      text,
      mode: activeMode,
      timestamp: "Just now",
    };

    if (isChat) {
      setChatHistory((prev) => [...prev, userMsg]);
    } else {
      setAgentHistory((prev) => [...prev, userMsg]);
    }

    setIsLoading(true);

    try {
      const endpoint = isChat
        ? `${BACKEND_API_URL}/api/v1/agent/${sessionId}/chat`
        : `${BACKEND_API_URL}/api/v1/agent/${sessionId}/run`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const data = await response.json();

      if (isChat) {
        // Chat Mode: conversational response only
        const agentMsg: ChatEntry = {
          id: `agent-chat-${msgIndex + 1}`,
          sender: "agent",
          mode: "chat",
          text: data.message || "I have analyzed your request.",
          timestamp: "Just now",
        };
        setChatHistory((prev) => [...prev, agentMsg]);
      } else {
        // Agent Mode: autonomous execution with tool events
        const events: AgentEvent[] = data.events || [];
        const filesModified: string[] = data.files_modified || [];

        // Notify parent layout if files were modified
        if (filesModified.length > 0) {
          onFilesChanged?.();
        }

        // Notify parent dock if tests ran
        for (const ev of events) {
          if (ev.event_type === "test_result") {
            const stdout = typeof ev.data?.stdout === "string" ? ev.data.stdout : "";
            const passed = Boolean(ev.data?.passed);
            onTestExecuted?.(stdout, passed);
          }
        }

        const agentMsg: ChatEntry = {
          id: `agent-agent-${msgIndex + 1}`,
          sender: "agent",
          mode: "agent",
          text: data.passed
            ? "All 6 trusted integration tests are passing in Docker! The CI-001 challenge defects have been resolved."
            : "Execution cycle finished. Review tool actions and test execution cards below.",
          events,
          timestamp: "Just now",
        };
        setAgentHistory((prev) => [...prev, agentMsg]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errMsg: ChatEntry = {
        id: `error-${msgIndex + 2}`,
        sender: "agent",
        mode: activeMode,
        text: `Error contacting assistant: ${errorMsg}. Please ensure the backend is running.`,
        timestamp: "Just now",
      };
      if (isChat) {
        setChatHistory((prev) => [...prev, errMsg]);
      } else {
        setAgentHistory((prev) => [...prev, errMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentDisplayHistory = activeMode === "chat" ? chatHistory : agentHistory;
  const currentSuggestedPrompts = activeMode === "chat" ? chatSuggestedPrompts : agentSuggestedPrompts;

  return (
    <aside
      aria-label="AI Assistant"
      className={cn(
        "w-80 lg:w-[420px] h-full flex flex-col bg-[#0A0A0D] border-l border-border/50 shadow-2xl z-30 select-none overflow-hidden shrink-0",
        className
      )}
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between h-10 px-3.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          {activeMode === "chat" ? (
            <MessageSquare className="size-4 text-cyan-400" />
          ) : (
            <Bot className="size-4 text-emerald-400" />
          )}
          <span className="text-xs font-semibold text-foreground">
            {activeMode === "chat" ? "Chat Assistant" : "AI Coding Agent"}
          </span>
          <span
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded border",
              activeMode === "chat"
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            )}
          >
            {activeMode === "chat" ? "Read-Only Advisor" : "Tools Enabled"}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close AI Assistant drawer"
          className="size-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* 2. Distinct Mode Selector */}
      <div className="p-2 border-b border-border/40 bg-[#09090B] shrink-0">
        <div className="grid grid-cols-2 p-0.5 bg-[#121215] rounded-md border border-border/50 text-xs font-mono">
          <button
            onClick={() => setActiveMode("chat")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded text-center transition-all cursor-pointer",
              activeMode === "chat"
                ? "bg-[#1C1C22] text-cyan-300 font-semibold shadow-xs border border-cyan-800/40"
                : "text-zinc-400 hover:text-foreground"
            )}
          >
            <Sparkles className="size-3" />
            <span>Chat Mode</span>
          </button>
          <button
            onClick={() => setActiveMode("agent")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 rounded text-center transition-all cursor-pointer",
              activeMode === "agent"
                ? "bg-[#18181B] text-emerald-300 font-semibold shadow-xs border border-emerald-800/40"
                : "text-zinc-400 hover:text-foreground"
            )}
          >
            <Wrench className="size-3" />
            <span>Agent Mode</span>
          </button>
        </div>

        {/* Mode Explanatory Pill */}
        <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>
            {activeMode === "chat"
              ? "Explains code, answers questions & suggests snippets."
              : "Autonomously inspects code, applies patches & runs tests."}
          </span>
          <span className="shrink-0 flex items-center gap-1 text-zinc-400">
            {activeMode === "chat" ? (
              <Shield className="size-2.5 text-cyan-400" />
            ) : (
              <Terminal className="size-2.5 text-emerald-400" />
            )}
            <span>{activeMode === "chat" ? "No write tools" : "Docker active"}</span>
          </span>
        </div>
      </div>

      {/* 3. Messages / Timeline Stream Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-4 text-xs">
        {currentDisplayHistory.map((entry) => {
          const isUser = entry.sender === "user";
          return (
            <div
              key={entry.id}
              className={cn("flex flex-col space-y-1.5", isUser ? "items-end" : "items-start")}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <span>{isUser ? "Candidate" : activeMode === "chat" ? "Chat Assistant" : "AI Agent"}</span>
                <span>•</span>
                <span>{entry.timestamp}</span>
              </div>

              <div
                className={cn(
                  "rounded-lg p-3 max-w-[95%] text-xs leading-relaxed",
                  isUser
                    ? "bg-zinc-800 border border-zinc-700 text-zinc-100"
                    : activeMode === "chat"
                    ? "bg-[#111115] border border-cyan-900/30 text-zinc-200"
                    : "bg-secondary/20 border border-border/50 text-zinc-300"
                )}
              >
                {/* Formatted Text Content */}
                {entry.text && (
                  <FormattedMessage text={entry.text} />
                )}

                {/* Event Timeline (Agent Mode Only) */}
                {activeMode === "agent" && entry.events && entry.events.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border/40 space-y-2">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase font-semibold block">
                      Execution Timeline
                    </span>

                    {entry.events.map((ev, i) => {
                      const eventKey = `${entry.id}-ev-${i}`;
                      if (ev.event_type === "thinking") {
                        return (
                          <div
                            key={eventKey}
                            className="rounded bg-black/40 border border-border/40 p-2 text-[11px] text-zinc-400 font-mono"
                          >
                            <span className="text-emerald-400 font-semibold block text-[10px] uppercase">
                              Agent Reasoning
                            </span>
                            <p className="mt-0.5 text-zinc-300 whitespace-pre-wrap">{ev.content}</p>
                          </div>
                        );
                      }

                      if (ev.event_type === "file_edit") {
                        const isExpanded = !!expandedDiffs[eventKey];
                        const diffContent =
                          typeof ev.data?.diff === "string" ? ev.data.diff : null;
                        return (
                          <div
                            key={eventKey}
                            className="rounded border border-border/50 bg-secondary/30 p-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-200">
                                <FileCode2 className="size-3.5 text-blue-400" />
                                <span>{ev.content}</span>
                              </div>
                              {diffContent && (
                                <button
                                  onClick={() => toggleDiff(eventKey)}
                                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 font-mono cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="size-3" />
                                  ) : (
                                    <ChevronRight className="size-3" />
                                  )}
                                  <span>{isExpanded ? "Hide diff" : "View diff"}</span>
                                </button>
                              )}
                            </div>
                            {isExpanded && diffContent && (
                              <pre className="mt-2 p-2 rounded bg-black/80 text-[10px] font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                                {diffContent}
                              </pre>
                            )}
                          </div>
                        );
                      }

                      if (ev.event_type === "test_result") {
                        const passed = Boolean(ev.data?.passed);
                        const passedTests = String(ev.data?.passed_tests ?? 0);
                        const totalTests = String(ev.data?.total_tests ?? 0);
                        const durationSecs = String(ev.data?.duration_seconds ?? 0);
                        return (
                          <div
                            key={eventKey}
                            className="rounded border border-border/50 bg-secondary/30 p-2 text-xs"
                          >
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              {passed ? (
                                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="size-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className={passed ? "text-emerald-300" : "text-rose-300"}>
                                {passed ? "Trusted Tests Passed" : "Tests Failed"} ({passedTests}/{totalTests} passed in {durationSecs}s)
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (ev.event_type === "tool_call") {
                        return (
                          <div
                            key={eventKey}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400"
                          >
                            <Terminal className="size-3 text-zinc-500" />
                            <span>{ev.content}</span>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20 text-xs text-zinc-400 font-mono">
            <Loader2 className="size-4 animate-spin text-emerald-400" />
            <span>
              {activeMode === "chat"
                ? "Formulating technical response..."
                : "Agent inspecting code and executing tools..."}
            </span>
          </div>
        )}

        {/* Suggested Prompts */}
        {currentDisplayHistory.length <= 2 && (
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
              {activeMode === "chat" ? "Suggested Questions" : "One-Click Action Prompts"}
            </span>
            <div className="space-y-1.5">
              {currentSuggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  disabled={isLoading}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left p-2 rounded-md border border-border/50 bg-secondary/20 hover:bg-white/[0.04] text-[11px] text-zinc-300 transition-colors leading-snug cursor-pointer disabled:opacity-50"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Input Box */}
      <div className="p-3 border-t border-border/50 bg-[#09090B] space-y-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={
              isLoading
                ? "Processing..."
                : activeMode === "chat"
                ? "Ask a technical question about the challenge..."
                : "Ask agent to debug or fix code..."
            }
            className="w-full h-9 pl-3 pr-9 rounded-md border border-border/60 bg-secondary/30 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
            className="absolute right-2 size-6 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Groq gpt-oss-120b</span>
          <span>
            {activeMode === "chat"
              ? "Read-Only Advisory Mode"
              : "Docker / Isolated Runner Active"}
          </span>
        </div>
      </div>
    </aside>
  );
}
