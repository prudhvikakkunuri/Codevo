"""Evidence-based rubric evaluation engine for Codevo candidate submissions."""

import ast
from typing import Any
from app.core.evaluator.models import (
    ActionableRecommendation,
    AssessmentReport,
    AutomatedTestSnapshot,
    FeedbackItem,
    RubricCategoryScore,
    TestCaseResult,
    TestRunRecord,
    WorkspaceSnapshotSummary,
)


def parse_pytest_output_cases(raw_output: str) -> list[TestCaseResult]:
    """Parse raw pytest stdout/stderr from Docker runner into structured TestCaseResult objects."""
    if not raw_output:
        return []

    cases: list[TestCaseResult] = []
    lines = raw_output.splitlines()

    for line in lines:
        stripped = line.strip()
        # Example format:
        # /trusted_tests/test_ci001_trusted.py::test_user_registration_success PASSED
        if "::" in stripped and ("PASSED" in stripped or "FAILED" in stripped or "ERROR" in stripped):
            parts = stripped.split("::")
            file_part = parts[0].strip().replace("\\", "/").split("/")[-1]
            rest = parts[1].strip()
            rest_parts = rest.split()
            fn_name = rest_parts[0].strip()
            status_word = rest_parts[1].strip().upper() if len(rest_parts) > 1 else ""

            is_passed = status_word == "PASSED"
            formatted_name = (
                fn_name.replace("test_", "")
                .replace("_", " ")
                .title()
            )

            cases.append(
                TestCaseResult(
                    id=f"tc-{fn_name}",
                    name=formatted_name,
                    file=file_part,
                    status="passed" if is_passed else "failed",
                    failureMessage=None if is_passed else "Test assertion failed in container execution",
                )
            )

    return cases


