import React from "react";
import { DEMO_DASHBOARD_METRICS } from "@/data/dashboard";
import { BarChart3 } from "lucide-react";

export function DashboardMetrics() {
  return (
    <section className="space-y-3.5" aria-labelledby="metrics-heading">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="space-y-0.5">
          <h2 id="metrics-heading" className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="size-3.5 text-zinc-300" />
            Overview Metrics
          </h2>
          <p className="text-xs text-zinc-400">
            Summary practice cadence and catalogue indicators.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border/70 bg-secondary/60 text-zinc-400">
          Demo Preview
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {DEMO_DASHBOARD_METRICS.map((metric) => (
          <div
            key={metric.id}
            className="rounded-lg border border-border/60 bg-card/25 p-4 space-y-1 transition-colors hover:border-border"
          >
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              {metric.label}
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {metric.value}
            </div>
            <div className="text-[11px] text-zinc-500">
              {metric.helperText}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

