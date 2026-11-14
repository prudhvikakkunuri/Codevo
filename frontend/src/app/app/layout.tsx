import type { Metadata } from "next";
import { AppShell } from "@/components/application/app-shell";

export const metadata: Metadata = {
  title: "Dashboard — Codevo",
  description: "Codevo engineering interview practice platform.",
};

export default function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}

