/**
 * Codevo — Test Execution Runner Simulator (Milestone 1.7)
 *
 * Implements a clean, typed execution simulation lifecycle for candidate interview tests.
 * All operations and logs are explicitly identified as SIMULATED EXECUTION.
 */

import {
  TEST_SCENARIOS,
  type TestScenarioId,
  type TestCaseFixture,
} from "@/data/test-fixtures";

export type TestExecutionStatus =
  | "idle"
  | "running"
  | "passed"
  | "failed"
  | "error"
  | "cancelled";

export interface LiveTestCase {
  id: string;
  name: string;
  file: string;
  status: "pending" | "running" | "passed" | "failed";
  durationMs?: number;
  failureMessage?: string;
  assertionDetails?: {
    expected: string;
    actual: string;
    diff?: string;
  };
  traceback?: string;
}

export interface TestExecutionResult {
  scenarioId: TestScenarioId;
  status: TestExecutionStatus;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  testCases: LiveTestCase[];
  rawLogs: string[];
  errorOutput?: string;
  startedAt: number;
  completedAt?: number;
}

export interface RunTestsCallbacks {
  onProgress: (state: TestExecutionResult, newTerminalText?: string) => void;
  onComplete: (state: TestExecutionResult) => void;
}

/**
 * Executes a simulated test run against the selected scenario.
 * Returns a cancel function that immediately aborts any remaining scheduled steps.
 */
