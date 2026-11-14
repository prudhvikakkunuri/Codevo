"""Unit and integration tests for Evaluator Engine, Submission Manager, and endpoints."""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.core.agent.workspace_manager import SessionWorkspaceManager
from app.core.evaluator.submission_manager import SubmissionManager, SubmissionError
from app.core.evaluator.engine import parse_pytest_output_cases
from app.core.runner.isolated_runner import TestRunResult


SAMPLE_PYTEST_STDOUT = """
============================= test session starts ==============================
platform linux -- Python 3.11.8, pytest-8.1.1
rootdir: /workspace
configfile: pyproject.toml
collected 6 items

../trusted_tests/test_ci001_trusted.py::test_password_hashing_and_verification_correctness PASSED [ 16%]
../trusted_tests/test_ci001_trusted.py::test_user_registration_success PASSED    [ 33%]
../trusted_tests/test_ci001_trusted.py::test_duplicate_registration_raises_http_409_conflict PASSED [ 50%]
../trusted_tests/test_ci001_trusted.py::test_authenticate_user_success PASSED   [ 66%]
../trusted_tests/test_ci001_trusted.py::test_authenticate_user_invalid_password_sanitized PASSED [ 83%]
../trusted_tests/test_ci001_trusted.py::test_authenticate_user_nonexistent_sanitized PASSED [100%]

============================== 6 passed in 3.12s ===============================
"""


def test_parse_pytest_output_cases():
    """Verify regex extraction of test names and status from pytest -v output."""
    cases = parse_pytest_output_cases(SAMPLE_PYTEST_STDOUT)
    assert len(cases) == 6

    names = [c.name for c in cases]
    assert "Password Hashing And Verification Correctness" in names
    assert "User Registration Success" in names
    assert "Duplicate Registration Raises Http 409 Conflict" in names
    assert "Authenticate User Success" in names
    assert "Authenticate User Invalid Password Sanitized" in names
    assert "Authenticate User Nonexistent Sanitized" in names

    assert all(c.status == "passed" for c in cases)
    assert all(c.file == "test_ci001_trusted.py" for c in cases)


def test_submission_manager_and_evaluator_engine(tmp_path: Path):
    """Verify full submission flow: test run recording, snapshot creation, and rubric evaluation."""
    ws_mgr = SessionWorkspaceManager(base_storage_dir=tmp_path / "workspaces")
    sub_mgr = SubmissionManager(base_storage_dir=tmp_path / "workspaces")

    session_id = "test-eval-session"
    ws_dir = ws_mgr.initialize_ci001_workspace(session_id)

    # Simulate fixed code in workspace
    sec_file = ws_mgr.resolve_safe_path(session_id, "app/utils/security.py")
    sec_file.write_text(
        "from argon2 import PasswordHasher\nfrom argon2.exceptions import VerifyMismatchError\n\n"
        "ph = PasswordHasher()\ndef hash_password(p: str) -> str:\n    return ph.hash(p)\n\n"
        "def verify_password(p: str, h: str) -> bool:\n    try:\n        return ph.verify(h, p)\n"
        "    except Exception:\n        return False\n",
        encoding="utf-8",
    )

    auth_file = ws_mgr.resolve_safe_path(session_id, "app/services/authentication.py")
    auth_file.write_text(
        "from fastapi import HTTPException, status\n"
        "from app.models.user import UserCreate\n\n"
        "USERS_DB = {}\n\n"
        "class AuthenticationService:\n"
        "    def register_user(self, payload: UserCreate):\n"
        "        if payload.email in USERS_DB:\n"
        "            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already registered')\n"
        "        USERS_DB[payload.email] = payload\n"
        "        return {'email': payload.email, 'full_name': payload.full_name}\n\n"
        "    def authenticate_user(self, email: str, password: str):\n"
        "        if email not in USERS_DB:\n"
        "            return {'error': 'Invalid credentials'}\n"
        "        return {'status': 'authenticated', 'user_id': 'u1', 'token': 'tok'}\n",
        encoding="utf-8",
    )

    current_revs = ws_mgr.get_all_revisions(session_id)

    # 1. Record Docker test run with 6 passing tests
    test_result = TestRunResult(
        exit_code=0,
        passed=True,
        stdout=SAMPLE_PYTEST_STDOUT,
        stderr="",
        duration_seconds=3.12,
        total_tests=6,
        passed_tests=6,
        failed_tests=0,
        runner_type="docker",
    )
    test_record = sub_mgr.record_test_run(session_id, test_result, current_revs)
    assert test_record.runnerType == "docker"
    assert test_record.passed is True
    assert len(test_record.testCases) == 6

    # 2. Submit solution
    report = sub_mgr.create_submission(session_id, ws_dir, current_revs)

    assert report.isDemoAssessment is False
    assert report.challengeId == "CI-001"
    assert report.automatedTests.total == 6
    assert report.automatedTests.passed == 6
    assert report.automatedTests.failed == 0
    assert report.automatedTests.runnerType == "docker"
    assert len(report.automatedTests.testCases) == 6
    assert report.overallScore == 100.0
    assert report.performanceRating == "Exceeds Expectations"

    # Verify 4 rubric categories
    assert len(report.rubricCategories) == 4
    cat_ids = [c.id for c in report.rubricCategories]
    assert "rubric-correctness" in cat_ids
    assert "rubric-security" in cat_ids
    assert "rubric-error-handling" in cat_ids
    assert "rubric-code-quality" in cat_ids

    # 3. Retrieve submission report
    loaded = sub_mgr.get_submission_report(report.submissionId)
    assert loaded is not None
    assert loaded.submissionId == report.submissionId
    assert loaded.overallScore == 100.0

    # 4. Check index
    submissions = sub_mgr.list_submissions()
    assert len(submissions) >= 1
    assert submissions[0].submissionId == report.submissionId


