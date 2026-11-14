"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/common/wordmark";
import { UserMenu } from "@/components/application/user-menu";
import {
  LayoutDashboard,
  Code2,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
  className?: string;
}

export function AppSidebar({
  collapsed = false,
  onToggleCollapse,
  onItemClick,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();

  const primaryNavItems = [
    {
      label: "Overview",
      href: "/app",
      icon: LayoutDashboard,
      isActive: pathname === "/app",
    },
    {
      label: "Challenges",
      href: "/app/challenges",
      icon: Code2,
      isActive: pathname.startsWith("/app/challenges"),
    },
    {
      label: "Interview History",
      href: "/app/history",
      icon: History,
      isActive: pathname.startsWith("/app/history"),
    },
  ];

  const secondaryNavItems = [
    {
      label: "Settings",
      href: "/app/settings",
      icon: Settings,
      isActive: pathname.startsWith("/app/settings"),
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col justify-between h-full bg-[#09090B] border-r border-border/50 transition-all duration-200 select-none",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Top Header & Brand */}
      <div>
        <div className="flex items-center justify-between h-14 px-3.5 border-b border-border/50">
          <Link
            href="/app"
            onClick={onItemClick}
            className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            {collapsed ? (
              <span className="font-mono font-bold text-sm text-foreground tracking-tight">C.</span>
            ) : (
              <Wordmark size="sm" />
            )}
          </Link>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex size-7 rounded-md border border-border/60 hover:bg-white/[0.05] items-center justify-center text-zinc-400 hover:text-foreground transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronLeft className="size-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="p-2 space-y-5">
          <div className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 pt-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
                Platform
              </div>
            )}
            <nav className="space-y-0.5" aria-label="Main Platform Navigation">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      item.isActive
                        ? "bg-white/[0.08] text-foreground font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]",
                      collapsed && "justify-center px-0 size-9 mx-auto"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", item.isActive ? "text-foreground" : "text-zinc-400")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Secondary Navigation (Settings) */}
          <div className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 pt-1 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
                Preferences
              </div>
            )}
            <nav className="space-y-0.5" aria-label="Preferences Navigation">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      item.isActive
                        ? "bg-white/[0.08] text-foreground font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]",
                      collapsed && "justify-center px-0 size-9 mx-auto"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", item.isActive ? "text-foreground" : "text-zinc-400")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-2 border-t border-border/50">
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
