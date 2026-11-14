# Codevo — Development Roadmap

- Status: Planned
- Current milestone: Phase 0 — documentation review
- Updated: 2026-11-07

## Working agreement
Build one milestone at a time. Do not automatically begin the next milestone. User reviews each milestone before proceeding.

## Phase 0 — Documentation
- [ ] Review PRD, architecture, roadmap, decisions, and memory.
- [ ] Confirm instructions load in Antigravity.
- [ ] Confirm working name/domain caveats are understood.

## Phase 1 — Frontend UI

### Step 1: Initialization and design system
- [x] Create Next.js + TypeScript project.
- [x] Configure Tailwind and shadcn/ui.
- [x] Configure dark-first monochrome tokens.
- [x] Configure fonts and metadata.
- [x] Create Codevo wordmark.
- [x] Create foundational button/card/typography styles.
- [x] Create temporary minimal home page.
- [x] Verify lint and production build.

### Step 2: Landing page
- [x] Hero and CTA.
- [x] How it works.
- [x] Challenge categories.
- [x] AI assistance explanation.
- [x] Footer and responsive layout.

### Step 3: Application shell
- [x] Sidebar/top navigation.
- [x] Mobile navigation.
- [x] Empty/loading/error states.

### Step 4: Dashboard
- [x] Summary metrics with clearly identified mock data.
- [x] Available challenges.
- [x] Recent interviews.
- [x] Responsive layout.

### Step 5: Challenge library
- [x] Challenge cards.
- [x] Search and filters.
- [x] Difficulty/duration labels.
- [x] Empty states.

### Step 6: Challenge details
- [x] Problem summary and requirements.
- [x] Difficulty, language, time limit.
- [x] Start confirmation.

### Step 7: Interview workspace UI
- [x] File explorer and tabs.
- [x] Monaco editor.
- [x] Problem panel.
- [x] AI assistant panel.
- [x] Terminal UI.
- [x] Test/output panel.
- [x] Timer and submit confirmation.
- [x] Resizable/collapsible panels.

### Step 8: Results UI (Completed & Verified in Milestone 1.8)
- [x] Overall score.
- [x] Test summary.
- [x] Rubric breakdown.
- [x] Evidence-based feedback layout.

### Step 9: Strategic Prototype — Functional AI Agent & Real Code Execution (Milestone 1.9)
Immediate objective: Deliver a functional, demonstrable prototype showcasing an AI Agent that can inspect an existing codebase, modify code, execute tests in isolation, analyze failures, and autonomously iterate toward a solution.
- [ ] **1.9.1 — Secure Backend Foundation**:
  - Python FastAPI backend service with canonical workspace document ownership and integer revision tracking (`revision: int`).
  - Supabase Auth integration with dynamic JWKS asymmetric verification (`kid`, `["ES256", "RS256"]`).
  - Next.js BFF session architecture with PostgreSQL database session store `private.sessions` and SHA-256 session token hashing (`session_id_hash`).
  - Dual dedicated PostgreSQL roles: `codevo_bff_role` (sessions only) and `codevo_api_role` (application/credentials only) with mutual table quarantine.
  - Encrypted candidate provider credential storage using AES-256-GCM envelope encryption with unique DEKs, `wrapped_dek`, and external KMS key references.
  - Permissive RLS policy architecture with verified `SELECT`, `INSERT`, `UPDATE`, and `DELETE` SQL tests under `codevo_api_role` for authorized and unauthorized callers.
  - Service-to-service authentication (mTLS / internal workload token) distinguishing service identity from user identity.
  - Anti-CSRF defense (Origin/Referer validation, synchronizer token `X-CSRF-Token`), 128-bit CSP nonces, and zero-persistent-browser-credential storage.
  - Multi-user credential isolation security test suite.
- [ ] **1.9.2 — First Real AI Provider Integration**:
  - Server-side provider registry designed for all 8 approved providers (OpenAI, Anthropic Claude, DeepSeek, Google Gemini, Groq, Cerebras, Sarvam AI, OpenRouter).
  - Secure candidate BYOK settings UI and backend persistence (`/api/v1/me/provider-credentials/{provider}`).
  - First fully functional cloud AI provider integration initially (selected for high-performance coding and tool-calling fidelity, e.g. OpenAI GPT-4o or Anthropic Claude Sonnet).
  - Actual live model inference with server-side streaming (SSE).
  - Server-side connection testing (`POST /test`) and robust provider error handling.
