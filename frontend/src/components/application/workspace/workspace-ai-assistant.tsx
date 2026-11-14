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
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentEvent {
  event_type: "thinking" | "message" | "tool_call" | "tool_result" | "file_edit" | "test_result" | "completed" | "error";
  content?: string;
  data?: Record<string, unknown>;
}

export interface ChatEntry {
  id: string;
  sender: "user" | "agent";
  text?: string;
  events?: AgentEvent[];
  timestamp: string;
}

interface WorkspaceAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  sessionId?: string;
  onFilesChanged?: () => void;
  onTestExecuted?: (output: string, passed: boolean) => void;
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
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([
    {
      id: "initial-msg",
      sender: "agent",
      text: "Welcome to CI-001. I'm connected to the live FastAPI backend powered by Groq. Ask me to inspect defects, edit files, or run tests.",
      timestamp: "Just now",
    },
  ]);
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});

  const suggestedPrompts = [
    "Fix duplicate registration handling and password verification, then run tests.",
    "Explain the bug in app/utils/security.py.",
    "Run tests and tell me which assertions are currently failing.",
  ];

  const toggleDiff = (id: string) => {
    setExpandedDiffs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");
    const msgIndex = chatHistory.length + 1;
    const userMsg: ChatEntry = {
      id: `user-${msgIndex}`,
      sender: "user",
      text,
      timestamp: "Just now",
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/agent/${sessionId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const data = await response.json();
      const events: AgentEvent[] = data.events || [];

      // Check if files were modified to trigger Monaco refresh
      if (data.files_modified && data.files_modified.length > 0) {
        onFilesChanged?.();
      }

      // Check if tests were executed to update bottom dock
      if (data.final_output) {
        onTestExecuted?.(data.final_output, data.passed);
      }

      const agentMsg: ChatEntry = {
        id: `agent-${msgIndex + 1}`,
        sender: "agent",
        text: data.passed
          ? "All integration tests are now passing! The CI-001 challenge defects have been resolved."
          : "Execution cycle finished. Review the tool output and test results below.",
        events,
        timestamp: "Just now",
      };

      setChatHistory((prev) => [...prev, agentMsg]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `error-${msgIndex + 2}`,
          sender: "agent",
          text: `Error contacting backend agent: ${errorMsg}. Ensure backend is running on http://localhost:8000.`,
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="AI Assistant"
      className={cn(
        "w-80 lg:w-[420px] h-full flex flex-col bg-[#0A0A0D] border-l border-border/50 shadow-2xl z-30 select-none overflow-hidden shrink-0",
        className
      )}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between h-10 px-3.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">AI Assistant</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            Groq Connected
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close AI assistant"
          className="size-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="p-2 border-b border-border/40 shrink-0">
        <div className="grid grid-cols-2 p-0.5 rounded-md bg-secondary/50 border border-border/60 text-xs font-medium">
          <button
            onClick={() => setActiveMode("chat")}
            className={cn(
              "py-1 rounded text-center transition-colors",
              activeMode === "chat"
                ? "bg-[#18181B] text-foreground font-semibold shadow-xs"
                : "text-zinc-400 hover:text-foreground"
            )}
          >
            Chat Mode
          </button>
          <button
            onClick={() => setActiveMode("agent")}
            className={cn(
              "py-1 rounded text-center transition-colors",
              activeMode === "agent"
                ? "bg-[#18181B] text-foreground font-semibold shadow-xs"
                : "text-zinc-400 hover:text-foreground"
            )}
          >
            Agent Mode
          </button>
        </div>
      </div>

      {/* Messages / Timeline Stream Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {chatHistory.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "flex flex-col space-y-1.5",
              entry.sender === "user" ? "items-end" : "items-start"
            )}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
              <span>{entry.sender === "user" ? "Candidate" : "Agent"}</span>
              <span>•</span>
              <span>{entry.timestamp}</span>
            </div>

            <div
              className={cn(
                "rounded-lg p-2.5 max-w-[95%] text-xs leading-relaxed",
                entry.sender === "user"
                  ? "bg-zinc-800 border border-zinc-700 text-zinc-100"
                  : "bg-secondary/20 border border-border/50 text-zinc-300"
              )}
            >
              {entry.text && <p className="whitespace-pre-wrap">{entry.text}</p>}

              {/* Event Timeline */}
              {entry.events && entry.events.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/40 space-y-2">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase font-semibold block">
                    Execution Timeline
                  </span>

                  {entry.events.map((ev, i) => {
                    const eventKey = `${entry.id}-ev-${i}`;
                    if (ev.event_type === "thinking") {
                      return (
                        <div key={eventKey} className="rounded bg-black/40 border border-border/40 p-2 text-[11px] text-zinc-400 font-mono">
                          <span className="text-emerald-400 font-semibold block text-[10px] uppercase">Agent Reasoning</span>
                          <p className="mt-0.5 text-zinc-300 whitespace-pre-wrap">{ev.content}</p>
                        </div>
                      );
                    }

                    if (ev.event_type === "file_edit") {
                      const isExpanded = !!expandedDiffs[eventKey];
                      const diffContent = typeof ev.data?.diff === "string" ? ev.data.diff : null;
                      return (
                        <div key={eventKey} className="rounded border border-border/50 bg-secondary/30 p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-200">
                              <FileCode2 className="size-3.5 text-blue-400" />
                              <span>{ev.content}</span>
                            </div>
                            {diffContent && (
                              <button
                                onClick={() => toggleDiff(eventKey)}
                                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 font-mono"
                              >
                                {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
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
                        <div key={eventKey} className="rounded border border-border/50 bg-secondary/30 p-2 text-xs">
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
                        <div key={eventKey} className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
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
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20 text-xs text-zinc-400 font-mono">
            <Loader2 className="size-4 animate-spin text-emerald-400" />
            <span>Agent inspecting code and executing tools...</span>
          </div>
        )}

        {/* Suggested Prompts */}
        {chatHistory.length <= 2 && (
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
              One-Click Action Prompts
            </span>
            <div className="space-y-1.5">
              {suggestedPrompts.map((prompt) => (
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

      {/* Input Box */}
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
            placeholder={isLoading ? "Agent working..." : "Ask agent to debug or fix code..."}
            className="w-full h-9 pl-3 pr-9 rounded-md border border-border/60 bg-secondary/30 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
            className="absolute right-2 size-6 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
          >
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Groq gpt-oss-120b</span>
          <span>Docker / Isolated Runner Active</span>
        </div>
      </div>
    </aside>
  );
}
