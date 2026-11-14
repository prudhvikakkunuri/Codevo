"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft, ChevronRight } from "lucide-react";
import { UserMenu } from "@/components/application/user-menu";

interface AppHeaderProps {
  onToggleMobileDrawer: () => void;
  onToggleDesktopSidebar: () => void;
  desktopSidebarCollapsed: boolean;
}

export function AppHeader({
  onToggleMobileDrawer,
  onToggleDesktopSidebar,
  desktopSidebarCollapsed,
}: AppHeaderProps) {
  const pathname = usePathname();

  const getPageInfo = () => {
    if (pathname === "/app") {
      return { title: "Overview", section: "Platform" };
    }
    if (pathname.startsWith("/app/challenges")) {
      return { title: "Challenges", section: "Platform" };
    }
    if (pathname.startsWith("/app/history")) {
      return { title: "Interview History", section: "Platform" };
    }
    if (pathname.startsWith("/app/settings")) {
      return { title: "Settings", section: "Preferences" };
    }
    return { title: "Dashboard", section: "Platform" };
  };

  const { title } = getPageInfo();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border/50 bg-background/80 backdrop-blur-md">
      {/* Left: Toggles & Understated Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Drawer Button */}
        <button
          onClick={onToggleMobileDrawer}
          aria-label="Open mobile navigation"
          className="lg:hidden size-8 rounded-md hover:bg-white/[0.05] text-zinc-400 hover:text-foreground flex items-center justify-center transition-colors"
        >
          <Menu className="size-4" />
        </button>

        {/* Desktop Sidebar Toggle Button */}
        <button
          onClick={onToggleDesktopSidebar}
          aria-label={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex size-8 rounded-md hover:bg-white/[0.05] text-zinc-400 hover:text-foreground items-center justify-center transition-colors"
        >
          <PanelLeft className="size-4" />
        </button>

        {/* Breadcrumb Hierarchy */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-mono min-w-0 ml-1">
          <Link
            href="/app"
            className="text-zinc-500 hover:text-zinc-300 transition-colors truncate"
          >
            Codevo
          </Link>
          <ChevronRight className="size-3 text-zinc-600 shrink-0" />
          <span className="text-zinc-200 font-medium truncate">
            {title}
          </span>
        </nav>
      </div>

      {/* Right: Compact User Profile Trigger */}
      <div className="flex items-center gap-2">
        <div className="w-36 hidden sm:block">
          <UserMenu />
        </div>
        <div className="sm:hidden">
          <UserMenu collapsed />
        </div>
      </div>
    </header>
  );
}
