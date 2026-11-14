import React from "react";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Terminal, ShieldAlert, Cpu, CheckCircle2 } from "lucide-react";

export function Hero() {
  const featureSignals = [
    {
      icon: Terminal,
      title: "Full Repositories",
      description: "Work across multi-file codebases, packages, and services.",
    },
    {
      icon: ShieldAlert,
      title: "Authoritative Timer",
      description: "Fixed interview durations backed by immutable server deadlines.",
    },
    {
      icon: Cpu,
      title: "BYOK AI Assistant",
      description: "Bring your own API key with scoped Chat and Agent modes.",
    },
    {
      icon: CheckCircle2,
      title: "Automated Tests",
      description: "Deterministic evaluation using public and hidden test suites.",
    },
  ];

  return (
    <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 flex flex-col items-center">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3.5 py-1.5 mb-8">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-medium text-zinc-300 uppercase tracking-wider">
            Practical engineering interview platform
          </span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.08] max-w-3xl">
          Real engineering.
          <br />
          <span className="text-zinc-400 font-normal">
            Not just interview puzzles.
          </span>
        </h1>

        {/* Supporting Subtext */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Debug real codebases, build working solutions, and prove your engineering skills in practical, timed interviews.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <a
            href="#challenges"
            className={buttonVariants({
              size: "lg",
              variant: "default",
              className: "w-full sm:w-auto gap-2 px-6 h-10 font-medium shadow-sm",
            })}
          >
            Explore challenges
            <ArrowRight className="size-4" />
          </a>
          <a
            href="#how-it-works"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "w-full sm:w-auto px-6 h-10 font-medium",
            })}
          >
            See how it works
          </a>
        </div>

        {/* Feature Signals Strip */}
        <div className="mt-14 pt-10 border-t border-border/70 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {featureSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.title}
                className="rounded-lg border border-border/80 bg-card/60 p-4 space-y-2 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center gap-2 text-foreground">
                  <div className="size-7 rounded-md border border-border bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="size-3.5 text-zinc-200" />
                  </div>
                  <span className="text-sm font-semibold tracking-tight">
                    {signal.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