- [ ] **1.9.3 — Functional AI Chat & Autonomous Agent**:
  - Real conversation handling and repository context retrieval.
  - Autonomous Agent tools: `list_files`, `read_file`, `search_code`, `edit_file` (atomic multi-file `ChangeSetCoordinator`).
  - Server broadcasts committed changes via SSE topic `workspace:updates`; frontend applies edits cleanly via Monaco `applyEdits` preserving cursor/selection.
  - Candidate/Agent concurrency control: Optimistic `base_revision` verification rejects stale edits (`409 Conflict`); client guardrails display non-blocking conflict resolution toast without silently overwriting uncommitted candidate edits.
  - Autonomous in-scope code editing: Candidate approval is not required for standard in-scope edits within authorized challenge files.
  - Mandatory candidate confirmation or hard server-side rejection for destructive operations, out-of-scope edits, package installation, arbitrary shell access, external network access, and secret access.
  - Visible Agent activity timeline, execution plans, and tool-call history.
  - Cancellation, iteration ceilings (max 5 loops per turn), error recovery, undo, and submitted-session lock protection.
- [ ] **1.9.4 — Real Isolated Code Execution & Agent Iteration**:
  - Dedicated runner service / isolated execution provider targeting Python and versioned package `ci-001-fastapi-auth:v1.0.0`.
  - Trusted test suite isolation: Application files are writable, but trusted tests (`/harness/tests/test_auth.py`) are mounted strictly read-only (`:ro`). Runner controls execution command (`["pytest", "-q", "/harness/tests/test_auth.py"]`); Agent `edit_file` strictly blocks modifying `tests/` (`403 Forbidden`).
  - Per-session isolated workspace running non-root with strict CPU (1.0 vCPU), memory (512 MB), process (64 pids), disk, and execution-time limits (30s).
  - Restricted filesystem (workspace-only mounts); zero inherited API keys, environment secrets, or host credentials.
  - Network egress disabled by default (`--network none`).
  - Actual test execution returning genuine stdout, stderr, and exit codes.
  - Autonomous feedback loop: Agent receives genuine execution results, analyzes failures, modifies code, and reruns tests iteratively.
  - Local-only sandbox for initial prototype demonstration; plain Docker not treated as sufficient public multi-tenant isolation; public execution remains disabled until isolation boundary is independently validated.
  - Never execute candidate code directly on the FastAPI application host.
- [ ] **1.9.5 — End-to-End Functional Prototype & Demo Readiness**:
  - Verification of the complete 15-step candidate journey on `CI-001`.
  - Repeatable demonstration scenario with genuine test passes after autonomous agent fixes.
  - Project README, architecture documentation, screenshots/recording, local setup instructions, and portfolio-ready project description.
  - Multi-user isolation, CSRF, and security regression verification.

### Step 10: UI Quality Pass & Prototype Polish
- [ ] Desktop/tablet/mobile checks.
- [ ] Keyboard/accessibility checks.
- [ ] No dead buttons or misleading mock functionality.
- [ ] Consistent empty/loading/error states.

---

## Post-Prototype Complete Product Development (Phases 2 — 8)
After Milestone 1.9.5 passes all acceptance criteria and delivers the working core prototype, product development resumes systematically across independent, testable milestones:

## Phase 2 — Complete Authentication & User Management
Full user onboarding, candidate profiles, account settings, password recovery, session management dashboard, and audit logs.

## Phase 3 — Full Challenge Catalogue Expansion
Implement repositories, public tests, and starter codebases for remaining challenges: `CI-002` (RAG Pipeline), `CI-003` (React/FastAPI Integration), `CI-004` (ETL Pipeline), and `CI-005` (ML Prediction API). Support additional programming languages (TypeScript, Go, SQL).

## Phase 4 — Session Engine & Authoritative Timers
Full server-authoritative timer enforcement, workspace provisioning queues, background autosave sync, disconnection recovery, and auto-submission at deadline.

## Phase 5 — Multi-Provider AI Expansion
Implement adapters and streaming for all remaining approved AI providers: Anthropic Claude, DeepSeek, Google Gemini, Groq, Cerebras, Sarvam AI, and OpenRouter.

## Phase 6 — Secure Evaluation System with Hidden Tests
Production evaluator pipeline: freeze candidate snapshot $\rightarrow$ fresh evaluator sandbox $\rightarrow$ run hidden tests $\rightarrow$ execute private rubrics $\rightarrow$ generate candidate-safe report $\rightarrow$ persist immutable scorecard.

## Phase 7 — Production Sandboxing & Hardened MicroVM Infrastructure
Transition from local prototype sandbox to production-grade microVM isolation (Firecracker / gVisor) with validated kernel boundaries, network virtualization, and multi-tenant security verification.

## Phase 8 — Production Deployment, Observability & Compliance
Select hosting providers (edge WAF, VPC, managed DB, KMS), configure secrets, production monitoring/tracing without secret leakage, disaster recovery, OWASP ASVS 5.0.0 compliance sign-off, and production launch.
