"use client";

import React, { useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as monacoType from "monaco-editor";
import { type WorkspaceFile } from "@/data/workspace";
import { X, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorTab {
  path: string;
  name: string;
  isModified: boolean;
}

interface WorkspaceEditorProps {
  tabs: EditorTab[];
  activeFile: WorkspaceFile | null;
  onSelectTab: (filePath: string) => void;
  onCloseTab: (filePath: string) => void;
  onContentChange: (filePath: string, content: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function WorkspaceEditor({
  tabs,
  activeFile,
  onSelectTab,
  onCloseTab,
  onContentChange,
  readOnly = false,
  className,
}: WorkspaceEditorProps) {
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);

  // Synchronize readOnly options whenever prop changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        readOnly: Boolean(readOnly),
        domReadOnly: Boolean(readOnly),
      });
    }
  }, [readOnly]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    if (readOnly) {
      editor.updateOptions({
        readOnly: true,
        domReadOnly: true,
      });
    }

    // Define custom Codevo dark theme for Monaco
    monaco.editor.defineTheme("codevo-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "71717A", fontStyle: "italic" },
        { token: "keyword", foreground: "FAFAFA", fontStyle: "bold" },
        { token: "string", foreground: "D4D4D8" },
        { token: "number", foreground: "A1A1AA" },
      ],
      colors: {
        "editor.background": "#09090B",
        "editor.foreground": "#FAFAFA",
        "editorLineNumber.foreground": "#52525B",
        "editorLineNumber.activeForeground": "#FAFAFA",
        "editor.lineHighlightBackground": "#18181B50",
        "editorCursor.foreground": "#FAFAFA",
        "editor.selectionBackground": "#27272A90",
        "editorIndentGuide.background": "#27272A40",
        "editorIndentGuide.activeBackground": "#52525B80",
      },
    });

    monaco.editor.setTheme("codevo-dark");

    // Intercept Ctrl+S / Cmd+S so the browser's native Save Page dialog does not disrupt typing
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Keystroke consumed inside Monaco; workspace autosave layer already persists state
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-[#09090B] overflow-hidden", className)}>
      {/* 1. Tab Bar */}
      <div
        role="tablist"
        aria-label="Open editor tabs"
        className="flex items-center justify-between h-8 bg-[#09090B] border-b border-border/50 shrink-0 select-none pr-3"
      >
        <div className="flex items-center h-full overflow-x-auto overflow-y-hidden scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeFile?.path === tab.path;
            return (
              <div
                key={tab.path}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => onSelectTab(tab.path)}
                className={cn(
                  "group flex items-center gap-2 h-full px-3 text-xs font-mono border-r border-border/40 cursor-pointer transition-colors relative shrink-0",
                  isActive
                    ? "bg-[#101014] text-foreground font-medium border-t-2 border-t-foreground"
                    : "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                )}
              >
                <span>{tab.name}</span>

                {/* Unsaved indicator / Close button (shows dot, switches to X on hover) */}
                <div className="flex items-center ml-1">
                  {tab.isModified && (
                    <Circle className="size-2 fill-zinc-400 text-zinc-400 group-hover:hidden" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.path);
                    }}
                    aria-label={`Close ${tab.name}`}
                    className={cn(
                      "size-4 rounded items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/[0.1] text-zinc-400 hover:text-foreground transition-opacity",
                      tab.isModified ? "hidden group-hover:flex" : "flex"
                    )}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Read-Only Locked Session Badge */}
        {readOnly && (
          <div
            title="Interview session submitted. All files in this workspace are locked in read-only mode."
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950/40 border border-amber-900/50 text-amber-300/90 shrink-0"
          >
            <Lock className="size-2.5 text-amber-400" />
            <span>Read-Only (Submitted)</span>
          </div>
        )}
      </div>

      {/* 2. Monaco Editor View */}
      <div className="flex-1 w-full h-full relative select-text">
        {activeFile ? (
          <Editor
            height="100%"
            path={activeFile.path}
            language={activeFile.language}
            defaultValue={activeFile.content}
            onChange={(value) => {
              if (readOnly) return;
              onContentChange(activeFile.path, value || "");
            }}
            onMount={handleEditorMount}
            theme="vs-dark"
            keepCurrentModel={true}
            saveViewState={true}
            loading={
              <div className="flex items-center justify-center h-full text-xs font-mono text-zinc-500">
                Initializing code editor...
              </div>
            }
            options={{
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              tabSize: 4,
              insertSpaces: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: "on",
              renderLineHighlight: "all",
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              overviewRulerLanes: 0,
              padding: { top: 8, bottom: 8 },
              cursorBlinking: "smooth",
              smoothScrolling: true,
              // Submission Lock enforcement
              readOnly: Boolean(readOnly),
              domReadOnly: Boolean(readOnly),
              // Disable experimental Chromium EditContext API to ensure reliable native typing on all platforms
              editContext: false,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-xs font-mono text-zinc-500 space-y-1">
            <span>No file open</span>
            <span className="text-[11px] text-zinc-600">Select a file from the explorer to view and edit</span>
          </div>
        )}
      </div>
    </div>
  );
}
