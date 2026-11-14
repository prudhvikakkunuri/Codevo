"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/application/app-sidebar";
import { AppHeader } from "@/components/application/app-header";
import { X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isWorkspace = pathname.startsWith("/app/workspace");

  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileDrawerOpen(false);
      }
    }
    if (mobileDrawerOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileDrawerOpen]);

  // Fullscreen IDE workspace mode: bypass dashboard shell
  if (isWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-[#09090B] text-foreground antialiased overflow-hidden">
      {/* 1. Desktop Persistent Sidebar */}
      <div className="hidden lg:flex shrink-0 h-full">
        <AppSidebar
          collapsed={desktopCollapsed}
          onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)}
        />
      </div>

      {/* 2. Mobile Drawer & Backdrop */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-[#09090B] border-r border-border/50 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div className="relative h-full">
              {/* Close Button Inside Drawer */}
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation"
                className="absolute top-3.5 right-3.5 size-7 rounded-md border border-border/60 hover:bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-foreground transition-colors z-10"
              >
                <X className="size-4" />
              </button>

              <AppSidebar
                onItemClick={() => setMobileDrawerOpen(false)}
                className="w-full border-r-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Application Stage */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Header */}
        <AppHeader
          onToggleMobileDrawer={() => setMobileDrawerOpen(true)}
          onToggleDesktopSidebar={() => setDesktopCollapsed(!desktopCollapsed)}
          desktopSidebarCollapsed={desktopCollapsed}
        />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
