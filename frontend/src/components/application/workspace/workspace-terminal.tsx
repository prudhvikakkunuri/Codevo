"use client";

import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Terminal as TerminalIcon, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceTerminalProps {
  onClose?: () => void;
  onRunTests?: () => void;
  terminalStream?: string;
  isSubmitted?: boolean;
  className?: string;
}

export function WorkspaceTerminal({
  onClose,
  onRunTests,
  terminalStream,
  isSubmitted = false,
  className,
}: WorkspaceTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onRunTestsRef = useRef(onRunTests);
  const isSubmittedRef = useRef(isSubmitted);

  useEffect(() => {
    onRunTestsRef.current = onRunTests;
  }, [onRunTests]);

  useEffect(() => {
    isSubmittedRef.current = isSubmitted;
  }, [isSubmitted]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      theme: {
        background: "#09090B",
        foreground: "#FAFAFA",
        cursor: "#FAFAFA",
        selectionBackground: "#27272A90",
        black: "#18181B",
        red: "#EF4444",
        green: "#10B981",
        yellow: "#F59E0B",
        blue: "#3B82F6",
        magenta: "#EC4899",
        cyan: "#06B6D4",
        white: "#FAFAFA",
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    terminalInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome banner clearly identifying simulated environment
    term.writeln("\x1b[38;5;244mCodevo Demo Terminal [Simulated Environment - No live shell execution]\x1b[0m");
    if (isSubmittedRef.current) {
      term.writeln("\x1b[33m[Session Locked - Read-Only]\x1b[0m This interview session has been submitted. Code and tests are locked.\x1b[0m");
    } else {
      term.writeln("\x1b[38;5;244mType 'help' for simulated commands, 'pytest' to run simulated test suite.\x1b[0m");
    }
    term.writeln("");
    term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");

    let currentLine = "";

    const onDataDisposable = term.onData((data) => {
      // Enter key
      if (data === "\r") {
        term.writeln("");
        const command = currentLine.trim();

        if (command === "help") {
          term.writeln("Available simulated commands:");
          term.writeln("  python --version    - Display Python runtime version");
          term.writeln("  pytest              - Execute test runner (simulated execution)");
          term.writeln("  clear               - Clear terminal screen");
          term.writeln("  help                - Display this simulated command help");
          currentLine = "";
          term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
        } else if (command === "python --version") {
          term.writeln("Python 3.11.0 (simulated)");
          currentLine = "";
          term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
        } else if (command === "pytest") {
          currentLine = "";
          if (isSubmittedRef.current) {
            term.writeln("\x1b[33m[Session Locked]\x1b[0m This interview session has been submitted. Test execution is disabled.");
            term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
          } else if (onRunTestsRef.current) {
            onRunTestsRef.current();
          } else {
            term.writeln("\x1b[33m[Simulated Notice]\x1b[0m Automated test suite runner triggered.");
            term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
          }
        } else if (/^(touch|rm|mv|cp|mkdir|rmdir|nano|vim|vi|echo\s.*>)/.test(command)) {
          currentLine = "";
          if (isSubmittedRef.current) {
            term.writeln("\x1b[31m[Session Locked]\x1b[0m Workspace is read-only. File mutations are disabled.");
          } else {
            term.writeln(`\x1b[33m[Simulated Notice]\x1b[0m Command '${command.split(" ")[0]}' is not supported in simulated shell.`);
          }
          term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
        } else if (command === "clear") {
          term.clear();
          currentLine = "";
          term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
        } else if (command.length > 0) {
          term.writeln(`\x1b[31mbash: ${command}: command not found (simulated terminal)\x1b[0m`);
          currentLine = "";
          term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
        } else {
          currentLine = "";
          term.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
        }
      }
      // Backspace
      else if (data === "\u007F") {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write("\b \b");
        }
      }
      // Printable characters
      else if (data >= " " && data <= "~") {
        currentLine += data;
        term.write(data);
      }
    });

    // Resize observer to dynamically fit terminal canvas
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // ignore layout race conditions
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  // Stream live execution text to terminal
  useEffect(() => {
    if (terminalStream && terminalInstanceRef.current) {
      terminalInstanceRef.current.write(terminalStream);
    }
  }, [terminalStream]);

  const handleClear = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.write("\x1b[32mcodevo@demo\x1b[0m:\x1b[34m~/auth-service\x1b[0m$ ");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#09090B] select-none overflow-hidden",
        className
      )}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between h-7 px-3 bg-[#0A0A0C] border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-3 text-zinc-400" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            Interactive Bash
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-border/70 bg-secondary/60 text-zinc-500">
            Simulated
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            title="Clear terminal buffer"
            className="size-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
          >
            <Trash2 className="size-3" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close terminal"
              className="size-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 w-full p-2 bg-[#09090B] overflow-hidden" ref={containerRef} />
    </div>
  );
}