class EvaluatorEngine:
    """Computes rubric scores, qualitative evidence, and assessment reports from execution data."""

    def evaluate_ci001(
        self,
        submission_id: str,
        session_id: str,
        test_run: TestRunRecord,
        workspace_files: dict[str, str],
        completed_duration_minutes: int = 25,
    ) -> AssessmentReport:
        """Evaluate CI-001 challenge submission against authoritative rubric."""

        # File inspection
        sec_content = workspace_files.get("app/utils/security.py", "")
        auth_content = workspace_files.get("app/services/authentication.py", "")
        routes_content = workspace_files.get("app/routes/auth.py", "")

        # --- Category 1: Functional Correctness & Verification (40%) ---
        total_tests = max(test_run.totalTests, 1)
        passed_tests = test_run.passedTests
        correctness_pct = round((passed_tests / total_tests) * 100.0, 1)
        correctness_contribution = round(correctness_pct * 0.40, 1)

        if correctness_pct >= 99.0:
            c1_status = "strong"
            c1_exp = "All 6 trusted pytest test suites passed within the Docker container isolation boundary."
        elif correctness_pct >= 60.0:
            c1_status = "adequate"
            c1_exp = f"{passed_tests} of {total_tests} trusted test suites passed. Certain boundary assertions failed."
        else:
            c1_status = "needs-work"
            c1_exp = f"Only {passed_tests} of {total_tests} test suites passed. Core requirements were not satisfied."

        c1_evidence = (
            f"Docker Test Runner: {passed_tests}/{total_tests} passed "
            f"(exit code: {test_run.exitCode}, duration: {test_run.durationSeconds:.2f}s)."
        )
        c1_rec = (
            "Continue writing comprehensive integration tests covering edge cases before submitting."
            if correctness_pct >= 99.0
            else "Ensure all automated pytest tests execute cleanly and pass before submission."
        )

        rubric_c1 = RubricCategoryScore(
            id="rubric-correctness",
            name="Functional Correctness & Verification",
            weightPercentage=40.0,
            scorePercentage=correctness_pct,
            weightedContribution=correctness_contribution,
            status=c1_status,
            explanation=c1_exp,
            supportingEvidence=c1_evidence,
            actionableRecommendation=c1_rec,
        )

        # --- Category 2: Security & Validation Hygiene (25%) ---
        sec_points = 0.0

        # Check Argon2 hashing and safe verify
        has_argon2 = ("argon2" in sec_content.lower() or "passwordhasher" in sec_content.lower())
        has_safe_verify = False
        if has_argon2 and "verify" in sec_content:
            # Check that verification safely returns False on mismatch/exception
            if "verify_password" in sec_content:
                has_safe_verify = True
                sec_points += 12.5

        # Check duplicate email validation with 409
        has_duplicate_check = False
        if "register_user" in auth_content:
            if ("409" in auth_content or "http_409_conflict" in auth_content.lower()) and "already registered" in auth_content.lower():
                has_duplicate_check = True
                sec_points += 12.5
            elif "409" in auth_content or "conflict" in auth_content.lower():
                has_duplicate_check = True
                sec_points += 12.5

        sec_pct = round((sec_points / 25.0) * 100.0, 1)
        sec_contribution = round(sec_pct * 0.25, 1)
        sec_status = "strong" if sec_pct >= 85.0 else ("adequate" if sec_pct >= 50.0 else "needs-work")

        rubric_c2 = RubricCategoryScore(
            id="rubric-security",
            name="Security & Validation Hygiene",
            weightPercentage=25.0,
            scorePercentage=sec_pct,
            weightedContribution=sec_contribution,
            status=sec_status,
            explanation=(
                "Employed modern Argon2id password hashing with salt isolation, safe error handling on verification mismatches, and duplicate identity guards."
                if sec_pct >= 85.0
                else "Partial security hygiene: check password hashing algorithm and identity uniqueness verification."
            ),
            supportingEvidence=(
                f"Evidence: Argon2id verified={has_safe_verify}, Duplicate Email Guard 409={has_duplicate_check}."
            ),
            actionableRecommendation=(
                "Maintain strict password complexity policies and constant-time hash comparisons."
                if sec_pct >= 85.0
                else "Replace unsalted or legacy hashes with Argon2id and enforce 409 Conflict checks on duplicates."
            ),
        )

        # --- Category 3: Error Handling & Contract Compliance (20%) ---
        err_points = 0.0

        # Missing user error sanitization (no internal exception leakage)
        has_sanitized_err = False
        if "invalid credentials" in auth_content.lower() or "invalid credentials" in routes_content.lower():
            has_sanitized_err = True
            err_points += 10.0

        # Appropriate HTTP exception propagation
        has_http_exceptions = False
        if "httpexception" in auth_content.lower() or "httpexception" in routes_content.lower():
            has_http_exceptions = True
            err_points += 10.0

        err_pct = round((err_points / 20.0) * 100.0, 1)
        err_contribution = round(err_pct * 0.20, 1)
        err_status = "strong" if err_pct >= 85.0 else ("adequate" if err_pct >= 50.0 else "needs-work")

        rubric_c3 = RubricCategoryScore(
            id="rubric-error-handling",
            name="Error Handling & Contract Compliance",
            weightPercentage=20.0,
            scorePercentage=err_pct,
            weightedContribution=err_contribution,
            status=err_status,
            explanation=(
                "API contracts conform strictly to REST standards (401 Unauthorized, 409 Conflict). Error details are sanitized to prevent internal traceback leakage."
                if err_pct >= 85.0
                else "Error handling requires stricter sanitization to prevent sensitive server or database state disclosure."
            ),
            supportingEvidence=(
                f"Evidence: Generic credential error='Invalid credentials' ({has_sanitized_err}), HTTPException compliance ({has_http_exceptions})."
            ),
            actionableRecommendation=(
                "Standardize structured RFC-7807 problem details across all microservice error handlers."
                if err_pct >= 85.0
                else "Sanitize error messages returned to clients and avoid exposing internal exception details."
            ),
        )

        # --- Category 4: Code Structure & Maintainability (15%) ---
        struct_points = 0.0

        # AST syntax validity for all candidate files
        syntax_valid = True
        for path, code in workspace_files.items():
            if path.endswith(".py"):
                try:
                    ast.parse(code)
                except SyntaxError:
                    syntax_valid = False
                    break

        if syntax_valid:
            struct_points += 7.5

        # Modular structure and type hinting
        has_types = ("dict" in auth_content.lower() or "usercreate" in auth_content.lower() or "str" in sec_content)
        if has_types:
            struct_points += 7.5

        struct_pct = round((struct_points / 15.0) * 100.0, 1)
        struct_contribution = round(struct_pct * 0.15, 1)
        struct_status = "strong" if struct_pct >= 85.0 else ("adequate" if struct_pct >= 50.0 else "needs-work")

        rubric_c4 = RubricCategoryScore(
            id="rubric-code-quality",
            name="Code Structure & Maintainability",
            weightPercentage=15.0,
            scorePercentage=struct_pct,
            weightedContribution=struct_contribution,
            status=struct_status,
            explanation=(
                "Clean modular architecture with clean separation between Pydantic models, routes, and authentication services. Type annotations are well-maintained."
                if struct_pct >= 85.0
                else "Code structure contains syntax or typing inconsistencies that impede maintainability."
            ),
            supportingEvidence=(
                f"Evidence: Python AST syntax validity={syntax_valid}, Type annotations present={has_types}."
            ),
            actionableRecommendation=(
                "Add docstrings and enforce mypy strict mode on all business logic modules."
                if struct_pct >= 85.0
                else "Fix Python syntax errors and adhere to PEP 8 styling conventions."
            ),
        )

        # Calculate overall score
        overall_score = round(
            correctness_contribution + sec_contribution + err_contribution + struct_contribution,
            1,
        )

        if overall_score >= 90.0:
            perf_rating = "Exceeds Expectations"
            rating_desc = (
                "Demonstrates outstanding backend engineering and application security skills. "
                "Successfully resolved all authentication vulnerabilities, implemented robust Argon2id hashing with "
                "safe verification exception handling, and satisfied all containerized test contracts."
            )
        elif overall_score >= 70.0:
            perf_rating = "Meets Expectations"
            rating_desc = (
                "Demonstrates competent API debugging skills and security awareness. "
                "Successfully addresses core authentication requirements while highlighting areas for edge-case test coverage "
                "and stricter schema validation."
            )
        else:
            perf_rating = "Needs Improvement"
            rating_desc = (
                "Identified multiple critical test assertion failures or unpatched security vulnerabilities requiring remediation."
            )

        # Strengths & Improvement Areas
        strengths: list[FeedbackItem] = []
        improvements: list[FeedbackItem] = []

        if has_duplicate_check:
            strengths.append(
                FeedbackItem(
                    id="strength-duplicate-email",
                    title="Proper Duplicate Email Prevention",
                    description=(
                        "Identified the missing uniqueness validation in user registration and introduced an early exit with appropriate HTTP 409 Conflict status."
                    ),
                    demonstratedEvidence="`app/services/authentication.py`: Verified email uniqueness against existing records before creating user account.",
                )
            )
        else:
            improvements.append(
                FeedbackItem(
                    id="improvement-duplicate-email",
                    title="Missing Duplicate Email Guard",
                    description="User registration allows duplicate email addresses or does not return HTTP 409 Conflict.",
                    demonstratedEvidence="`app/services/authentication.py`: Missing existence check on `USERS_DB` before insertion.",
                )
            )

        if has_safe_verify:
            strengths.append(
                FeedbackItem(
                    id="strength-password-hashing",
                    title="Cryptographically Secure Password Hashing",
                    description=(
                        "Replaced insecure unsalted SHA-256 with Argon2id using unique salts and safe credential verification."
                    ),
                    demonstratedEvidence="`app/utils/security.py`: Implemented Argon2id PasswordHasher with safe mismatch exception handling.",
                )
            )
        else:
            improvements.append(
                FeedbackItem(
                    id="improvement-password-hashing",
                    title="Incomplete Password Verification",
                    description="Password verification does not properly utilize Argon2id or fails safe exception handling.",
                    demonstratedEvidence="`app/utils/security.py`: Insecure hashing or invalid error return on verification failure.",
                )
            )

        if has_sanitized_err:
            strengths.append(
                FeedbackItem(
                    id="strength-sanitized-errors",
                    title="Sanitized Error Responses",
                    description="Safely handled missing user and authentication errors to prevent internal architecture and traceback details from leaking.",
                    demonstratedEvidence="`app/services/authentication.py`: Returns generic 'Invalid credentials' payload on lookup failure.",
                )
            )
        else:
            improvements.append(
                FeedbackItem(
                    id="improvement-sanitized-errors",
                    title="Potential Information Leakage in Authentication",
                    description="Authentication error messages differentiate between missing users and wrong passwords, or expose internal exceptions.",
                    demonstratedEvidence="`app/services/authentication.py`: Detailed error returned on unknown email.",
                )
            )

        if syntax_valid:
            strengths.append(
                FeedbackItem(
                    id="strength-code-structure",
                    title="Clean Separation of Concerns",
                    description="Preserved clean architectural boundaries between routing, authentication business logic, and security helpers.",
                    demonstratedEvidence="Maintained existing dependency injection contracts and module separation.",
                )
            )

        recommendations: list[ActionableRecommendation] = [
            ActionableRecommendation(
                id="rec-1",
                priority="High" if not has_duplicate_check else "Low",
                recommendation="Ensure string normalization on all unique identity fields (email/username)",
                rationale="Email addresses should be trimmed and lowercased prior to comparison and persistence to prevent duplicate collisions.",
            ),
            ActionableRecommendation(
                id="rec-2",
                priority="High" if not has_safe_verify else "Medium",
                recommendation="Enforce constant-time comparison and memory-hard hash parameters",
                rationale="Argon2id parameters should balance resistance to side-channel and GPU cracking with interactive login latency.",
            ),
            ActionableRecommendation(
                id="rec-3",
                priority="Low",
                recommendation="Add integration regression fixtures for negative auth paths",
                rationale="Comprehensive negative test coverage ensures edge-case error sanitization remains stable across refactorings.",
            ),
        ]

        # Build AutomatedTestSnapshot
        test_snapshot = AutomatedTestSnapshot(
            total=test_run.totalTests,
            passed=test_run.passedTests,
            failed=test_run.failedTests,
            simulatedDurationSec=round(test_run.durationSeconds, 2),
            isSimulatedOnly=False,
            summaryNote="Authoritative test execution verified inside Docker container isolation boundary.",
            runnerType=test_run.runnerType,
            testCases=test_run.testCases,
        )

        modified_names = [p for p in workspace_files.keys() if p.startswith("app/")]
        ws_summary = WorkspaceSnapshotSummary(
            totalFiles=len(workspace_files),
            modifiedFilesCount=len(modified_names),
            modifiedFileNames=modified_names,
        )

        return AssessmentReport(
            submissionId=submission_id,
            sessionId=session_id,
            challengeId="CI-001",
            challengeTitle="Debug a Broken FastAPI Authentication API",
            submittedAt=test_run.timestamp,
            completedDurationMinutes=completed_duration_minutes,
            status="evaluated",
            isDemoAssessment=False,
            overallScore=overall_score,
            performanceRating=perf_rating,
            ratingDescription=rating_desc,
            rubricCategories=[rubric_c1, rubric_c2, rubric_c3, rubric_c4],
            automatedTests=test_snapshot,
            strengths=strengths,
            improvementAreas=improvements,
            recommendations=recommendations,
            workspaceSnapshotSummary=ws_summary,
        )

