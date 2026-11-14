"use client";

import React, { useState } from "react";
import {
  type WorkspaceFolder,
  type WorkspaceFile,
  type WorkspaceNode,
  isFolder,
} from "@/data/workspace";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceFileExplorerProps {
  tree: WorkspaceFolder;
  activeFilePath: string;
  onSelectFile: (file: WorkspaceFile) => void;
  modifiedFilePaths?: Set<string>;
  className?: string;
}

function getFileIcon(name: string) {
  if (name.endsWith(".py")) {
    return <FileCode className="size-3.5 text-zinc-300 shrink-0" />;
  }
  if (name.endsWith(".md") || name.endsWith(".txt")) {
    return <FileText className="size-3.5 text-zinc-400 shrink-0" />;
  }
  if (name.endsWith(".json") || name.endsWith(".yaml") || name.endsWith(".yml")) {
    return <FileSpreadsheet className="size-3.5 text-zinc-400 shrink-0" />;
  }
  return <File className="size-3.5 text-zinc-400 shrink-0" />;
}

interface TreeNodeProps {
  node: WorkspaceNode;
  activeFilePath: string;
  onSelectFile: (file: WorkspaceFile) => void;
  modifiedFilePaths?: Set<string>;
  depth?: number;
}

function TreeNode({
  node,
  activeFilePath,
  onSelectFile,
  modifiedFilePaths,
  depth = 0,
}: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (isFolder(node)) {
    return (
      <div className="select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-white/[0.04] text-xs font-mono text-zinc-400 hover:text-zinc-200 text-left transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="size-3 text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight className="size-3 text-zinc-500 shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="size-3.5 text-zinc-300 shrink-0" />
          ) : (
            <Folder className="size-3.5 text-zinc-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>

        {isOpen && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                activeFilePath={activeFilePath}
                onSelectFile={onSelectFile}
                modifiedFilePaths={modifiedFilePaths}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeFilePath === node.path;
  const isModified = modifiedFilePaths ? modifiedFilePaths.has(node.path) : false;

  return (
    <button
      onClick={() => onSelectFile(node)}
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-left transition-colors select-none group",
        isActive
          ? "bg-white/[0.08] font-semibold"
          : "hover:bg-white/[0.04]",
        isModified
          ? isActive
            ? "text-emerald-300"
            : "text-emerald-400 hover:text-emerald-300"
          : isActive
          ? "text-foreground"
          : "text-zinc-400 hover:text-zinc-200"
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate flex-1">{node.name}</span>
      {isModified && (
        <span
          className="size-1.5 rounded-full bg-emerald-400 shrink-0 ml-1.5 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
          title="Modified file"
        />
      )}
    </button>
  );
}

export function WorkspaceFileExplorer({
  tree,
  activeFilePath,
  onSelectFile,
  modifiedFilePaths,
  className,
}: WorkspaceFileExplorerProps) {
  return (
    <div
      className={cn(
        "w-56 sm:w-60 h-full flex flex-col bg-[#09090B] border-r border-border/50 select-none overflow-hidden shrink-0",
        className
      )}
    >
      {/* Explorer Header */}
      <div className="flex items-center justify-between h-8 px-3 border-b border-border/40 shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          Explorer
        </span>
        <span className="text-[10px] font-mono text-zinc-600 truncate">
          {tree.name}
        </span>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        <TreeNode
          node={tree}
          activeFilePath={activeFilePath}
          onSelectFile={onSelectFile}
          modifiedFilePaths={modifiedFilePaths}
          depth={0}
        />
      </div>
    </div>
  );
}

