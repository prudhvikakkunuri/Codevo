"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Timer, Server, Layers, Cpu, Database, Network, ArrowRight } from "lucide-react";

export function ChallengeCatalogue() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    "All",
    "Backend Engineering",
    "Frontend Engineering",
    "AI & Machine Learning",
    "Data Engineering",
    "API Integration",
  ];

  const challenges = [
    {
      id: "CI-001",
      title: "Debug a Broken FastAPI Authentication API",
      category: "Backend Engineering",
      difficulty: "Medium",
      duration: "40 min",
      stack: "Python · FastAPI · Pytest",
      description:
        "Investigate failed password hashing verification, fix duplicate user registration handling, and sanitize error responses.",
      icon: Server,
    },
    {
      id: "CI-002",
      title: "Fix a Broken RAG Pipeline",
      category: "AI & Machine Learning",
      difficulty: "Hard",
      duration: "50 min",
      stack: "Python · Vector Search · Embeddings",
      description:
        "Diagnose ingestion chunking errors, resolve retrieval metadata loss, and enforce grounding abstention thresholds.",
      icon: Cpu,
    },
    {
      id: "CI-003",
      title: "Fix React and FastAPI Integration",
      category: "Frontend Engineering",
      difficulty: "Medium",
      duration: "45 min",
      stack: "React · TypeScript · FastAPI",
      description:
        "Align request/response contracts, resolve loading/empty race conditions, and prevent duplicate asynchronous form submissions.",
      icon: Layers,
    },
    {
      id: "CI-004",
      title: "Debug a Broken ETL Pipeline",
      category: "Data Engineering",
      difficulty: "Medium",
      duration: "45 min",
      stack: "Python · Pandas · SQLite",
      description:
        "Fix decimal precision drift, repair date parsing edge cases, implement deduplication, and account for rejected data rows.",
      icon: Database,
    },
    {
      id: "CI-005",
      title: "Fix an ML Prediction API",
      category: "AI & Machine Learning",
      difficulty: "Hard",
      duration: "50 min",
      stack: "Python · Scikit-learn · FastAPI",
      description:
        "Correct train/serve preprocessing skew, align feature vector ordering, and resolve inference latency regressions.",
      icon: Network,
    },
  ];

  const filtered =
    selectedCategory === "All"
      ? challenges
      : challenges.filter((c) => c.category === selectedCategory);

  const getCardGridClasses = (index: number, total: number) => {
    if (total === 5) {
      if (index === 3) return "lg:col-span-2 lg:col-start-2";
      if (index === 4) return "md:col-span-2 md:max-w-md md:mx-auto lg:max-w-none lg:mx-0 lg:col-span-2";
      return "lg:col-span-2";
    }
    if (total === 2) {
      if (index === 0) return "lg:col-span-2 lg:col-start-2";
      return "lg:col-span-2";
    }
    if (total === 1) {
      return "md:col-span-2 lg:col-span-2 lg:col-start-3 w-full max-w-md mx-auto";
    }
    return "lg:col-span-2";
  };

  return (
    <section id="challenges" className="py-20 sm:py-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div className="space-y-2.5 max-w-xl">
            <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider px-3 py-1">
              Challenge Catalogue
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Practical interview challenges
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Authentic bugs and features sourced from real production environments. Every challenge features server-authoritative time limits and automated test suites.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 font-medium">
            5 Initial MVP Challenges
          </span>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                selectedCategory === category
                  ? "bg-foreground text-background border-foreground font-semibold shadow-sm"
                  : "bg-secondary/60 text-zinc-400 border-border hover:bg-secondary hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Symmetrically Balanced Challenge Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {filtered.map((challenge, index) => {
            const Icon = challenge.icon;
            const placementClass = getCardGridClasses(index, filtered.length);
            return (
              <Card
                key={challenge.id}
                className={`flex flex-col justify-between group hover:border-zinc-700 transition-colors shadow-sm h-full ${placementClass}`}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-400 font-semibold">
                      {challenge.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={challenge.difficulty === "Hard" ? "destructive" : "secondary"}
                        className="font-mono text-xs px-2 py-0.5"
                      >
                        {challenge.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs font-mono text-zinc-400 font-medium">
                        <Timer className="size-3.5" />
                        {challenge.duration}
                      </span>
                    </div>
                  </div>

                  <CardTitle className="text-base font-semibold group-hover:text-foreground transition-colors flex items-start gap-2.5">
                    <Icon className="size-4 shrink-0 mt-1 text-zinc-300" />
                    <span>{challenge.title}</span>
                  </CardTitle>

                  <CardDescription className="leading-relaxed text-xs text-zinc-400">
                    {challenge.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="rounded-md border border-border bg-secondary/60 p-2.5 space-y-1">
                    <div className="text-xs font-mono text-zinc-400 font-medium">Stack:</div>
                    <div className="text-xs font-mono text-foreground font-semibold">{challenge.stack}</div>
                  </div>
                </CardContent>

                <CardFooter className="justify-between pt-3 border-t border-border/50">
                  <span className="text-xs font-mono text-zinc-400 font-medium">
                    {challenge.category}
                  </span>
                  <a
                    href="#cta"
                    className={buttonVariants({
                      size: "xs",
                      variant: "outline",
                      className: "gap-1 text-xs font-medium",
                    })}
                  >
                    Preview <ArrowRight className="size-3" />
                  </a>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
