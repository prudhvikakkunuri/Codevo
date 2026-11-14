export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  helperText: string;
  isPlaceholder?: boolean;
}

export interface InterviewHistoryRecord {
  id: string;
  submissionId: string;
  challengeId: string;
  challengeTitle: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  durationMinutes: number;
  completedAt: string;
  status: "passed" | "failed" | "timed_out";
  scorePercentage: number;
  assertionsPassed: number;
  assertionsTotal: number;
}

export const DEMO_DASHBOARD_METRICS: DashboardMetric[] = [
  {
    id: "available-challenges",
    label: "Available Challenges",
    value: "5",
    helperText: "MVP Challenge Library",
    isPlaceholder: false,
  },
  {
    id: "active-sessions",
    label: "Active Sessions",
    value: "0",
    helperText: "No in-progress assessments",
    isPlaceholder: true,
  },
  {
    id: "completed-interviews",
    label: "Completed Interviews",
    value: "1",
    helperText: "Demonstration submission",
    isPlaceholder: false,
  },
  {
    id: "average-score",
    label: "Average Score",
    value: "78%",
    helperText: "Demo evaluation",
    isPlaceholder: false,
  },
];

// Centralized completed interview history records for Phase 1 demo
export const DEMO_INTERVIEW_HISTORY: InterviewHistoryRecord[] = [
  {
    id: "hist-001",
    submissionId: "sub-ci001-demo-01",
    challengeId: "CI-001",
    challengeTitle: "Debug a Broken FastAPI Authentication API",
    difficulty: "Medium",
    category: "Backend Engineering",
    durationMinutes: 32,
    completedAt: "2026-11-13T19:40:00Z",
    status: "passed",
    scorePercentage: 78,
    assertionsPassed: 3,
    assertionsTotal: 5,
  },
];
