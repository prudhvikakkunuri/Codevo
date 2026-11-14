import React from "react";
import { type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border border-border/60 bg-card/25 transition-colors",
        compact ? "p-6 sm:p-7" : "p-8 sm:p-10",
        className
      )}
    >
      <div className="size-8 rounded-md border border-border/80 bg-secondary/80 flex items-center justify-center text-zinc-300 mb-3.5 shadow-xs">
        <Icon className="size-4 text-zinc-300" />
      </div>

      <h3 className="text-sm font-semibold text-foreground tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-zinc-400 max-w-md mt-1.5 mb-4 leading-relaxed">
        {description}
      </p>

      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "text-xs font-medium h-8 px-3.5 gap-1.5",
          })}
        >
          {actionLabel}
        </a>
      )}

      {actionLabel && !actionHref && actionOnClick && (
        <button
          onClick={actionOnClick}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "text-xs font-medium h-8 px-3.5 gap-1.5",
          })}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
