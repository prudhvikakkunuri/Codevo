export type ChallengeDifficulty = "Easy" | "Medium" | "Hard";

export interface Challenge {
  id: string;
  title: string;
  category: string;
  difficulty: ChallengeDifficulty;
  duration: string;
  durationMinutes: number;
  stack: string;
  description: string;
  problemSummary: string;
  requirements: string[];
  engineeringFocus: string;
  supportedLanguages: string[];
}

export const OFFICIAL_CHALLENGES: Challenge[] = [
  {
    id: "CI-001",
    title: "Debug a Broken FastAPI Authentication API",
    category: "Backend Engineering",
    difficulty: "Medium",
    duration: "40 min",
    durationMinutes: 40,
    stack: "Python · FastAPI · Pytest",
    description:
      "Investigate failed password hashing verification, fix duplicate user registration handling, and sanitize error responses.",
    problemSummary:
      "The user authentication service is failing critical integration tests. Password hashing salt verification contains subtle bugs, duplicate registration attempts return unhandled database exceptions, and error responses leak internal server details.",
    requirements: [
      "Fix registration input validation and user schema parsing.",
      "Repair password hashing and secure verification logic.",
      "Handle duplicate email registration gracefully with appropriate HTTP 409 responses.",
      "Sanitize error payloads to prevent internal exception stack traces from reaching clients.",
      "Ensure all public test assertions pass without altering public test contracts.",
    ],
    engineeringFocus:
      "Web API contract compliance, error handling, security hygiene, and clean architectural separation between route handlers and database repositories.",
    supportedLanguages: ["Python 3.11"],
  },
  {
    id: "CI-002",
    title: "Fix a Broken RAG Pipeline",
    category: "AI & Machine Learning",
    difficulty: "Hard",
    duration: "50 min",
    durationMinutes: 50,
    stack: "Python · Vector Search · Embeddings",
    description:
      "Diagnose ingestion chunking errors, resolve retrieval metadata loss, and enforce grounding abstention thresholds.",
    problemSummary:
      "A retrieval-augmented generation (RAG) backend produces hallucinated or empty responses due to pipeline defects. Document chunking introduces boundary truncation, metadata citations are discarded during vector serialization, and the model attempts generation when retrieval confidence falls below threshold.",
    requirements: [
      "Repair document ingestion and sliding-window chunking algorithms.",
      "Fix vector database query serialization to retain document metadata and source citations.",
      "Implement a grounding threshold that cleanly triggers model abstention on ungrounded prompts.",
      "Verify pipeline throughput under sequential multi-document retrieval tests.",
    ],
    engineeringFocus:
      "Embedding transformations, vector retrieval precision, citation tracing, and defensive prompt-grounding validation.",
    supportedLanguages: ["Python 3.11"],
  },
  {
    id: "CI-003",
    title: "Fix React and FastAPI Integration",
    category: "Frontend Engineering",
    difficulty: "Medium",
    duration: "45 min",
    durationMinutes: 45,
    stack: "React · TypeScript · FastAPI",
    description:
      "Align request/response contracts, resolve loading/empty race conditions, and prevent duplicate asynchronous form submissions.",
    problemSummary:
      "A fullstack task-tracking application suffers from runtime synchronization bugs. The React client and FastAPI backend have divergent schema types, rapid asynchronous button clicks spawn duplicate submissions, and in-flight request race conditions trigger empty flicker states.",
    requirements: [
      "Align client TypeScript interfaces with backend Pydantic API response models.",
      "Resolve asynchronous request cancellation and state race conditions.",
      "Prevent duplicate form submissions through optimistic locking or submission disabling.",
      "Implement resilient loading, error, and empty component states.",
    ],
    engineeringFocus:
      "End-to-end type safety, asynchronous UI state management, defensive API integration, and edge-case error recovery.",
    supportedLanguages: ["TypeScript 5.x", "Python 3.11"],
  },
  {
    id: "CI-004",
    title: "Debug a Broken ETL Pipeline",
    category: "Data Engineering",
    difficulty: "Medium",
    duration: "45 min",
    durationMinutes: 45,
    stack: "Python · Pandas · SQLite",
    description:
      "Fix decimal precision drift, repair date parsing edge cases, implement deduplication, and account for rejected data rows.",
    problemSummary:
      "A batch financial transaction ETL pipeline produces incorrect balance totals and crashes on international date formats. Floating-point conversions cause penny discrepancies, non-standard timestamps fail ingestion, and duplicate ledger entries are loaded idempotently.",
    requirements: [
      "Replace floating-point calculations with exact decimal arithmetic to prevent precision drift.",
      "Implement robust date parsing supporting ISO-8601 and localized financial date formats.",
      "Build deduplication and idempotent staging load routines for re-runnable pipelines.",
      "Establish dead-letter accounting to log and report rejected rows without halting execution.",
    ],
    engineeringFocus:
      "Data consistency, numeric precision, defensive parsing, fault-tolerant batch operations, and idempotent ledger loading.",
    supportedLanguages: ["Python 3.11"],
  },
  {
    id: "CI-005",
    title: "Fix an ML Prediction API",
    category: "AI & Machine Learning",
    difficulty: "Hard",
    duration: "50 min",
    durationMinutes: 50,
    stack: "Python · Scikit-learn · FastAPI",
    description:
      "Correct train/serve preprocessing skew, align feature vector ordering, and resolve inference latency regressions.",
    problemSummary:
      "A real-time fraud prediction model deployed via FastAPI delivers degraded prediction accuracy compared to offline evaluation benchmarks. The inference pipeline exhibits feature order mismatch during matrix encoding, missing-value imputation behaves differently than training time, and unvectorized loop calculations degrade latency.",
    requirements: [
      "Eliminate training/serving skew by synchronizing feature transformation pipelines.",
      "Ensure input dictionary keys are strictly aligned to model feature column ordering.",
      "Harmonize null/NaN imputation rules between training and live inference.",
      "Optimize prediction inference routines to satisfy baseline latency SLAs under batch requests.",
    ],
    engineeringFocus:
      "Model deployment integrity, feature engineering reproducibility, matrix vectorization, and inference performance validation.",
    supportedLanguages: ["Python 3.11"],
  },
];

export const ALL_CATEGORIES = [
  "All",
  "Backend Engineering",
  "AI & Machine Learning",
  "Frontend Engineering",
  "Data Engineering",
] as const;

export const ALL_DIFFICULTIES = [
  "All",
  "Easy",
  "Medium",
  "Hard",
] as const;
