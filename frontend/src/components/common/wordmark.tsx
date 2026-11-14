import React from "react";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
}

export function Wordmark({
  className,
  size = "md",
  withTagline = false,
}: WordmarkProps) {
  const sizeClasses = {
    sm: "text-base tracking-tight",
    md: "text-lg tracking-tight font-semibold",
    lg: "text-2xl tracking-tighter font-bold",
  };

  return (
    <div className={cn("inline-flex flex-col items-start select-none", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-mono font-semibold text-foreground transition-colors duration-150",
            sizeClasses[size]
          )}
        >
          <span className="text-foreground">codevo</span>
          <span className="text-muted-foreground font-normal">.</span>
        </span>
        <span className="inline-flex items-center rounded border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">
          v0.1
        </span>
      </div>
      {withTagline && (
        <span className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase mt-0.5">
          Build. Debug. Prove.
        </span>
      )}
    </div>
  );
}

