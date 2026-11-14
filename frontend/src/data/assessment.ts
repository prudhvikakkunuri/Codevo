/**
 * Codevo — Candidate Assessment & Results Data Model (Milestone 1.8)
 *
 * All scores, rubrics, weights, evidence, and evaluations in this file are
 * illustrative demonstration fixtures for Phase 1. They do NOT represent
 * official evaluation criteria, hidden test fixtures, or real AI evaluations.
 */

import { OFFICIAL_CHALLENGES } from "./challenges";
import type { LiveTestCase } from "@/lib/test-runner";

export interface RubricCategoryScore {
  id: string;
  name: string;
  weightPercentage: number;
  scorePercentage: number; // 0 - 100
  weightedContribution: number; // (scorePercentage * weightPercentage) / 100
  status: "strong" | "adequate" | "needs-work";
  explanation: string;
  supportingEvidence: string;
  actionableRecommendation: string;
}

export interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  demonstratedEvidence: string;
}

export interface ActionableRecommendation {
  id: string;
  priority: "High" | "Medium" | "Low";
  recommendation: string;
  rationale: string;
}

export interface AutomatedTestSnapshot {
  total: number;
  passed: number;
  failed: number;
  simulatedDurationSec: number;
  isSimulatedOnly: boolean;
  summaryNote: string;
  runnerType?: string;
  testCases?: LiveTestCase[];
}

export interface AssessmentReport {
  submissionId: string;
  sessionId: string;
  challengeId: string;
  challengeTitle: string;
  submittedAt: string;
  completedDurationMinutes: number;
  status: "evaluated" | "evaluating" | "failed";
  isDemoAssessment: boolean;
  overallScore: number; // 0 - 100 (weighted sum of rubric categories)
  performanceRating: "Exceeds Expectations" | "Meets Expectations" | "Needs Improvement";
  ratingDescription: string;
  rubricCategories: RubricCategoryScore[];
  automatedTests: AutomatedTestSnapshot;
  strengths: FeedbackItem[];
  improvementAreas: FeedbackItem[];
  recommendations: ActionableRecommendation[];
  workspaceSnapshotSummary: {
    totalFiles: number;
    modifiedFilesCount: number;
    modifiedFileNames: string[];
  };
}

export interface SubmissionRecord {
  submissionId: string;
  sessionId: string;
  challengeId: string;
  challengeTitle: string;
  submittedAt: string;
  status: "evaluated" | "evaluating" | "failed";
  scorePercentage: number;
  isDemoSubmission: boolean;
  testRunId?: string;
  runnerType?: string;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  submittedDocuments?: Record<string, { content: string; isModified: boolean }>;
}

/**
 * Deterministic Demo Assessment Report for CI-001 (FastAPI Auth Service)
 *
 * Mathematical Score Verification:
 * Category 1 (Correctness):            Score 75 * 0.40 weight = 30.0
 * Category 2 (Security Hygiene):       Score 80 * 0.25 weight = 20.0
 * Category 3 (Contract & Error):       Score 80 * 0.20 weight = 16.0
 * Category 4 (Structure & Maint.):     Score 80 * 0.15 weight = 12.0
 * Total Overall Score: 30.0 + 20.0 + 16.0 + 12.0 = 78.0 / 100
 */