export function executeSimulatedTests(
  scenarioId: TestScenarioId,
  callbacks: RunTestsCallbacks
): () => void {
  const scenario = TEST_SCENARIOS[scenarioId] || TEST_SCENARIOS["initial-defects"];
  const startedAt = Date.now();
  const timeouts: NodeJS.Timeout[] = [];
  let isCancelled = false;

  // Initialize test cases in pending state
  const liveCases: LiveTestCase[] = scenario.testCases.map((tc) => ({
    id: tc.id,
    name: tc.name,
    file: tc.file,
    status: "pending",
    durationMs: undefined,
  }));

  const currentState: TestExecutionResult = {
    scenarioId,
    status: "running",
    totalCount: scenario.testCases.length,
    passedCount: 0,
    failedCount: 0,
    durationMs: 0,
    testCases: liveCases,
    rawLogs: [],
    startedAt,
  };

  const cancel = () => {
    if (isCancelled || currentState.status !== "running") return;
    isCancelled = true;
    timeouts.forEach(clearTimeout);

    currentState.status = "cancelled";
    currentState.durationMs = Date.now() - startedAt;
    currentState.completedAt = Date.now();

    const cancelNotice = "\r\n\x1b[33m[Execution Cancelled]\x1b[0m Test execution was stopped by user.\r\n";
    currentState.rawLogs.push("[Execution Cancelled]");
    callbacks.onProgress({ ...currentState }, cancelNotice);
    callbacks.onComplete({ ...currentState });
  };

  // Helper to schedule a step
  const schedule = (ms: number, fn: () => void) => {
    if (isCancelled) return;
    const t = setTimeout(() => {
      if (!isCancelled) fn();
    }, ms);
    timeouts.push(t);
  };

  // 1. Initial Banner
  schedule(50, () => {
    const banner = [
      "\r\n\x1b[1;36m====================================================================\x1b[0m",
      "\x1b[1;36m  CODEVO SIMULATED TEST EXECUTION RUNNER [Demo Fixture]\x1b[0m",
      "\x1b[38;5;244m  Isolated sandbox execution scheduled for Phase 5.\x1b[0m",
      "\x1b[1;36m====================================================================\x1b[0m\r\n",
      "\x1b[32mrootdir: /workspace/auth-service\x1b[0m",
      "\x1b[38;5;244mplatform: linux -- Python 3.11.0, pytest-8.1.1, pluggy-1.4.0\x1b[0m\r\n",
    ].join("\r\n");

    currentState.rawLogs.push(
      "Codevo Simulated Test Runner",
      `Platform: linux (simulated), pytest 8.1.1`
    );
    callbacks.onProgress({ ...currentState }, banner);
  });

  // Handle Simulated Execution Error Scenario
  if (scenarioId === "execution-error") {
    schedule(400, () => {
      const errorText = `\x1b[31m${scenario.simulatedErrorOutput?.replace(/\n/g, "\r\n") || "Runtime Error"}\x1b[0m\r\n`;
      currentState.status = "error";
      currentState.errorOutput = scenario.simulatedErrorOutput;
      currentState.durationMs = Date.now() - startedAt;
      currentState.completedAt = Date.now();
      currentState.rawLogs.push(scenario.simulatedErrorOutput || "Runtime Error");
      callbacks.onProgress({ ...currentState }, errorText);
      callbacks.onComplete({ ...currentState });
    });
    return cancel;
  }

  // 2. Test Discovery
  schedule(300, () => {
    const discovery = `\x1b[1mcollecting ... \x1b[0mcollected ${scenario.testCases.length} items\r\n\r\n`;
    currentState.rawLogs.push(`collected ${scenario.testCases.length} items`);
    callbacks.onProgress({ ...currentState }, discovery);
  });

  // 3. Step through test cases sequentially
  let currentDelay = 550;
  scenario.testCases.forEach((tc: TestCaseFixture, index: number) => {
    // A: Mark test as running
    schedule(currentDelay, () => {
      currentState.testCases[index].status = "running";
      callbacks.onProgress({ ...currentState });
    });

    currentDelay += tc.durationMs * 6 + 150; // realistic animation delay

    // B: Complete test (pass or fail)
    schedule(currentDelay, () => {
      const isPass = tc.expectedStatus === "passed";
      currentState.testCases[index].status = isPass ? "passed" : "failed";
      currentState.testCases[index].durationMs = tc.durationMs;
      currentState.testCases[index].failureMessage = tc.failureMessage;
      currentState.testCases[index].assertionDetails = tc.assertionDetails;
      currentState.testCases[index].traceback = tc.traceback;

      if (isPass) {
        currentState.passedCount++;
      } else {
        currentState.failedCount++;
      }

      const statusBadge = isPass ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mFAILED\x1b[0m";
      const line = `${tc.file}::${tc.name} ${statusBadge} \x1b[38;5;244m(${tc.durationMs}ms)\x1b[0m\r\n`;

      currentState.rawLogs.push(`${tc.file}::${tc.name} ${isPass ? "PASSED" : "FAILED"}`);
      callbacks.onProgress({ ...currentState }, line);
    });

    currentDelay += 100;
  });

  // 4. Final Summary
  schedule(currentDelay + 200, () => {
    currentState.status = currentState.failedCount > 0 ? "failed" : "passed";
    currentState.durationMs = Date.now() - startedAt;
    currentState.completedAt = Date.now();

    const summaryParts: string[] = [];
    if (currentState.failedCount > 0) {
      summaryParts.push(`\x1b[31m${currentState.failedCount} failed\x1b[0m`);
    }
    if (currentState.passedCount > 0) {
      summaryParts.push(`\x1b[32m${currentState.passedCount} passed\x1b[0m`);
    }

    const durationSec = (currentState.durationMs / 1000).toFixed(2);
    const summaryColor = currentState.failedCount > 0 ? "\x1b[1;31m" : "\x1b[1;32m";

    const summaryText = [
      "\r\n",
      `${summaryColor}==================== ${summaryParts.join(", ")} in ${durationSec}s (simulated) ====================\x1b[0m`,
      "\x1b[38;5;244m[Notice: All test executions in Phase 1 are simulated frontend fixtures]\x1b[0m\r\n",
    ].join("\r\n");

    currentState.rawLogs.push(
      `Results: ${currentState.passedCount} passed, ${currentState.failedCount} failed in ${durationSec}s`
    );

    callbacks.onProgress({ ...currentState }, summaryText);
    callbacks.onComplete({ ...currentState });
  });

  return cancel;
}

/**
 * Parses raw pytest stdout/stderr from Docker isolated test runner into structured LiveTestCase objects.
 */
export function parsePytestCases(rawOutput: string): LiveTestCase[] {
  if (!rawOutput) return [];

  const cases: LiveTestCase[] = [];
  const lines = rawOutput.split(/\r?\n/);

  for (const line of lines) {
    // Matches e.g. ../trusted_tests/test_ci001_trusted.py::test_user_registration_success PASSED
    const match = line.match(/(?:.*[/\\])?([^:\s]+\.py)::(\w+)\s+(PASSED|FAILED)/i);
    if (match) {
      const fileName = match[1];
      const fnName = match[2];
      const isPassed = match[3].toUpperCase() === "PASSED";

      const formattedName = fnName
        .replace(/^test_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      cases.push({
        id: `tc-${fnName}`,
        name: formattedName,
        file: fileName,
        status: isPassed ? "passed" : "failed",
        failureMessage: isPassed ? undefined : "Assertion failed during test execution",
      });
    }
  }

  return cases;
}


