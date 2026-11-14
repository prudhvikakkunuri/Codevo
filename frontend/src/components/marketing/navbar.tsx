"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/common/wordmark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Product", href: "#preview" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Challenges", href: "#challenges" },
    { label: "AI Assistance", href: "#ai-modes" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <Wordmark size="md" />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-zinc-400 hover:text-foreground transition-colors duration-150 font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="#cta"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "text-zinc-400 hover:text-foreground font-medium",
            })}
          >
            Sign in
          </a>
          <Link
            href="/app"
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "gap-1.5 font-medium shadow-sm",
            })}
          >
            Enter Dashboard
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border bg-background px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-secondary hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <a
              href="#cta"
              onClick={() => setMobileMenuOpen(false)}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "w-full justify-center font-medium",
              })}
            >
              Sign in
            </a>
            <Link
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "w-full justify-center font-medium",
              })}
            >
              Enter Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
