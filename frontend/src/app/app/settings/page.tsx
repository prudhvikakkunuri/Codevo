import React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User, Palette, KeyRound, Sparkles } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border/70 bg-secondary/60 text-zinc-400">
              Preferences
            </span>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            Manage your developer profile, visual appearance, and candidate AI assistant providers.
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* Section 1: Profile (Demo Placeholder) */}
        <div className="rounded-lg border border-border/60 bg-card/25 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-foreground">
                <User className="size-3.5 text-zinc-300" />
                <h2 className="text-sm font-semibold">Candidate Profile</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Demo placeholder identity for the unauthenticated application shell preview.
              </p>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border/70 text-zinc-400">
              Demo Placeholder
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Display Name (Demo)
              </label>
              <Input defaultValue="Guest User" readOnly className="bg-secondary/40 border-border/60 text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Email Address (Demo)
              </label>
              <Input defaultValue="guest@codevo.local" readOnly className="bg-secondary/40 border-border/60 text-xs font-mono h-9" />
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed pt-1 border-t border-border/30">
            Authentication, user sessions, and persistent accounts are planned for Phase 2. This profile is a client-side layout placeholder and does not represent a real authenticated account.
          </p>
        </div>

        {/* Section 2: Appearance */}
        <div className="rounded-lg border border-border/60 bg-card/25 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-foreground">
                <Palette className="size-3.5 text-zinc-300" />
                <h2 className="text-sm font-semibold">Appearance &amp; Theme</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Codevo utilizes an intentional dark-first monochrome visual design system.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-secondary/30 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                Dark-First Monochrome
              </span>
              <p className="text-xs text-zinc-400">
                Near-black backgrounds, charcoal surfaces, and crisp white primary typography.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] border-border/80 text-zinc-300">
              Active System
            </Badge>
          </div>
        </div>

        {/* Section 3: AI Provider Configuration (BYOK - Planned) */}
        <div className="rounded-lg border border-border/60 bg-card/25 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-foreground">
                <KeyRound className="size-3.5 text-zinc-300" />
                <h2 className="text-sm font-semibold">AI Assistant Configuration (BYOK)</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Candidate Bring-Your-Own-Key configuration for the interactive interview workspace.
              </p>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              Planned Feature
            </span>
          </div>

          <div className="rounded-md border border-border/60 bg-secondary/30 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-300">
              <Sparkles className="size-3.5 text-zinc-400" />
              <span>Planned BYOK Architecture (Roadmap: Milestone 1.9)</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bring-Your-Own-Key (BYOK) support is planned for Phase 1, Milestone 1.9. When implemented, candidates will be able to supply their own API keys for model inference during practical interview sessions. No AI provider integrations or key management features are currently active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
