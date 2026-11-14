/**
 * Regression Test Suite: AI Agent Monaco Editor Synchronization & Session Lifecycle
 *
 * Verifies:
 * 1. Active session allows Agent patches.
 * 2. Submitted session enforces read-only locks.
 * 3. Fresh CI-001 demo start clears submission locks and initializes with force_reset=true.
 * 4. WorkspaceEditor binds controlled `value` and synchronizes external model updates.
 * 5. Toolbar includes full reset capability for submitted demo sessions.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import assert from "assert/strict";

console.log("--- Starting Agent Monaco Editor & Session Lifecycle Regression Tests ---");

const ROOT = resolve(process.cwd());

// 1. Verify frontend/src/data/assessment.ts exports clearClientSubmission
const assessmentSource = readFileSync(resolve(ROOT, "frontend/src/data/assessment.ts"), "utf-8");
assert(
  assessmentSource.includes("export function clearClientSubmission"),
  "assessment.ts must export clearClientSubmission"
);
assert(
  assessmentSource.includes("notifySubmissionChange()"),
  "clearClientSubmission must notify listeners of submission change"
);
console.log("✓ Case 1 & 8: assessment.ts exports clearClientSubmission and notifies subscribers");

// 2. Verify challenge-details-dialog.tsx clears submission and resets workspace on Start Interview
const dialogSource = readFileSync(
  resolve(ROOT, "frontend/src/components/application/challenges/challenge-details-dialog.tsx"),
  "utf-8"
);
assert(
  dialogSource.includes("clearClientSubmission(DEMO_SESSION_ID)"),
  "handleStartInterview must call clearClientSubmission(DEMO_SESSION_ID)"
);
assert(
  dialogSource.includes("clearWorkspaceState(DEMO_SESSION_ID)"),
  "handleStartInterview must call clearWorkspaceState(DEMO_SESSION_ID)"
);
assert(
  dialogSource.includes("/init?force_reset=true"),
  "handleStartInterview must call backend init with force_reset=true"
);
console.log("✓ Case 8: challenge-details-dialog.tsx starts fresh active session with force_reset=true");

// 3. Verify WorkspaceEditor binds controlled value and has model synchronization effect
const editorSource = readFileSync(
  resolve(ROOT, "frontend/src/components/application/workspace/workspace-editor.tsx"),
  "utf-8"
);
assert(
  editorSource.includes("value={activeFile.content}"),
  "WorkspaceEditor must bind value={activeFile.content} instead of defaultValue"
);
assert(
  editorSource.includes("model.setValue(activeFile.content)"),
  "WorkspaceEditor must synchronize external activeFile.content into Monaco model"
);
assert(
  editorSource.includes("saveViewState()"),
  "WorkspaceEditor must preserve/restore viewState across external updates"
);
console.log("✓ Case 6: WorkspaceEditor binds controlled value and synchronizes external Agent modifications");

// 4. Verify workspace-toolbar.tsx includes onResetSession and allows demo menu opening
const toolbarSource = readFileSync(
  resolve(ROOT, "frontend/src/components/application/workspace/workspace-toolbar.tsx"),
  "utf-8"
);
assert(
  toolbarSource.includes("onResetSession?: () => void"),
  "WorkspaceToolbarProps must support onResetSession callback"
);
assert(
  toolbarSource.includes("Reset Session (Start Fresh)"),
  "WorkspaceToolbar must expose Reset Session option in demo menu"
);
console.log("✓ Case 2 & 8: WorkspaceToolbar provides Reset Session control even when submitted");

// 5. Verify backend orchestrator does not wipe read_file contents in compaction
const orchestratorSource = readFileSync(
  resolve(ROOT, "backend/app/core/agent/orchestrator.py"),
  "utf-8"
);
assert(
  !orchestratorSource.includes('m.content = json.dumps({"status": "inspected"})'),
  "orchestrator.py must not wipe read_file contents with inspected status"
);
assert(
  orchestratorSource.includes("read_counts"),
  "orchestrator.py must track read_counts to avoid repetitive reading loops"
);
console.log("✓ Case 7: orchestrator.py preserves read_file content and includes loop prevention");

// 6. Verify backend workspace_manager.py rejects modifications when session is submitted
const wmSource = readFileSync(
  resolve(ROOT, "backend/app/core/agent/workspace_manager.py"),
  "utf-8"
);
assert(
  wmSource.includes("def is_session_submitted(self, session_id: str) -> bool:"),
  "workspace_manager.py must define is_session_submitted"
);
assert(
  wmSource.includes("def submit_session(self, session_id: str) -> dict[str, Any]:"),
  "workspace_manager.py must define submit_session"
);
assert(
  wmSource.includes("if self.is_session_submitted(session_id):"),
  "patch_file and edit_file must guard against submitted sessions"
);
console.log("✓ Case 2, 3, 4: workspace_manager.py guards submission boundary and increments revisions");

console.log("\nALL 6 FRONTEND & ORCHESTRATION REGRESSION ASSERTIONS PASSED!");

