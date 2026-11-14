/**
 * Codevo — Test Execution Fixtures (Milestone 1.7)
 *
 * All fixtures in this file are purely illustrative simulated demo data.
 * They do NOT represent real code execution, official challenge evaluation,
 * reference solutions, or hidden test cases.
 */

export type TestScenarioId = "initial-defects" | "all-passing" | "execution-error";

export interface TestCaseFixture {
  id: string;
  name: string;
  file: string;
  expectedStatus: "passed" | "failed";
  durationMs: number;
  failureMessage?: string;
  assertionDetails?: {
    expected: string;
    actual: string;
    diff?: string;
  };
  traceback?: string;
}

export interface TestScenarioFixture {
  id: TestScenarioId;
  label: string;
  description: string;
  isIllustrativeOnly: true;
  simulatedDurationMs: number;
  testCases: TestCaseFixture[];
  simulatedErrorOutput?: string;
}

export const TEST_SCENARIOS: Record<TestScenarioId, TestScenarioFixture> = {
  "initial-defects": {
    id: "initial-defects",
    label: "Illustrative Starter Defects (Default)",
    description: "Simulates test results with illustrative failures for testing the error reporting UI.",
    isIllustrativeOnly: true,
    simulatedDurationMs: 1420,
    testCases: [
      {
        id: "tc-001",
        name: "test_register_new_user",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 38,
      },
      {
        id: "tc-002",
        name: "test_duplicate_email",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 24,
      },
      {
        id: "tc-003",
        name: "test_password_hashing",
        file: "tests/test_auth.py",
        expectedStatus: "failed",
        durationMs: 45,
        failureMessage: "AssertionError: password stored in plain text or invalid salt configuration",
        assertionDetails: {
          expected: "hashed_password.startswith('$2b$')",
          actual: "hashed_password == 'plaintext_secret_123'",
          diff: "- $2b$12$e8Y7z7u2q\n+ plaintext_secret_123",
        },
        traceback: `tests/test_auth.py:48: in test_password_hashing
    user = auth_service.register_user(email="dev@codevo.io", password="plaintext_secret_123")
    assert user.hashed_password != "plaintext_secret_123", "Password should not be stored in plain text"
>   assert user.hashed_password.startswith("$2b$")
E   AssertionError: Password stored in plain text or invalid salt configuration
E   assert False
E    +  where False = <method-wrapper 'startswith' of str object>.startswith('$2b$')`,
      },
      {
        id: "tc-004",
        name: "test_login_valid_credentials",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 51,
      },
      {
        id: "tc-005",
        name: "test_login_invalid_credentials",
        file: "tests/test_auth.py",
        expectedStatus: "failed",
        durationMs: 31,
        failureMessage: "HTTPException 401 not raised: Expected 401 Unauthorized for bad password, received 500",
        assertionDetails: {
          expected: "HTTP 401 Unauthorized",
          actual: "HTTP 500 Internal Server Error",
          diff: "- status_code == 401\n+ status_code == 500",
        },
        traceback: `tests/test_auth.py:84: in test_login_invalid_credentials
    response = client.post("/auth/login", json={"email": "dev@codevo.io", "password": "wrong_password"})
>   assert response.status_code == 401, f"Expected 401, got {response.status_code}"
E   AssertionError: Expected 401, got 500
E   assert 500 == 401
E    +  where 500 = <Response [500 Internal Server Error]>.status_code`,
      },
    ],
  },
  "all-passing": {
    id: "all-passing",
    label: "All Tests Passing (Demo)",
    description: "Simulates test results when all requirements are satisfied.",
    isIllustrativeOnly: true,
    simulatedDurationMs: 1210,
    testCases: [
      {
        id: "tc-001",
        name: "test_register_new_user",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 34,
      },
      {
        id: "tc-002",
        name: "test_duplicate_email",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 22,
      },
      {
        id: "tc-003",
        name: "test_password_hashing",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 62,
      },
      {
        id: "tc-004",
        name: "test_login_valid_credentials",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 44,
      },
      {
        id: "tc-005",
        name: "test_login_invalid_credentials",
        file: "tests/test_auth.py",
        expectedStatus: "passed",
        durationMs: 29,
      },
    ],
  },
  "execution-error": {
    id: "execution-error",
    label: "Simulated Execution Error",
    description: "Simulates an unhandled runtime exception or crash prior to test completion.",
    isIllustrativeOnly: true,
    simulatedDurationMs: 650,
    testCases: [],
    simulatedErrorOutput: `INTERNAL TEST EXECUTION RUNTIME ERROR [Simulated]
Traceback (most recent call last):
  File "/opt/codevo/runner.py", line 14, in <module>
    from app.services.authentication import AuthService
  File "/opt/codevo/app/services/authentication.py", line 18
    def verify_password(plain_password, hashed_password)
                                                         ^
SyntaxError: expected ':'
E: Process terminated with exit code 1 (Simulated Execution Crash)`,
  },
};

