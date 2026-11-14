"use client";

import React from "react";
import { Files, BookOpen, Terminal, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceActivityBarProps {
  explorerOpen: boolean;
  onToggleExplorer: () => void;
  problemPanelOpen: boolean;
  onToggleProblemPanel: () => void;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  aiAssistantOpen: boolean;
  onToggleAiAssistant: () => void;
  className?: string;
}

export function WorkspaceActivityBar({
  explorerOpen,
  onToggleExplorer,
  problemPanelOpen,
  onToggleProblemPanel,
  terminalOpen,
  onToggleTerminal,
  aiAssistantOpen,
  onToggleAiAssistant,
  className,
}: WorkspaceActivityBarProps) {
  return (
    <nav
      aria-label="Workspace activity bar"
      className={cn(
        "w-12 h-full flex flex-col justify-between items-center py-2 bg-[#09090B] border-r border-border/50 select-none shrink-0",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1">
        {/* Explorer Toggle */}
        <button
          onClick={onToggleExplorer}
          aria-label={explorerOpen ? "Collapse file explorer" : "Expand file explorer"}
          aria-pressed={explorerOpen}
          title="Explorer"
          className={cn(
            "size-9 rounded-md flex items-center justify-center transition-colors",
            explorerOpen
              ? "bg-white/[0.08] text-foreground font-semibold"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
          )}
        >
          <Files className="size-4.5" />
        </button>

        {/* Problem Briefing Toggle */}
        <button
          onClick={onToggleProblemPanel}
          aria-label={problemPanelOpen ? "Collapse problem panel" : "Expand problem panel"}
          aria-pressed={problemPanelOpen}
          title="Challenge Briefing"
          className={cn(
            "size-9 rounded-md flex items-center justify-center transition-colors",
            problemPanelOpen
              ? "bg-white/[0.08] text-foreground font-semibold"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
          )}
        >
          <BookOpen className="size-4.5" />
        </button>

        {/* Terminal Toggle */}
        <button
          onClick={onToggleTerminal}
          aria-label={terminalOpen ? "Collapse terminal" : "Expand terminal"}
          aria-pressed={terminalOpen}
          title="Terminal"
          className={cn(
            "size-9 rounded-md flex items-center justify-center transition-colors",
            terminalOpen
              ? "bg-white/[0.08] text-foreground font-semibold"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
          )}
        >
          <Terminal className="size-4.5" />
        </button>
      </div>

      {/* Bottom: AI Assistant Toggle */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onToggleAiAssistant}
          aria-label={aiAssistantOpen ? "Close AI assistant" : "Open AI assistant"}
          aria-pressed={aiAssistantOpen}
          title="AI Assistant (Chat & Agent Mode)"
          className={cn(
            "size-9 rounded-md flex items-center justify-center transition-colors relative",
            aiAssistantOpen
              ? "bg-white/[0.08] text-foreground font-semibold"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
          )}
        >
          <Bot className="size-4.5" />
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-emerald-500" />
        </button>
      </div>
    </nav>
  );
}

