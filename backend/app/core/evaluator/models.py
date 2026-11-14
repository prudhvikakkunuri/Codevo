"""Pydantic data models for evaluation, test run tracking, and assessment reports."""

from typing import Any, Literal
from pydantic import BaseModel, Field


class TestCaseResult(BaseModel):
    id: str
    name: str
    file: str
    status: Literal["passed", "failed"]
    failureMessage: str | None = None


class TestRunRecord(BaseModel):
    id: str
    sessionId: str
    timestamp: str
    runnerType: str  # "docker", "subprocess", "docker_unavailable"
    exitCode: int
    passed: bool
    totalTests: int
    passedTests: int
    failedTests: int
    durationSeconds: float
    testCases: list[TestCaseResult] = Field(default_factory=list)
    workspaceRevisions: dict[str, int] = Field(default_factory=dict)
    stdout: str = ""
    stderr: str = ""


class RubricCategoryScore(BaseModel):
    id: str
    name: str
    weightPercentage: float
    scorePercentage: float  # 0 - 100
    weightedContribution: float
    status: Literal["strong", "adequate", "needs-work"]
    explanation: str
    supportingEvidence: str
    actionableRecommendation: str


class FeedbackItem(BaseModel):
    id: str
    title: str
    description: str
    demonstratedEvidence: str


class ActionableRecommendation(BaseModel):
    id: str
    priority: Literal["High", "Medium", "Low"]
    recommendation: str
    rationale: str


class AutomatedTestSnapshot(BaseModel):
    total: int
    passed: int
    failed: int
    simulatedDurationSec: float
    isSimulatedOnly: bool = False
    summaryNote: str
    runnerType: str = "docker"
    testCases: list[TestCaseResult] = Field(default_factory=list)


class WorkspaceSnapshotSummary(BaseModel):
    totalFiles: int
    modifiedFilesCount: int
    modifiedFileNames: list[str] = Field(default_factory=list)


class AssessmentReport(BaseModel):
    submissionId: str
    sessionId: str
    challengeId: str
    challengeTitle: str
    submittedAt: str
    completedDurationMinutes: int
    status: Literal["evaluated", "evaluating", "failed"] = "evaluated"
    isDemoAssessment: bool = False
    overallScore: float  # 0 - 100
    performanceRating: Literal["Exceeds Expectations", "Meets Expectations", "Needs Improvement"]
    ratingDescription: str
    rubricCategories: list[RubricCategoryScore]
    automatedTests: AutomatedTestSnapshot
    strengths: list[FeedbackItem]
    improvementAreas: list[FeedbackItem]
    recommendations: list[ActionableRecommendation]
    workspaceSnapshotSummary: WorkspaceSnapshotSummary


class SubmissionRecord(BaseModel):
    submissionId: str
    sessionId: str
    challengeId: str
    challengeTitle: str
    submittedAt: str
    status: Literal["evaluated", "evaluating", "failed"] = "evaluated"
    scorePercentage: float
    isDemoSubmission: bool = False
    testRunId: str | None = None
    runnerType: str = "docker"
    totalTests: int = 0
    passedTests: int = 0
    failedTests: int = 0

