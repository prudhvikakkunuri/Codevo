import React from "react";
import { Badge } from "@/components/ui/badge";
import { FolderGit2, Bug, Wrench, CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Enter a codebase",
      description:
        "Start inside an existing repository with real folder structures, dependencies, configurations, and running services.",
      icon: FolderGit2,
      meta: "No empty editors or toy puzzles",
    },
    {
      number: "02",
      title: "Debug the problem",
      description:
        "Read error logs, trace execution flow across application layers, inspect failing public tests, and isolate root causes.",
      icon: Bug,
      meta: "Reproduction & diagnosis first",
    },
    {
      number: "03",
      title: "Build the solution",
      description:
        "Implement non-breaking fixes or features using your engineering skills, optionally guided by your own BYOK AI assistant.",
      icon: Wrench,
      meta: "Targeted, maintainable patches",
    },
    {
      number: "04",
      title: "Prove your work",
      description:
        "Execute automated tests in the embedded terminal. Submit your code for deterministic scoring against public and hidden test suites.",
      icon: CheckCircle2,
      meta: "Evidence-based evaluation",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 space-y-2.5">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider px-3 py-1">
            Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            How Codevo works
          </h2>
          <p className="text-base text-zinc-400 leading-relaxed">
            A practical assessment flow modeled after the day-to-day reality of software engineering.
          </p>
        </div>

        {/* 4-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative flex flex-col justify-between rounded-xl border border-border/90 bg-card p-6 transition-colors hover:border-zinc-700 shadow-sm"
              >
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-zinc-300 group-hover:text-foreground transition-colors">
                      {step.number}
                    </span>
                    <div className="size-9 rounded-lg border border-border bg-secondary flex items-center justify-center text-foreground">
                      <Icon className="size-4 text-zinc-200" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Footer Tag */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <span className="text-xs font-mono text-zinc-400 font-medium">
                    {step.meta}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
