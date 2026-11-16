"""Authoritative submission and evaluation persistence manager."""

import json
import logging
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.evaluator.engine import EvaluatorEngine, parse_pytest_output_cases
from app.core.evaluator.models import (
    AssessmentReport,
    SubmissionRecord,
    TestCaseResult,
    TestRunRecord,
)
from app.core.runner.isolated_runner import TestRunResult

logger = logging.getLogger("codevo.evaluator")


class SubmissionError(Exception):
    """Raised when submission validation fails."""


class SubmissionManager:
    """Manages test runs, immutable workspace snapshots, and authoritative assessment reports."""

    def __init__(self, base_storage_dir: Path | str | None = None) -> None:
        if base_storage_dir is None:
            backend_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.base_dir = backend_dir / "workspace_storage"
        else:
            self.base_dir = Path(base_storage_dir).resolve()

        self.submissions_dir = self.base_dir / "submissions"
        self.submissions_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.submissions_dir / "index.json"

        # In-memory lookup for latest test run per session
        self._latest_test_runs: dict[str, TestRunRecord] = {}
        self.engine = EvaluatorEngine()

    def record_test_run(
        self,
        session_id: str,
        result: TestRunResult,
        workspace_revisions: dict[str, int],
        candidate_id: str | None = None,
    ) -> TestRunRecord:
        """Create and persist a TestRunRecord from an execution result."""
        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
        run_id = f"tr-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Parse individual test cases from pytest stdout
        test_cases = parse_pytest_output_cases(result.stdout)
        if not test_cases and result.total_tests > 0:
            # Fallback if pytest concise output omitted individual names
            for i in range(result.passedTests):
                test_cases.append(
                    TestCaseResult(
                        id=f"tc-passed-{i+1}",
                        name=f"Test Suite Case {i+1}",
                        file="test_ci001_trusted.py",
                        status="passed",
                    )
                )
            for i in range(result.failed_tests):
                test_cases.append(
                    TestCaseResult(
                        id=f"tc-failed-{i+1}",
                        name=f"Failing Test Case {i+1}",
                        file="test_ci001_trusted.py",
                        status="failed",
                        failureMessage="Assertion failed during test execution",
                    )
                )

        record = TestRunRecord(
            id=run_id,
            sessionId=clean_id,
            candidateId=candidate_id,
            timestamp=now_iso,
            runnerType=result.runner_type,
            exitCode=result.exit_code,
            passed=result.passed,
            totalTests=result.total_tests,
            passedTests=result.passed_tests,
            failedTests=result.failed_tests,
            durationSeconds=result.duration_seconds,
            testCases=test_cases,
            workspaceRevisions=dict(workspace_revisions),
            stdout=result.stdout,
            stderr=result.stderr,
        )

        self._latest_test_runs[clean_id] = record

        # Save test run under session directory
        session_tr_dir = self.base_dir / clean_id / ".test_runs"
        session_tr_dir.mkdir(parents=True, exist_ok=True)
        record_path = session_tr_dir / f"{run_id}.json"
        record_path.write_text(record.model_dump_json(indent=2), encoding="utf-8")

        return record

    def get_latest_test_run(self, session_id: str) -> TestRunRecord | None:
        """Retrieve the most recent test run record for a session."""
        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
        if clean_id in self._latest_test_runs:
            return self._latest_test_runs[clean_id]

        # Check disk if restarted
        session_tr_dir = self.base_dir / clean_id / ".test_runs"
        if session_tr_dir.exists():
            runs = sorted(session_tr_dir.glob("tr-*.json"), key=os.path.getmtime, reverse=True)
            if runs:
                try:
                    data = json.loads(runs[0].read_text(encoding="utf-8"))
                    record = TestRunRecord(**data)
                    self._latest_test_runs[clean_id] = record
                    return record
                except Exception as exc:
                    logger.warning("Failed to load test run from disk: %s", exc)

        return None

    def create_submission(
        self,
        session_id: str,
        session_dir: Path,
        current_revisions: dict[str, int],
        user_id: str | None = None,
    ) -> AssessmentReport:
        """Validate eligibility, snapshot candidate workspace, and generate authoritative assessment."""
        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()

        # 1. Require a recorded test run (or synthesize unverified baseline if not executed)
        test_run = self.get_latest_test_run(clean_id)
        if not test_run:
            test_run = TestRunRecord(
                id=f"tr-untested-{uuid.uuid4().hex[:6]}",
                sessionId=clean_id,
                candidateId=user_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                runnerType="untested",
                exitCode=-1,
                passed=False,
                totalTests=0,
                passedTests=0,
                failedTests=0,
                durationSeconds=0.0,
                testCases=[],
                workspaceRevisions=dict(current_revisions),
            )
        else:
            # 2. Concurrency verification: verify workspace hasn't changed since test run
            for path, current_rev in current_revisions.items():
                test_rev = test_run.workspaceRevisions.get(path)
                if test_rev is not None and current_rev > test_rev:
                    raise SubmissionError(
                        f"Workspace file '{path}' was modified after the latest test run "
                        f"(current rev: {current_rev}, test rev: {test_rev}). "
                        "Please run tests again before submitting your solution."
                    )

        submission_id = f"sub-{clean_id}-{uuid.uuid4().hex[:6]}"
        sub_dir = self.submissions_dir / submission_id
        snapshot_dir = sub_dir / "snapshot"
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        # 3. Capture immutable workspace snapshot
        workspace_files: dict[str, str] = {}
        manifest_files: list[dict[str, Any]] = []

        for root, dirs, files in os.walk(session_dir):
            dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]
            for f in files:
                if f.startswith(".") or f.endswith(".pyc"):
                    continue
                full_path = Path(root) / f
                rel_path = full_path.relative_to(session_dir).as_posix()
                try:
                    content = full_path.read_text(encoding="utf-8")
                    workspace_files[rel_path] = content
                    dest = snapshot_dir / rel_path
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(full_path, dest)
                    manifest_files.append({
                        "path": rel_path,
                        "size": full_path.stat().st_size,
                        "revision": current_revisions.get(rel_path, 1),
                    })
                except Exception as exc:
                    logger.warning("Failed to snapshot file %s: %s", rel_path, exc)

        manifest = {
            "submissionId": submission_id,
            "sessionId": clean_id,
            "userId": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "testRunId": test_run.id,
            "files": manifest_files,
        }
        (sub_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        # 4. Generate rubric assessment
        report = self.engine.evaluate_ci001(
            submission_id=submission_id,
            session_id=clean_id,
            test_run=test_run,
            workspace_files=workspace_files,
            user_id=user_id,
        )

        # 5. Persist assessment report
        report_path = sub_dir / "assessment.json"
        report_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")

        # 6. Update submissions index
        self._append_to_index(report, test_run, user_id=user_id)

        return report

    def _append_to_index(
        self,
        report: AssessmentReport,
        test_run: TestRunRecord,
        user_id: str | None = None,
    ) -> None:
        """Record submission summary in the index."""
        record = SubmissionRecord(
            submissionId=report.submissionId,
            sessionId=report.sessionId,
            userId=user_id or report.userId,
            challengeId=report.challengeId,
            challengeTitle=report.challengeTitle,
            submittedAt=report.submittedAt,
            status=report.status,
            scorePercentage=report.overallScore,
            isDemoSubmission=False,
            testRunId=test_run.id,
            runnerType=test_run.runnerType,
            totalTests=test_run.totalTests,
            passedTests=test_run.passedTests,
            failedTests=test_run.failedTests,
        )

        entries = []
        if self.index_file.exists():
            try:
                entries = json.loads(self.index_file.read_text(encoding="utf-8"))
            except Exception:
                entries = []

        # Remove duplicate if exists
        entries = [e for e in entries if e.get("submissionId") != report.submissionId]
        entries.insert(0, record.model_dump())

        self.index_file.write_text(json.dumps(entries, indent=2), encoding="utf-8")

    def get_submission_report(self, submission_id: str) -> AssessmentReport | None:
        """Load an assessment report by submissionId."""
        clean_sub_id = "".join(c for c in submission_id if c.isalnum() or c in ("-", "_")).strip()
        report_path = self.submissions_dir / clean_sub_id / "assessment.json"
        if not report_path.exists():
            # If "latest", find the newest submission
            if clean_sub_id == "latest":
                if self.index_file.exists():
                    try:
                        entries = json.loads(self.index_file.read_text(encoding="utf-8"))
                        if entries:
                            latest_id = entries[0]["submissionId"]
                            return self.get_submission_report(latest_id)
                    except Exception:
                        pass
            return None

        try:
            data = json.loads(report_path.read_text(encoding="utf-8"))
            return AssessmentReport(**data)
        except Exception as exc:
            logger.error("Failed to parse assessment report %s: %s", clean_sub_id, exc)
            return None

    def list_submissions(
        self,
        user_id: str | None = None,
        include_dev: bool = False,
    ) -> list[SubmissionRecord]:
        """List historical submissions.

        If user_id is provided, returns ONLY submissions owned by that user.
        Legacy/dev submissions without a user_id are strictly excluded.
        If user_id is None and include_dev is False, returns [] (deny-by-default).
        """
        if not self.index_file.exists():
            return []

        try:
            data = json.loads(self.index_file.read_text(encoding="utf-8"))
            records = [SubmissionRecord(**item) for item in data]
            if user_id is not None:
                return [r for r in records if r.userId == user_id]
            if include_dev:
                return records
            return []
        except Exception as exc:
            logger.error("Failed to load submissions index: %s", exc)
            return []
