"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface ChallengeSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ChallengeSearch({ value, onChange, className }: ChallengeSearchProps) {
  return (
    <div className={`relative flex items-center w-full ${className || ""}`}>
      <Search className="absolute left-3.5 size-4 text-zinc-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, ID (e.g. CI-001), category, or stack..."
        aria-label="Search challenges"
        className="w-full h-10 pl-10 pr-10 rounded-lg border border-border/60 bg-card/25 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search input"
          className="absolute right-3 size-5 rounded flex items-center justify-center text-zinc-400 hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

