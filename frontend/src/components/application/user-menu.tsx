"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { User, Settings, LogOut, ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* User Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User profile menu"
        className={cn(
          "w-full flex items-center gap-2.5 p-1.5 rounded-md hover:bg-white/[0.04] transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isOpen && "bg-white/[0.05]",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar with initials */}
          <div className="size-6 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-[10px] font-mono font-medium text-zinc-200 shrink-0">
            GU
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-zinc-200 truncate leading-none">
                Guest User
              </span>
              <span className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                Demo Preview
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="text-zinc-500 shrink-0">
            {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </div>
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cn(
            "absolute z-50 rounded-lg border border-border/80 bg-[#0E0E11] p-1 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95",
            collapsed
              ? "left-full bottom-0 ml-2 w-52"
              : "bottom-full left-0 mb-2 w-full min-w-[210px]"
          )}
        >
          {/* User Details Header */}
          <div className="px-2.5 py-2 border-b border-border/50 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Guest User</span>
              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-border/70 text-zinc-400">
                Demo
              </Badge>
            </div>
            <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">
              guest@codevo.local
            </p>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5">
            <Link
              href="/app/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-foreground hover:bg-white/[0.05] transition-colors"
            >
              <User className="size-3.5 text-zinc-400" />
              <span>Profile & Account</span>
            </Link>

            <Link
              href="/app/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-foreground hover:bg-white/[0.05] transition-colors"
            >
              <Settings className="size-3.5 text-zinc-400" />
              <span>Settings</span>
            </Link>

            <div className="px-2.5 py-1.5 rounded-md text-[11px] font-mono text-zinc-500 flex items-center justify-between border-t border-border/40 mt-1 pt-1.5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-zinc-500" />
                BYOK AI Key
              </span>
              <span className="text-zinc-500">Planned (Milestone 1.9)</span>
            </div>

            <div className="border-t border-border/40 pt-1 mt-1">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-foreground hover:bg-white/[0.05] transition-colors"
              >
                <LogOut className="size-3.5 text-zinc-500" />
                <span>Back to Landing Page</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
