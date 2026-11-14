"use client";

import React, { useState, useMemo } from "react";
import { OFFICIAL_CHALLENGES, type Challenge } from "@/data/challenges";
import { ChallengeSearch } from "./challenge-search";
import { ChallengeFilters } from "./challenge-filters";
import { ChallengeCard } from "./challenge-card";
import { ChallengeDetailsDialog } from "./challenge-details-dialog";
import { EmptyState } from "@/components/application/empty-state";
import { Code2 } from "lucide-react";

export function ChallengeLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [briefingChallenge, setBriefingChallenge] = useState<Challenge | null>(null);

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedDifficulty !== "All";

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedDifficulty("All");
  };

  // Filtered challenges logic (case-insensitive across title, id, category, stack, description)
  const filteredChallenges = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return OFFICIAL_CHALLENGES.filter((challenge) => {
      // Category match
      if (selectedCategory !== "All" && challenge.category !== selectedCategory) {
        return false;
      }

      // Difficulty match
      if (selectedDifficulty !== "All" && challenge.difficulty !== selectedDifficulty) {
        return false;
      }

      // Search query match
      if (query) {
        const matchesId = challenge.id.toLowerCase().includes(query);
        const matchesTitle = challenge.title.toLowerCase().includes(query);
        const matchesCategory = challenge.category.toLowerCase().includes(query);
        const matchesStack = challenge.stack.toLowerCase().includes(query);
        const matchesDescription = challenge.description.toLowerCase().includes(query);

        if (!matchesId && !matchesTitle && !matchesCategory && !matchesStack && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="rounded-lg border border-border/60 bg-card/25 p-4 sm:p-5 space-y-4">
        <ChallengeSearch value={searchQuery} onChange={setSearchQuery} />
        <ChallengeFilters
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={setSelectedDifficulty}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Result Count Status Bar */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span className="font-mono">
          Showing {filteredChallenges.length} of {OFFICIAL_CHALLENGES.length} challenges
        </span>
        {hasActiveFilters && (
          <span className="text-[11px] font-mono text-zinc-500">
            Filtered view
          </span>
        )}
      </div>

      {/* Challenge Cards Grid or Zero-Results Empty State */}
      {filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onViewDetails={(c) => setBriefingChallenge(c)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon={Code2}
          title="No matching challenges found"
          description="No engineering challenges match your search query or selected filters. Try broadening your criteria or reset the filters."
          actionLabel="Reset All Filters"
          actionOnClick={handleResetFilters}
        />
      )}

      {/* Challenge Requirements Briefing Dialog */}
      <ChallengeDetailsDialog
        challenge={briefingChallenge}
        isOpen={Boolean(briefingChallenge)}
        onClose={() => setBriefingChallenge(null)}
      />
    </div>
  );
}