def test_concurrency_guard_rejects_modified_workspace_after_test_run(tmp_path: Path):
    """Verify that editing files after running tests triggers an optimistic concurrency rejection."""
    ws_mgr = SessionWorkspaceManager(base_storage_dir=tmp_path / "workspaces")
    sub_mgr = SubmissionManager(base_storage_dir=tmp_path / "workspaces")

    session_id = "test-concurrency-session"
    ws_dir = ws_mgr.initialize_ci001_workspace(session_id)

    # Initial test run recorded at revision 1
    revs_at_test = ws_mgr.get_all_revisions(session_id)
    test_result = TestRunResult(
        exit_code=0,
        passed=True,
        stdout=SAMPLE_PYTEST_STDOUT,
        stderr="",
        duration_seconds=2.0,
        total_tests=6,
        passed_tests=6,
        failed_tests=0,
        runner_type="docker",
    )
    sub_mgr.record_test_run(session_id, test_result, revs_at_test)

    # Candidate edits a file (revision increments to 2)
    ws_mgr.edit_file(
        session_id=session_id,
        relative_path="app/utils/security.py",
        new_content="# Modified after tests",
        base_revision=1,
    )
    current_revs = ws_mgr.get_all_revisions(session_id)
    assert current_revs["app/utils/security.py"] == 2

    # Attempt submission: must be rejected because workspace changed after tests
    with pytest.raises(SubmissionError) as exc_info:
        sub_mgr.create_submission(session_id, ws_dir, current_revs)

    assert "modified after the latest test run" in str(exc_info.value).lower()
    assert "please run tests again" in str(exc_info.value).lower()


def test_http_submission_and_report_endpoints():
    """Verify HTTP API submission, report retrieval, and history listing."""
    client = TestClient(app)
    session_id = "test-http-eval-e2e"

    # 1. Init workspace
    init_res = client.post(f"/api/v1/workspace/{session_id}/init?force_reset=true")
    assert init_res.status_code == 200

    # 2. Submit solution
    sub_res = client.post(f"/api/v1/workspace/{session_id}/submit")
    assert sub_res.status_code == 200
    data = sub_res.json()
    assert data["status"] == "submitted"
    assert "submission_id" in data
    assert "report" in data
    submission_id = data["submission_id"]

    # 3. Retrieve report
    rep_res = client.get(f"/api/v1/submissions/{submission_id}")
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert rep_data["submissionId"] == submission_id
    assert "rubricCategories" in rep_data

    # 4. List submissions
    list_res = client.get("/api/v1/submissions")
    assert list_res.status_code == 200
    sub_list = list_res.json()["submissions"]
    assert any(s["submissionId"] == submission_id for s in sub_list)

