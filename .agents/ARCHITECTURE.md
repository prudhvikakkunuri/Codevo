# Codevo — Intended Architecture

- Status: Proposed; not implemented
- Updated: 2026-11-07

## 1. Frontend
Planned: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Monaco Editor, xterm.js. Add other libraries only when the relevant milestone requires them.

Responsibilities: landing page, dashboard, challenge browsing, settings, history, results, browser IDE UI, timer display based on server deadline, candidate-facing API requests. Never bundle hidden tests or evaluator-only data.

## 2. Backend
Planned: Python + FastAPI.

Responsibilities: authorization, challenge catalogue, session lifecycle, authoritative deadlines, workspace provisioning/snapshotting, AI orchestration, agent tool authorization, execution orchestration, submission/evaluation, reports/history.

## 3. Database/auth
Planned: Supabase PostgreSQL and Supabase Auth.

Potential tables: profiles, challenges, challenge_versions, interview_sessions, session_messages, session_events, code_submissions, test_results, evaluation_reports, user_ai_providers.

Design schema and row-level security before implementation. Frontend filtering is not an authorization boundary.

## 4. Session lifecycle
1. Candidate requests challenge start.
2. Backend validates and creates session.
3. Backend records `started_at` and authoritative `deadline_at`.
4. Workspace is provisioned from a pinned challenge version.
5. Candidate changes are saved/snapshotted.
6. Candidate submits or deadline expires.
7. Backend freezes final candidate snapshot.
8. Evaluator runs snapshot in fresh isolated environment.
9. Results are persisted and returned.

Client countdown is only a display projection of server `deadline_at`. Refresh must not reset time.

## 5. AI modes
Chat mode: candidate asks; assistant explains/suggests; candidate edits manually.
Agent mode: tools may include `list_files`, `read_file`, `search_code`, `edit_file`, `run_tests`, `run_command`. Tools must be scoped to candidate workspace, audited, and permission-controlled. No access to evaluator files, host filesystem, secrets, or other sessions.

## 6. Challenge separation
Candidate-visible: starter repository, problem statement, public tests, setup/run instructions.
Evaluator-only: hidden tests, reference solution/patch, private rubric, validation notes.
Evaluator-only materials must never be mounted into candidate workspace, returned by candidate APIs, indexed by candidate-facing AI, bundled into frontend assets, or exposed in logs.

## 7. Evaluation
Freeze snapshot → fresh evaluator sandbox → pinned dependency setup → build/hidden tests → structured results → permitted static analysis → optional evidence-based AI review → challenge-specific score → persist candidate-safe report.

Automated tests are authoritative for defined behaviours. AI assessment is supplementary, not deterministic ground truth.

## 8. Security
- Backend authorization for every protected action.
- Supabase RLS where applicable.
- Secrets outside source control; never return saved credentials in plaintext.
- TLS; no secrets in logs/URLs/analytics.
- Candidate code and repositories are untrusted.
- Strict CPU, memory, process, disk, and wall-clock limits.
- No outbound network by default in execution sandboxes.
- No host mounts, host credentials, or Docker socket in candidate containers.
- Disposable workspaces; candidate/evaluator separation.
- Plain Docker is not automatically a sufficient security boundary for arbitrary public multi-user execution; production needs hardening and security review.

## 9. BYOK
Candidate supplies provider key. Backend uses it securely. Consider server-side encryption at rest with keys stored separately from DB, strict per-user authorization, rotation, deletion, and retention controls. Never log request headers or secrets. Ollama/local requires an explicit local bridge or local execution architecture; cloud backend cannot reach candidate localhost by default.

## 10. Deployment direction
Develop locally first. Possible later frontend/backend/database/runner hosting must be selected only after reviewing current free-tier limits, commercial terms, data region, uptime, and security. Public code execution should use a hardened dedicated execution service.