export const DEMO_ASSESSMENT_REPORT: AssessmentReport = {
  submissionId: "sub-ci001-demo-01",
  sessionId: "ci-001-demo",
  challengeId: "CI-001",
  challengeTitle: OFFICIAL_CHALLENGES[0].title,
  submittedAt: "2026-11-13T19:40:00Z",
  completedDurationMinutes: 32,
  status: "evaluated",
  isDemoAssessment: true,
  overallScore: 78,
  performanceRating: "Meets Expectations",
  ratingDescription:
    "Demonstrates competent API debugging skills and security awareness. Successfully addresses core authentication requirements while highlighting areas for edge-case test coverage and stricter schema validation.",
  rubricCategories: [
    {
      id: "rubric-correctness",
      name: "Functional Correctness & Verification",
      weightPercentage: 40,
      scorePercentage: 75,
      weightedContribution: 30.0,
      status: "adequate",
      explanation:
        "Public endpoint tests confirm registration, duplicate email rejection, and valid login work as specified. Edge cases around malformed authentication headers require additional guards.",
      supportingEvidence:
        "Demo Code Evidence: Implemented user existence check in `register_user()` raising appropriate HTTP 409 responses.",
      actionableRecommendation:
        "Add explicit boundary tests verifying unicode passwords and case-insensitive email collision prevention.",
    },
    {
      id: "rubric-security",
      name: "Security & Validation Hygiene",
      weightPercentage: 25,
      scorePercentage: 80,
      weightedContribution: 20.0,
      status: "strong",
      explanation:
        "Eliminated plaintext password leaks and utilized salted bcrypt hashing. Error responses do not leak internal database state or exception tracebacks.",
      supportingEvidence:
        "Demo Code Evidence: Replaced plaintext assignments with `hash_password()` and sanitized internal server error messages.",
      actionableRecommendation:
        "Consider introducing password complexity validation (minimum entropy/length check) before hashing.",
    },
    {
      id: "rubric-error-handling",
      name: "Error Handling & Contract Compliance",
      weightPercentage: 20,
      scorePercentage: 80,
      weightedContribution: 16.0,
      status: "strong",
      explanation:
        "API contracts conform to REST standards with explicit HTTP status codes (401 Unauthorized, 409 Conflict, 422 Unprocessable Entity).",
      supportingEvidence:
        "Demo Code Evidence: Proper FastAPI HTTPException propagation with structured detail payloads.",
      actionableRecommendation:
        "Standardize error payload schema across both authentication and user lookup endpoints.",
    },
    {
      id: "rubric-code-quality",
      name: "Code Structure & Maintainability",
      weightPercentage: 15,
      scorePercentage: 80,
      weightedContribution: 12.0,
      status: "strong",
      explanation:
        "Clean separation between Pydantic schemas, route controllers, and service business logic. Types are appropriately annotated.",
      supportingEvidence:
        "Demo Code Evidence: Maintained modular imports and preserved existing dependency injection patterns in `routes/auth.py`.",
      actionableRecommendation:
        "Document custom exception hierarchies with docstrings explaining expected HTTP mappings.",
    },
  ],
  automatedTests: {
    total: 5,
    passed: 3,
    failed: 2,
    simulatedDurationSec: 1.42,
    isSimulatedOnly: true,
    summaryNote:
      "Automated test execution results are simulated frontend fixtures and remain strictly decoupled from the qualitative rubric evaluation.",
  },
  strengths: [
    {
      id: "strength-1",
      title: "Proper Duplicate Email Prevention",
      description:
        "Identified the missing uniqueness validation in the user registration service and introduced an early exit with appropriate HTTP 409 Conflict status.",
      demonstratedEvidence:
        "`app/services/authentication.py`: Added email lookup check against `USERS_DB` prior to hashing or storing new records.",
    },
    {
      id: "strength-2",
      title: "Sanitized Error Responses",
      description:
        "Safely caught unhandled database exceptions to prevent raw database tracebacks and internal architecture details from leaking to clients.",
      demonstratedEvidence:
        "`app/routes/auth.py`: Wrapped repository calls with structured `HTTPException` detail dictionaries.",
    },
    {
      id: "strength-3",
      title: "Clean Separation of Concerns",
      description:
        "Kept hashing utilities in `app/utils/security.py` isolated from route controllers, preserving modularity and testability.",
      demonstratedEvidence:
        "Maintained existing dependency injection contracts without introducing tight coupling.",
    },
  ],
  improvementAreas: [
    {
      id: "improvement-1",
      title: "Incomplete Password Hashing Verification",
      description:
        "Password verification logic in starter code contained invalid salt verification that was not completely patched before submission.",
      demonstratedEvidence:
        "`tests/test_auth.py::test_password_hashing`: Assertion failed when comparing stored hash prefix with bcrypt output.",
    },
    {
      id: "improvement-2",
      title: "Case Sensitivity in Email Registration",
      description:
        "Email uniqueness comparison does not normalize email addresses (e.g., lowercasing), allowing potential collisions with mixed-case emails.",
      demonstratedEvidence:
        "`app/services/authentication.py`: Lookup compared raw string without `.strip().lower()` normalization.",
    },
    {
      id: "improvement-3",
      title: "Missing Integration Test Fixture Coverage",
      description:
        "No custom test assertions were added to `tests/test_auth.py` to verify the new sanitized error payloads.",
      demonstratedEvidence:
        "`tests/test_auth.py`: Only original public test cases were executed; no regression tests were committed.",
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      priority: "High",
      recommendation: "Ensure string normalization on all unique identity fields (email/username)",
      rationale:
        "RFC 5321 treats mailbox names uniquely, but user expectations in web applications require case-insensitive handling to prevent account takeover or duplicate accounts.",
    },
    {
      id: "rec-2",
      priority: "Medium",
      recommendation: "Audit cryptographic salt rounds and verification flows",
      rationale:
        "Always verify that password hashing functions use sufficient work factors (e.g., bcrypt cost factor >= 12) and verify hashes using constant-time string comparison.",
    },
    {
      id: "rec-3",
      priority: "Low",
      recommendation: "Add regression tests when fixing security vulnerabilities",
      rationale:
        "Writing a failing test before applying a security fix prevents future regressions and verifies contract compliance.",
    },
  ],
  workspaceSnapshotSummary: {
    totalFiles: 10,
    modifiedFilesCount: 2,
    modifiedFileNames: ["app/services/authentication.py", "app/routes/auth.py"],
  },
};

