import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Start Interview Component & Workflow Regression Tests", async (t) => {
  const dialogFilePath = path.resolve(__dirname, "../src/components/application/challenges/challenge-details-dialog.tsx");
  const dialogSource = fs.readFileSync(dialogFilePath, "utf-8");

  await t.test("Component source has Start Interview button with enabled click handler", () => {
    // Verify button is not hardcoded disabled for CI-001
    assert.ok(dialogSource.includes('aria-label="Start Interview"'), "Button must have aria-label Start Interview");
    assert.ok(dialogSource.includes('data-testid="start-interview-button"'), "Button must have test id");
    assert.ok(dialogSource.includes('onClick={handleStartInterview}'), "Button must wire handleStartInterview");
    assert.ok(dialogSource.includes('disabled={isStarting}'), "Button must only disable during active request");
  });

  await t.test("Target destination is verified as DEMO_SESSION_ID (/app/workspace/ci-001-demo)", () => {
    assert.ok(dialogSource.includes("router.push(`/app/workspace/${DEMO_SESSION_ID}`)"), "Must navigate to DEMO_SESSION_ID workspace");
    assert.ok(dialogSource.includes("DEMO_SESSION_ID"), "Must import and reference DEMO_SESSION_ID");
  });

  await t.test("Workspace initialization API is invoked on click", () => {
    assert.ok(
      dialogSource.includes("http://localhost:8000/api/v1/workspace/${DEMO_SESSION_ID}/init"),
      "Must call workspace initialization endpoint"
    );
    assert.ok(dialogSource.includes('method: "POST"'), "Must use POST method for workspace init");
  });

  await t.test("Duplicate clicks are prevented while request is in progress", () => {
    assert.ok(dialogSource.includes("if (isStarting) return;"), "Must guard against duplicate clicks");
    assert.ok(dialogSource.includes("setIsStarting(true)"), "Must set loading state immediately");
    assert.ok(dialogSource.includes("Starting Interview..."), "Must show loading label");
  });

  await t.test("Network and backend errors are captured and displayed to candidate", () => {
    assert.ok(dialogSource.includes("setStartError"), "Must set user-facing error message on failure");
    assert.ok(dialogSource.includes('role="alert"'), "Must render error alert banner");
  });

  await t.test("Live backend workspace init responds with 200 for ci-001-demo", async () => {
    // Verify that the actual target endpoint responds with 200 and initializes the workspace
    const response = await fetch("http://127.0.0.1:8000/api/v1/workspace/ci-001-demo/init", {
      method: "POST",
    });
    assert.equal(response.status, 200, "Backend /init endpoint must return 200");
    const data = await response.json();
    assert.equal(data.session_id, "ci-001-demo", "Session ID must match ci-001-demo");
    assert.ok(data.files_count >= 10, "Workspace must contain starter files");
  });
});

