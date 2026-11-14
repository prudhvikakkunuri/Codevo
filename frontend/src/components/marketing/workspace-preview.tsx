"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileCode2,
  FolderTree,
  Terminal,
  Play,
  AlertCircle,
  Timer,
  Sparkles,
  Bot,
  MessageSquare,
  ChevronRight,
  Send,
} from "lucide-react";

export function WorkspacePreview() {
  const [activeTab, setActiveTab] = useState<"auth.py" | "test_auth.py">("auth.py");
  const [aiMode, setAiMode] = useState<"chat" | "agent">("chat");

  const files = [
    { name: "app.py", active: false },
    { name: "auth.py", active: activeTab === "auth.py" },
    { name: "models.py", active: false },
    { name: "security.py", active: false },
    { name: "tests/test_auth.py", active: activeTab === "test_auth.py" },
  ];

  const handleFileSelect = (name: string) => {
    if (name === "auth.py") {
      setActiveTab("auth.py");
    } else if (name === "tests/test_auth.py") {
      setActiveTab("test_auth.py");
    }
  };

  return (
    <section id="preview" className="py-20 sm:py-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2.5">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider px-3 py-1">
            Workspace Preview
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            A real developer environment in your browser
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Full file hierarchy, Monaco code editor, embedded test terminal, and permission-gated AI assistant.
          </p>
        </div>

        {/* Browser IDE Mockup Shell */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
          {/* Top IDE Application Bar */}
          <div className="flex items-center justify-between border-b border-border bg-[#18181B] px-4 py-2.5">
            <div className="flex items-center gap-3">
              {/* Window Dots */}
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="size-3 rounded-full bg-zinc-700" />
                <span className="size-3 rounded-full bg-zinc-700" />
                <span className="size-3 rounded-full bg-zinc-700" />
              </div>
              <div className="h-4 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">
                  CI-001 · FastAPI Auth Defect
                </span>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 hidden sm:inline-flex">
                  Python 3.12
                </Badge>
              </div>
            </div>

            {/* Timer & Action Controls */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-xs font-mono text-foreground">
                <Timer className="size-3.5 text-zinc-400" />
                <span className="font-semibold">38:14</span>
                <span className="text-zinc-500 hidden sm:inline">remaining</span>
              </div>
              <Button size="xs" variant="outline" className="gap-1 hidden sm:inline-flex text-xs font-medium">
                <Play className="size-3" /> Run Tests
              </Button>
              <Button size="xs" variant="default" className="text-xs font-medium">
                Submit Solution
              </Button>
            </div>
          </div>

          {/* Main IDE Body (3 distinct columns on desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px] divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Column 1: File Explorer (2 cols on lg) */}
            <div className="lg:col-span-2 bg-[#121214] p-3 hidden md:flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FolderTree className="size-3.5 text-zinc-300" /> Explorer
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-400 px-2 py-1 flex items-center gap-1">
                    <ChevronRight className="size-3" /> fastapi-auth/
                  </div>
                  {files.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => handleFileSelect(file.name)}
                      className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                        file.active
                          ? "bg-background text-foreground font-semibold border border-zinc-700 shadow-sm"
                          : "text-zinc-400 hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <FileCode2 className={`size-3.5 shrink-0 ${file.active ? "text-foreground" : "text-zinc-500"}`} />
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions Panel Box */}
              <div className="mt-6 pt-3 border-t border-border/60 space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  Task Requirements
                </span>
                <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-foreground font-mono font-bold">1.</span>
                    <span>Fix hash verification in <code className="text-zinc-200 font-mono">verify_password()</code>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-foreground font-mono font-bold">2.</span>
                    <span>Enforce unique email validation on register.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-foreground font-mono font-bold">3.</span>
                    <span>Pass all 6 public test assertions.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Column 2: Code Editor & Terminal (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-[#09090B]">
              {/* Editor Tab Bar */}
              <div className="flex items-center border-b border-border bg-[#121214] px-2 pt-1.5 gap-1.5">
                <button
                  onClick={() => setActiveTab("auth.py")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-mono border-t border-x border-border transition-colors ${
                    activeTab === "auth.py"
                      ? "bg-[#09090B] text-foreground font-semibold border-b-transparent shadow-sm"
                      : "bg-transparent text-zinc-400 hover:text-foreground"
                  }`}
                >
                  <FileCode2 className="size-3.5 text-zinc-400" />
                  <span>auth.py</span>
                </button>
                <button
                  onClick={() => setActiveTab("test_auth.py")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-mono border-t border-x border-border transition-colors ${
                    activeTab === "test_auth.py"
                      ? "bg-[#09090B] text-foreground font-semibold border-b-transparent shadow-sm"
                      : "bg-transparent text-zinc-400 hover:text-foreground"
                  }`}
                >
                  <FileCode2 className="size-3.5 text-zinc-400" />
                  <span>test_auth.py</span>
                </button>
              </div>

              {/* Code Content */}
              <div className="p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto flex-1 bg-[#09090B] select-text">
                {activeTab === "auth.py" ? (
                  <div className="space-y-1">
                    <div className="text-zinc-500 italic pb-1">{"# Defect located in verify_password hashing logic"}</div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">1</span>
                      <span className="text-zinc-100 font-semibold">from</span> passlib.context{" "}
                      <span className="text-zinc-100 font-semibold">import</span> CryptContext
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">2</span>
                      {"pwd_context = CryptContext(schemes=[\"bcrypt\"], deprecated=\"auto\")"}
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">3</span>
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">4</span>
                      <span className="text-zinc-100 font-semibold">def</span> <span className="text-zinc-200 font-semibold">verify_password</span>(plain_password: str, hashed_password: str) -&gt; bool:
                    </div>
                    <div className="bg-destructive/15 border-l-2 border-destructive px-1.5 py-0.5 rounded-r">
                      <span className="text-zinc-500 select-none inline-block w-7">5</span>
                      {"    # Defect: Direct string comparison instead of cryptographically safe hash verification"}
                    </div>
                    <div className="bg-destructive/15 border-l-2 border-destructive px-1.5 py-0.5 rounded-r">
                      <span className="text-zinc-500 select-none inline-block w-7">6</span>
                      {"    "}<span className="text-zinc-100 font-semibold">return</span> plain_password == hashed_password
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">7</span>
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">8</span>
                      <span className="text-zinc-100 font-semibold">def</span> <span className="text-zinc-200 font-semibold">get_password_hash</span>(password: str) -&gt; str:
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">9</span>
                      {"    "}<span className="text-zinc-100 font-semibold">return</span> pwd_context.hash(password)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">1</span>
                      <span className="text-zinc-100 font-semibold">import</span> pytest
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">2</span>
                      <span className="text-zinc-100 font-semibold">from</span> auth <span className="text-zinc-100 font-semibold">import</span> verify_password, get_password_hash
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">3</span>
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">4</span>
                      <span className="text-zinc-100 font-semibold">def</span> <span className="text-zinc-200 font-semibold">test_password_hash_verification</span>():
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">5</span>
                      {"    hashed = get_password_hash(\"super-secret-123\")"}
                    </div>
                    <div>
                      <span className="text-zinc-600 select-none inline-block w-7">6</span>
                      {"    assert verify_password(\"super-secret-123\", hashed) is True"}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Embedded Terminal */}
              <div className="border-t border-border bg-[#0D0D10]">
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-[#18181B] text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Terminal className="size-3.5 text-zinc-300" />
                    <span>Terminal · pytest runner</span>
                  </span>
                  <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="size-3.5" /> 1 failed, 5 passed
                  </span>
                </div>
                <div className="p-3.5 font-mono text-xs leading-relaxed space-y-1 bg-[#0D0D10]">
                  <div className="text-foreground font-semibold">$ pytest tests/test_auth.py -v</div>
                  <div className="text-zinc-300">tests/test_auth.py::test_user_registration <span className="text-emerald-400 font-bold">PASSED</span></div>
                  <div className="text-zinc-300">tests/test_auth.py::test_duplicate_email_rejection <span className="text-emerald-400 font-bold">PASSED</span></div>
                  <div className="text-zinc-300">tests/test_auth.py::test_password_hash_verification <span className="text-rose-400 font-bold">FAILED</span></div>
                  <div className="text-rose-400 pt-1 font-semibold">
                    AssertionError: assert False is True
                  </div>
                  <div className="text-zinc-400">&gt; verify_password returned False on bcrypt hash comparison</div>
                </div>
              </div>
            </div>

            {/* Column 3: AI Assistant Drawer (3 cols on lg) */}
            <div className="lg:col-span-3 bg-[#131316] flex flex-col justify-between">
              {/* Header with Mode Toggle */}
              <div className="p-3.5 border-b border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
                    <Bot className="size-4 text-zinc-300" /> AI Assistant
                  </span>
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                    BYOK
                  </Badge>
                </div>
                {/* Chat vs Agent toggle */}
                <div className="grid grid-cols-2 rounded-lg border border-border bg-background p-0.5 text-xs font-medium">
                  <button
                    onClick={() => setAiMode("chat")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded transition-colors ${
                      aiMode === "chat"
                        ? "bg-secondary text-foreground font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="size-3.5" /> Chat
                  </button>
                  <button
                    onClick={() => setAiMode("agent")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded transition-colors ${
                      aiMode === "agent"
                        ? "bg-secondary text-foreground font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="size-3.5" /> Agent
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-xs leading-relaxed">
                {aiMode === "chat" ? (
                  <>
                    <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                      <span className="font-mono text-xs text-zinc-400 font-semibold">Candidate</span>
                      <p className="text-foreground">
                        Why is test_password_hash_verification failing?
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary p-3 space-y-1.5">
                      <span className="font-mono text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Bot className="size-3.5 text-zinc-300" /> Assistant (Chat Mode)
                      </span>
                      <p className="text-zinc-300">
                        In <code className="text-foreground bg-background px-1.5 py-0.5 rounded font-mono font-semibold">auth.py:6</code>, the function compares plain password directly to bcrypt hash with <code className="text-foreground bg-background px-1.5 py-0.5 rounded font-mono font-semibold">==</code> instead of calling <code className="text-foreground bg-background px-1.5 py-0.5 rounded font-mono font-semibold">pwd_context.verify(plain_password, hashed_password)</code>.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                      <span className="font-mono text-xs text-zinc-400 font-semibold">Candidate</span>
                      <p className="text-foreground">
                        Find and fix the password verification bug, then run tests.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary p-3 space-y-2">
                      <span className="font-mono text-xs text-zinc-300 font-semibold flex items-center gap-1">
                        <Sparkles className="size-3.5 text-zinc-200" /> Agent Mode (Permission Request)
                      </span>
                      <p className="text-zinc-300">
                        I found the defect in <code className="text-foreground font-mono font-semibold">auth.py</code>.
                      </p>
                      <div className="rounded border border-border bg-background p-2.5 text-xs font-mono space-y-1">
                        <div className="text-zinc-400">Proposed Action:</div>
                        <div className="text-emerald-400 font-semibold">+ pwd_context.verify(plain, hash)</div>
                      </div>
                      <div className="pt-1">
                        <Button size="xs" variant="default" className="w-full text-xs font-medium">
                          Approve Patch
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Chat Input Placeholder */}
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-zinc-400">
                  <span className="truncate flex-1">Ask AI or command agent...</span>
                  <Send className="size-3.5 text-zinc-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-xs text-zinc-400 font-mono">
          Illustrative interactive UI preview · Actual Monaco &amp; xterm.js integration planned for Phase 1 Step 7
        </p>
      </div>
    </section>
  );
}
