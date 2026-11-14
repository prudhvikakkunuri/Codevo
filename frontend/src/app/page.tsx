import React from "react";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { WorkspacePreview } from "@/components/marketing/workspace-preview";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ChallengeCatalogue } from "@/components/marketing/challenge-catalogue";
import { AiModes } from "@/components/marketing/ai-modes";
import { CtaSection } from "@/components/marketing/cta-section";
import { Footer } from "@/components/marketing/footer";

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-muted selection:text-foreground overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <WorkspacePreview />
        <HowItWorks />
        <ChallengeCatalogue />
        <AiModes />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
