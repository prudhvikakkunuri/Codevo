import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  MessageSquare,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Check,
  Terminal,
  FileSearch,
  PenTool,
  HelpCircle,
  Code2,
  Lightbulb,
} from "lucide-react";

export function AiModes() {
  const chatCapabilities = [
    {
      icon: HelpCircle,
      title: "Ask conceptual questions",
      detail: "Query architectural patterns, framework behaviors, and obscure stack traces.",
    },
    {
      icon: Code2,
      title: "Understand unfamiliar code",
      detail: "Receive concise summaries of legacy modules, schemas, and complex data flows.",
    },
    {
      icon: Lightbulb,
      title: "Targeted debugging hypotheses",
      detail: "Explore probable defect causes without the assistant modifying files automatically.",
    },
    {
      icon: Check,
      title: "Manual implementation",
      detail: "You stay in the driver seat: write, test, and verify all code changes yourself.",
    },
  ];

  const agentCapabilities = [
    {
      icon: FileSearch,
      title: "Explore workspace files",
      detail: "The agent inspects directories and reads relevant files to establish context.",
    },
    {
      icon: PenTool,
      title: "Propose & apply diffs",
      detail: "Generate surgical code patches and write changes directly to your files.",
    },
    {
      icon: Terminal,
      title: "Execute tests & commands",
      detail: "Run unit tests, linters, and builds inside your sandboxed runner container.",
    },
    {
      icon: ShieldCheck,
      title: "Permission gates",
      detail: "Every workspace modification and terminal command requires candidate confirmation.",
    },
  ];

  return (
    <section id="ai-modes" className="py-20 sm:py-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 space-y-2.5">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider px-3 py-1">
            AI Collaboration
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            AI as an amplifier, not a cheat code
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Modern engineers use AI to accelerate comprehension and iterate faster. Codevo allows candidates to leverage AI under clear, auditable operational constraints.
          </p>
        </div>

        {/* Dual Mode Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Chat Mode Card */}
          <Card className="border-border bg-card flex flex-col justify-between shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
                  Advisory Mode
                </Badge>
                <div className="size-8 rounded-md border border-border bg-secondary flex items-center justify-center text-zinc-300">
                  <MessageSquare className="size-4" />
                </div>
              </div>
              <CardTitle className="text-xl">Chat Mode</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                A conversational mentor that explains logic and suggests directions while leaving all editing in your hands.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="space-y-3.5">
                {chatCapabilities.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="size-6 rounded border border-border bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="size-3.5 text-zinc-300" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-foreground">
                          {item.title}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>

            <CardFooter className="bg-[#121214] border-t border-border text-xs font-mono text-zinc-300 py-3">
              Zero automated tool permissions · Pure conversational reasoning
            </CardFooter>
          </Card>

          {/* Agent Mode Card */}
          <Card className="border-border bg-card flex flex-col justify-between shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">
                  Tool-Assisted Mode
                </Badge>
                <div className="size-8 rounded-md border border-border bg-secondary flex items-center justify-center text-zinc-300">
                  <Sparkles className="size-4" />
                </div>
              </div>
              <CardTitle className="text-xl">Agent Mode</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                An autonomous workspace assistant equipped with scoped tools to inspect, edit, and test code on your command.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="space-y-3.5">
                {agentCapabilities.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="size-6 rounded border border-border bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="size-3.5 text-zinc-300" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-foreground">
                          {item.title}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>

            <CardFooter className="bg-[#121214] border-t border-border text-xs font-mono text-zinc-300 py-3">
              Workspace-scoped sandboxed execution · Candidate approval gate
            </CardFooter>
          </Card>
        </div>

        {/* BYOK & Privacy Strip */}
        <div className="rounded-xl border border-border bg-secondary/50 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-foreground" />
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Candidate Bring-Your-Own-Key (BYOK)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Connect your preferred model provider (Gemini, OpenAI, Groq, Anthropic, or Cerebras). Your API key is encrypted at rest, never visible in client bundles, and used exclusively for your session inference without platform markup.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">Gemini</Badge>
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">OpenAI</Badge>
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">Groq</Badge>
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">Anthropic</Badge>
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">Cerebras</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
