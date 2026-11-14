import React from "react";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";

export function CtaSection() {
  return (
    <section id="cta" className="py-24 sm:py-32 border-t border-border/60 relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-mono text-zinc-300">
          <Terminal className="size-3.5 text-zinc-200" />
          <span>Practical Assessment Paradigm</span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
          Stop memorizing answers.
          <br />
          <span className="text-zinc-400 font-normal">
            Start solving real problems.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Prepare for the engineering work that actually happens on the job.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
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
            Review interview process
          </a>
        </div>
      </div>
    </section>
  );
}