/**
 * Storage helpers for client-side submission state persistence
 */
const SUBMISSION_STORAGE_PREFIX = "codevo:submission:v1:";

const submissionListeners = new Set<() => void>();

export function subscribeToSubmissionChanges(listener: () => void): () => void {
  submissionListeners.add(listener);
  return () => {
    submissionListeners.delete(listener);
  };
}

function notifySubmissionChange(): void {
  cachedSubmissionRaw = null;
  cachedSubmissionRecord = null;
  submissionListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("[Codevo] Error in submission listener:", err);
    }
  });
}

export function getSubmissionStorageKey(sessionId: string): string {
  return `${SUBMISSION_STORAGE_PREFIX}${sessionId.trim().toLowerCase()}`;
}

export function clearClientSubmission(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getSubmissionStorageKey(sessionId);
    localStorage.removeItem(key);
    cachedSubmissionRaw = null;
    cachedSubmissionRecord = null;
    cachedSubmissionKey = null;
    notifySubmissionChange();
  } catch {
    // ignore storage access errors
  }
}

export function isSessionSubmitted(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(getSubmissionStorageKey(sessionId));
    return !!raw;
  } catch {
    return false;
  }
}

let cachedSubmissionRaw: string | null = null;
let cachedSubmissionRecord: SubmissionRecord | null = null;
let cachedSubmissionKey: string | null = null;

export function getStoredSubmission(sessionId: string): SubmissionRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getSubmissionStorageKey(sessionId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      cachedSubmissionRaw = null;
      cachedSubmissionRecord = null;
      cachedSubmissionKey = key;
      return null;
    }
    if (raw === cachedSubmissionRaw && key === cachedSubmissionKey && cachedSubmissionRecord !== null) {
      return cachedSubmissionRecord;
    }
    cachedSubmissionRaw = raw;
    cachedSubmissionKey = key;
    cachedSubmissionRecord = JSON.parse(raw) as SubmissionRecord;
    return cachedSubmissionRecord;
  } catch {
    return null;
  }
}

export function recordClientSubmission(
  sessionId: string,
  submissionId: string = DEMO_ASSESSMENT_REPORT.submissionId,
  documentsSnapshot?: Record<string, { content: string; isModified: boolean }>
): SubmissionRecord {
  // Enforce idempotency: Never overwrite an existing submission record!
  const existing = getStoredSubmission(sessionId);
  if (existing) {
    return existing;
  }

  const record: SubmissionRecord = {
    submissionId,
    sessionId,
    challengeId: DEMO_ASSESSMENT_REPORT.challengeId,
    challengeTitle: DEMO_ASSESSMENT_REPORT.challengeTitle,
    submittedAt: new Date().toISOString(),
    status: "evaluated",
    scorePercentage: DEMO_ASSESSMENT_REPORT.overallScore,
    isDemoSubmission: true,
    submittedDocuments: documentsSnapshot ? JSON.parse(JSON.stringify(documentsSnapshot)) : undefined,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getSubmissionStorageKey(sessionId), JSON.stringify(record));
      notifySubmissionChange();
    } catch {
      // ignore quota errors in private browsing
    }
  }

  return record;
}

