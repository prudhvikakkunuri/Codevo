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
    value: "0",
    helperText: "No completed interviews",
    isPlaceholder: true,
  },
  {
    id: "average-score",
    label: "Average Score",
    value: "--",
    helperText: "Calculated upon evaluation",
    isPlaceholder: true,
  },
];

// Centralized completed interview history records (empty for authentic user isolation)
export const DEMO_INTERVIEW_HISTORY: InterviewHistoryRecord[] = [];
