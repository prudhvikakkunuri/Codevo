# Codevo — Project Memory

This file records current verified project state, not the full product specification.

- Last updated: 2026-11-14
- Project: Codevo
- Working domain: `codevo.runs-on.dev` (unverified availability)
- Current stage: Phase 1 — Strategic Prototype: Functional AI Agent & Real Isolated Execution
- Current milestone completed: 4-Hour Demo-First Implementation Sprint (CI-001 End-to-End AI Agent & Isolated Runner) (Verified)
- Active development focus: Strategic Prototype First (Milestone 1.9 Substeps 1.9.1 — 1.9.5)
- Next milestone: Substep 1.9.1 — Increment C: Next.js BFF Session Cookies, CSRF Protection, and Server-to-Server FastAPI Forwarding

## Verified Project State

### 4-Hour Demo-First Implementation Sprint (Completed & Verified)
- **Real AI Provider Integration (`backend/app/core/ai/groq_adapter.py`)**:
  - Live Groq API adapter using models `openai/gpt-oss-120b` and `openai/gpt-oss-20b`.
  - Configured via `GROQ_API_KEY` (Pydantic `SecretStr`) loaded from `backend/.env`.
  - Supports streaming, tool call parsing, reasoning capture, exponential backoff, request timeouts, and error sanitization.
- **Session Workspace Manager (`backend/app/core/agent/workspace_manager.py`)**:
  - Authoritative candidate file tree management under `backend/workspace_storage/<session_id>`.
  - Anti-path traversal resolution (`resolve_safe_path`) preventing directory escape and restricting access to sensitive files (`.env`, `.git`, key material).
  - Atomic patch and edit tools returning clean unified diffs and tracking per-file revision numbers.
- **Isolated Pytest Runner (`backend/app/core/runner/isolated_runner.py`)**:
  - Docker container execution boundary (`codevo-runner:3.11`, `--network none`, `--memory 512m`, `--cpus 1.0`, non-root user, read-only trusted test mounts).
  - Subprocess execution fallback with stripped environment for environments where container daemon is offline.
  - Authoritative verification: CI-001 starter code produces 0/6 tests passed (identifying all 3 defects); post-fix execution produces 6/6 passed tests in 2.75s.
- **Coding Agent Orchestrator (`backend/app/core/agent/orchestrator.py`)**:
  - Turn-based agent execution loop driving tool calls (`read_file`, `patch_file`, `run_tests`).
  - History compaction to protect token limits and streaming timeline event dispatching.
  - End-to-end verified with live Groq model: Agent successfully inspects files, diagnoses 3 bugs, patches `app/utils/security.py` and `app/services/authentication.py`, and confirms trusted tests pass.
- **FastAPI Endpoints (`backend/app/api/v1/routes/agent_workspace.py`)**:
  - `POST /api/v1/workspace/{session_id}/init`: Initializes challenge starter code.
  - `GET /api/v1/workspace/{session_id}/files`: Returns document buffers and revision map.
  - `PUT /api/v1/workspace/{session_id}/files`: Receives Monaco document edits with debounced sync.
  - `POST /api/v1/runner/{session_id}/run`: Executes isolated pytest runner against session workspace.
  - `POST /api/v1/agent/{session_id}/run`: Runs coding agent loop and streams JSON SSE timeline events.
- **Frontend Workspace & AI Assistant Integration (`frontend/src/components/application/workspace/`)**:
  - `workspace-ai-assistant.tsx`: Live timeline view displaying agent reasoning, tool invocations, expandable file diffs, and test results badges.
  - `workspace-layout.tsx`: Auto-initializes backend session, loads authoritative document tree into Monaco, updates on agent patches, and pipes pytest runner stdout directly into terminal dock.
  - Lint & typecheck: 0 ESLint errors, 0 TypeScript compilation errors.

### Backend Architecture (backend/)
- Framework: Python 3.12+ with FastAPI 0.162.7 and Pydantic 2.14.3 (`pydantic-settings` 2.16.3).
- **Milestone 1.9.1 Increment A (Secure Backend Foundation)**:
  - Centralized settings in `app/core/config.py` with fail-closed production validators (rejecting `DEBUG=True`, wildcard `*` CORS, weak `INTERNAL_SERVICE_KEY`).
  - Secret masking in `repr`, `str`, `model_dump()`, and `ValidationError` via `pydantic.SecretStr`.
  - Safe host binding defaults (`HOST=127.0.0.1` for workstations, configurable to `0.0.0.0` for containers).
  - Structured error handlers in `app/core/errors.py` with sanitized client responses and UUID `error_id` correlation.
  - Safe structured logging without token or credential leakage.
  - Liveness (`/api/v1/health/live`) and honest readiness (`/api/v1/health/ready`) probes.
- **Milestone 1.9.1 Increment B (Supabase Authentication: JWT / JWKS Verification)**:
  - Cryptographic verification library: `pyjwt[crypto]` 2.15.1 (`cryptography` 50.0.2).
  - Public Key Provider (`app/core/auth/jwks.py`): Asymmetric JWKS retrieval from authoritative Supabase endpoint `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Caches public keys for configured TTL (600s), uses connection/read timeouts (5.0s), synchronizes concurrent fetches with `asyncio.Lock`, and handles key rotation with cooldown throttling.
  - Cryptographic Invariants: Accepts only `ES256` and `RS256`. Strictly rejects symmetric `HS256`, `none`, malformed keys, private key material, or algorithm/kty mismatches.
  - Claim Validation (`app/core/auth/verifier.py`): Validates exact issuer (`{SUPABASE_URL}/auth/v1`), audience (`authenticated`), UUID `sub`, role (`authenticated`), `exp`, `iat` (rejecting future-issued tokens), and `nbf`.
  - FastAPI Dependency (`app/core/auth/dependencies.py`): `get_current_user` extracts Bearer tokens, returns typed `AuthenticatedUser`, and yields HTTP 401 (`WWW-Authenticate: Bearer error="invalid_token"`) for bad tokens, and HTTP 503 (`Retry-After`) for infrastructure or unconfigured provider failures.
  - Demonstration Endpoint (`app/api/v1/routes/auth.py`): `GET /api/v1/auth/me` returning minimal verified identity (`id`, `role`).
  - 60 offline tests in `backend/tests/` passing with 100% pass rate.

### Frontend Architecture (frontend/)
- Framework: Next.js 16.4.6 (App Router)
- React: React 19.3.0
- Language: TypeScript 5.x (`@/*` path alias)
- Security Policy: Platform-wide security baseline aligned with OWASP Top 10:2025 and OWASP ASVS 5.0.0 (BFF session architecture with PostgreSQL database session store `private.sessions` and SHA-256 session token hashing, dual database roles `codevo_bff_role` and `codevo_api_role` with mutual table quarantine, session encryption key management with versioning and 7-day retention, service-to-service authentication between Next.js BFF and FastAPI, canonical workspace ownership and revision tracking in FastAPI with optimistic concurrency control, trusted test suite read-only isolation in `ci-001-fastapi-auth:v1.0.0`, zero persistent browser storage of credentials/tokens, accurate transient input lifecycle with immediate clearance, BFF CSRF protection with Origin/Referer validation and synchronizer tokens, 128-bit CSP nonces with pending implementation/browser verification status, proposed residual risk classification for Monaco inline styles awaiting explicit approval, permissive PostgreSQL RLS architecture verified via executable SQL tests under `codevo_api_role`, AES-256-GCM envelope encryption with unique DEKs, wrapped DEK storage and external KMS, and strict SSRF defenses).
- Styling: Tailwind CSS 4.3.3 / 4.3.5 via `@tailwindcss/postcss` and PostCSS
- Component System: shadcn/ui 4.23.0 (preset: `base-nova`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`)
- Code Editor: `@monaco-editor/react` 4.7.0 (integrated with dark theme, line numbers, automatic layout, uncontrolled `defaultValue` model initialization, and `editContext: false` to ensure 100% reliable native keystroke input on all platforms)
- Terminal Emulator: `@xterm/xterm` 6.0.0 and `@xterm/addon-fit` 0.11.0 (with responsive container resizing)
- Iconography: `lucide-react` 1.72.0
- Package Manager: npm 11.19.0 (Node.js v24.21.0)
- Design Tokens: Dark-first monochrome palette
  - Background: `#09090B`
  - Primary Surface: `#18181B`
  - Secondary Surface: `#121212`
  - Borders: `#27272A`
  - Primary Text: `#FAFAFA`
  - Muted Text: `#A1A1AA`
- Typography: System sans and monospace fonts with crisp contrast and offline reliability
- Next.js Configuration: `devIndicators: false` configured to suppress local dev server floating overlays

### Completed Milestone 1.8 Components & Features (Candidate Assessment & Results UI)
- **Centralized Assessment Data Model & Authoritative Submission State (`src/data/assessment.ts`)**:
  - `AssessmentReport`, `RubricCategoryScore`, `FeedbackItem`, `ActionableRecommendation`, `SubmissionRecord`.
  - `DEMO_ASSESSMENT_REPORT`: Deterministic demonstration scorecard for `CI-001`. Overall score 78 mathematically matches category weights:
    - Functional Correctness (40% weight, 75% score $\rightarrow$ 30.0 pts)
    - Security & Validation Hygiene (25% weight, 80% score $\rightarrow$ 20.0 pts)
    - Error Handling & Contract Compliance (20% weight, 80% score $\rightarrow$ 16.0 pts)
    - Code Structure & Maintainability (15% weight, 80% score $\rightarrow$ 12.0 pts)
    - Total = 78.0 / 100. All weights labeled as illustrative demo weights totaling 100%.
  - `AutomatedTestSnapshot`: 3 passed, 2 failed tests strictly decoupled from the qualitative rubric.
  - Client storage helpers (`codevo:submission:v1:*`) locking completed sessions across browser reloads while leaving `codevo:workspace:v1:*` untouched.
  - Idempotent `recordClientSubmission`: Preserves original submission timestamp and immutable `submittedDocuments` snapshot, refusing duplicate overwrites.
  - Event subscription `subscribeToSubmissionChanges` with `useSyncExternalStore` serving as the single authoritative source of truth across the workspace.
- **Enforced Workspace Submission Lock (`src/components/application/workspace/`)**:
  - **Monaco Editor Lock (`workspace-editor.tsx`)**: Configures `readOnly: true` and `domReadOnly: true` dynamically and on mount. Renders a distinct amber `Read-Only (Submitted)` badge in the editor tab bar. Preserves `editContext: false` native input engine.
  - **Mutation Rejection Layer (`workspace-layout.tsx`, `workspace-storage.ts`)**: `handleContentChange` and `saveWorkspaceState` strictly reject mutations if the session is submitted, preventing autosave or programmatic tampering.
  - **Toolbar Separation (`workspace-toolbar.tsx`)**: Completely decouples status from navigation. Renders a static, non-clickable emerald `Submitted` badge alongside an independent `View Report` navigation button. Disables `Run Tests` and locks evaluator scenario options.
  - **Test Runner & Terminal Lock (`workspace-terminal.tsx`, `workspace-test-results.tsx`, `workspace-bottom-dock.tsx`)**: Disables `Run Tests` and `Rerun` buttons. In the interactive terminal, entering `pytest` or mutation commands emits `[Session Locked]` notices and prevents execution.
- **Candidate Submission Modal (`src/components/application/workspace/workspace-submission-dialog.tsx`)**:
  - Accessible modal dialog (`role="dialog"`, `aria-modal="true"`).
  - Explicit finality notice informing candidate that submission finalizes the session.
  - Multi-stage staged processing experience (capturing snapshot, compiling test evidence, generating scorecard, redirecting).
- **Assessment Report Page (`src/app/app/results/[submissionId]/page.tsx`)**:
  - `AssessmentHeader`: Challenge ID, title, submission ID, timestamp (synchronized to client submission using `useSyncExternalStore`), and prominent `DEMO ASSESSMENT (SIMULATED)` disclaimer banner.
  - `AssessmentScoreCard`: Overall score (78/100), performance level pill ("Meets Expectations"), label "Demonstration Assessment", duration, files modified, and mathematical rubric formula breakdown.
  - `AssessmentTestSummary`: Isolated automated test assertions card ("Simulated Public Test Results", 5 tests, 3 passed, 2 failed, 1.42s), maintaining strict boundary between tests and qualitative scoring.
  - `AssessmentRubricCard`: 4 rubric category cards displaying weight percentage, score contribution, status badge, explanation, demonstration code evidence, and tips.
  - `AssessmentFeedbackPanel`: Strengths (3), Improvement Areas (3) with "Illustrative Evidence:", and Prioritized Actionable Recommendations (High, Medium, Low).
- **Interview History Integration (`src/app/app/history/page.tsx`, `src/data/dashboard.ts`)**:
  - Completed `CI-001` interview record archived with status (`Evaluated`), score (`78%`), duration, assertions passed, and direct link to open the assessment report.
  - Timestamp synchronized via `useSyncExternalStore` and `useMemo` cleanly without cascading effects.
  - Dashboard recent interviews section (`src/app/app/page.tsx`) updated to render completed submissions.
  - Dashboard terminology: "MVP Challenge Library", "Practical Engineering Interview Challenges from authentic codebases", and "Automated Evaluation — Planned Feature".

### Completed Milestone 1.7 Components & Features (Test Execution Runner & Output UI)
- **Centralized Test Simulation Architecture (`src/data/test-fixtures.ts`, `src/lib/test-runner.ts`)**:
  - `TEST_SCENARIOS`: 3 deterministic illustrative demo scenarios (`initial-defects`, `all-passing`, `execution-error`). Explicitly identified as simulated fixtures that do not represent official evaluation criteria or hidden tests.
  - `executeSimulatedTests`: Typed asynchronous simulation coordinator driving live state (`pending` -> `running` -> `passed` / `failed`) with timeout cleanup and cancellation support (`cancel`).
  - Terminal stream synchronizer: Emits realistic ANSI-formatted `pytest` logs synchronously with test results.
- **Unified Bottom Dock (`src/components/application/workspace/workspace-bottom-dock.tsx`)**:
  - Tabbed dock containing `Terminal` (interactive bash) and `Test Results` (structured report).
  - Live status indicators on tabs (running spinner, passed green dot, failed red count badge).
  - Clean minimize/close action and height allocation.
- **Structured Test Results UI (`src/components/application/workspace/workspace-test-results.tsx`)**:
  - Mandatory `SIMULATED EXECUTION` badges and disclaimer notices.
  - Overall status pill (`RUNNING`, `ALL TESTS PASSED`, `X TESTS FAILED`, `EXECUTION CANCELLED`, `EXECUTION ERROR`).
  - Summary metrics: Total tests (5), Passed count, Failed count, Duration (e.g. `1.42s`).
  - Interactive filter tabs: `All`, `Failed`, `Passed`.
  - Individual test rows with status badges, test paths, and execution times.
  - Expandable assertion diffs and simulated Python pytest tracebacks for failed tests.
  - Clean empty, running, error, and cancelled states with retry actions.
- **Interactive Toolbar Controls (`src/components/application/workspace/workspace-toolbar.tsx`)**:
  - Interactive "Run Tests" action with running state, progress spinner, duplicate-click prevention, and dedicated "Cancel" stop action.
  - Discrete `[Demo Session Options]` popover clearly separated for evaluators/preview to test different outcomes (`initial-defects`, `all-passing`, `execution-error`) without letting candidates choose outcomes in production.
- **Terminal Integration (`src/components/application/workspace/workspace-terminal.tsx`)**:
  - Typing `pytest` in the terminal triggers the exact same test execution lifecycle and streams pytest logs live.
  - Preserved all existing commands (`help`, `python --version`, `clear`).
- **Responsive Workspace Orchestrator (`src/components/application/workspace/workspace-layout.tsx`)**:
  - Connects runner state, bottom dock active tab, terminal stream, and unmount cancellation.
  - Added "Tests" tab to mobile view switcher for responsive viewing on narrow viewports.
  - Monaco editor keyboard input (`editContext: false`) and `localStorage` persistence remain 100% untouched and functional.

### Completed Milestone 1.6 Components & Features (Interactive IDE Workspace)
- **Centralized Workspace Data Model (`src/data/workspace.ts`)**:
  - `DEMO_SESSION_ID`: Enforced deterministic demo session `ci-001-demo`.
  - Types: `WorkspaceFile`, `WorkspaceFolder`, `WorkspaceNode`, `isFolder`.
  - `INITIAL_WORKSPACE_FILES`: Complete 10-file starter repository for FastAPI Auth Service (`CI-001`), including intentionally imperfect starter code in `app/services/authentication.py`, public tests in `tests/test_auth.py`, routes, models, configuration, and README. Strictly omits hidden test fixtures or reference solutions.
  - `WORKSPACE_FILE_TREE`: Hierarchical folder tree structure.
- **Workspace Route (`src/app/app/workspace/[sessionId]/page.tsx`)**:
  - Validates `sessionId === "ci-001-demo"`. Arbitrary or invalid session IDs render an explicit "Invalid or Expired Workspace Session" notice with direct links to the demo session or back to challenges.
- **AppShell Integration (`src/components/application/app-shell.tsx`)**:
  - Automatically bypasses dashboard sidebar and top header on `/app/workspace/*` routes, allocating 100% of browser viewport to the IDE.
- **Workspace UI Components (`src/components/application/workspace/`)**:
  - `WorkspaceToolbar` (`workspace-toolbar.tsx`): 48px header with Wordmark, Challenge identity (`CI-001`), Demo Session pill, static `40:00` timer placeholder, disabled Run and Submit buttons with explanatory tooltips, and exit navigation back to `/app/challenges`.
  - `WorkspaceActivityBar` (`workspace-activity-bar.tsx`): 48px vertical rail with toggles for Explorer, Problem Briefing, Terminal, and AI Assistant.
  - `WorkspaceFileExplorer` (`workspace-file-explorer.tsx`): Collapsible folder tree with language-specific file icons and active file highlight.
  - `WorkspaceEditor` (`workspace-editor.tsx`): Multi-tab manager (active indicator, unsaved dot with hover-to-close action, close action) + Monaco editor configured with uncontrolled `defaultValue` model initialization, `keepCurrentModel={true}`, `saveViewState={true}`, explicit `select-text` CSS isolation, `editContext: false` (disabling experimental Chromium EditContext API to eliminate character dropping bugs on Windows), and native `Ctrl+S` interception to prevent browser Save page interference.
  - `WorkspaceTerminal` (`workspace-terminal.tsx`): Collapsible bottom panel powered by xterm.js and FitAddon. Clearly labeled as a simulated environment; responds to `help`, `python --version`, `pytest` (simulated notice), and `clear`.
  - `WorkspaceProblemPanel` (`workspace-problem-panel.tsx`): Collapsible briefing panel consuming `OFFICIAL_CHALLENGES[0]` directly as the single source of truth.
  - `WorkspaceAiAssistant` (`workspace-ai-assistant.tsx`): Collapsible side drawer with Chat vs Agent mode switch, suggested prompts, message history layout, and explicit notice that BYOK inference is scheduled for Milestone 1.9.
  - `WorkspaceLayout` (`workspace-layout.tsx`): Root responsive orchestrator managing panel states, centralized document buffers (`documents: Record<string, { content: string; isModified: boolean }>`) separating tab presentation (`openFilePaths`) from in-memory edits so closing tabs does not destroy buffer modifications, and a mobile view switcher preventing horizontal overflow.
- **Client-Side Workspace Storage Persistence (`src/lib/workspace-storage.ts`)**:
  - Schema Versioning & Isolation: Unique versioned localStorage keys per session ID (`codevo:workspace:v1:${sessionId}`) preventing cross-session crosstalk.
  - Persisted Data Structure: Version (1), session ID, updated timestamp, complete document buffer (`documents: Record<string, { content: string; isModified: boolean }>`), open tab paths (`openFilePaths`), and active file path (`activeFilePath`). Terminal output, temporary UI states, and secrets are strictly excluded.
  - Automatic Saving: Debounced background persistence (400ms) with synchronous immediate flushing on `beforeunload`, `pagehide`, and component unmount via `latestStateRef` to prevent stale closure data loss.
  - Hydration-Safe Restoration: Uses `useSyncExternalStore` for client hydration guarding and `getInitialWorkspaceState` for synchronous client initialization, avoiding React 19 cascading render warnings, hydration mismatches, and Monaco model disposal/flicker.
  - Validation & Fault Tolerance: Rejects incompatible versions and malformed JSON; gracefully catches `QuotaExceededError` and private browsing restrictions without crashing the workspace.
  - *Limitations*: Client-local storage only (scoped to user's browser profile). No server-side persistence, background autosave to API, or cross-device syncing in this milestone.

### Completed Milestone 1.5 Components & Features (Interactive Challenge Library)
- **Centralized Data Model Extension (`src/data/challenges.ts`)**:
  - Extended `Challenge` type with `problemSummary`, `requirements` list, `engineeringFocus`, and `supportedLanguages`.
  - All 5 official challenges (`CI-001` through `CI-005`) populated with grounded requirements from PRD Section 7 without inventing hidden test fixtures or private rubrics.
  - Exported `ALL_CATEGORIES` and `ALL_DIFFICULTIES` constants.
- **Challenge Library Components (`src/components/application/challenges/`)**:
  - `ChallengeSearch` (`challenge-search.tsx`): Client-side search input matching title, ID, category, tech stack, and description with search icon and clear (`X`) button.
  - `ChallengeFilters` (`challenge-filters.tsx`): Category and difficulty pill filters with active indicator states, result count indicator, and one-click reset action.
  - `ChallengeCard` (`challenge-card.tsx`): Scannable, consistent-height challenge card with ID pill, category, difficulty tag, duration, tech stack, short description, and "View Details" action.
  - `ChallengeDetailsDialog` (`challenge-details-dialog.tsx`): Accessible briefing modal (`role="dialog"`, `aria-modal="true"`) displaying full challenge metadata, problem summary, key assessment requirements, engineering focus, and a clearly disabled session start button (`Milestone 1.7`).
  - `ChallengeLibrary` (`challenge-library.tsx`): Interactive client-side orchestrator coordinating search, multi-factor filtering, result counting, zero-match empty state, and briefing dialog state.
- **Challenges Page (`src/app/app/challenges/page.tsx`)**:
  - Editorial header with dynamic challenge counter (`5 Available Challenges`), descriptive subtitle, and integrated `ChallengeLibrary`.

### Completed Milestone 1.4 Components & Mock Data (Dashboard UI & Overview)
- **Centralized Typed Mock Data (`frontend/src/data/`)**:
  - `challenges.ts`: Defines `Challenge` and `ChallengeDifficulty` types. Centralizes the 5 official PRD MVP challenges (`CI-001` through `CI-005`) with exact IDs, titles, categories, difficulty levels, durations, and stacks.
  - `dashboard.ts`: Defines `DashboardMetric` and `InterviewHistoryRecord` interfaces. Exports `DEMO_DASHBOARD_METRICS` (Available Challenges: 5, Active Sessions: 0, Completed Interviews: 0, Average Score: "—") explicitly flagged with `isPlaceholder` attributes.
- **Dashboard Components (`frontend/src/components/application/dashboard/`)**:
  - `DashboardMetrics` (`dashboard-metrics.tsx`): 4-card responsive metrics grid (`grid-cols-2 lg:grid-cols-4`) with subtle borders, monospace figures, and explicit `Demo Preview` badge.
  - `DashboardChallengeCard` (`dashboard-challenge-card.tsx`): Compact, scannable card displaying challenge ID, category, difficulty tag, title, description, duration with timer icon, tech stack, and link navigating to `/app/challenges`.
  - `AvailableChallenges` (`available-challenges.tsx`): Section component rendering all 5 PRD MVP challenges in a responsive grid with a "View all" action linking to `/app/challenges`.
- **Dashboard Page (`src/app/app/page.tsx`)**:
  - **Section A (Welcome)**: Editorial layout on canvas, status pill, primary CTA, and 3-point context strip.
  - **Section B (Summary Metrics)**: Renders `DashboardMetrics` with preview labels.
  - **Section C (Available Challenges)**: Renders `AvailableChallenges` previewing the 5 PRD challenges.
  - **Section D (Continue Practicing)**: Compact empty state for in-progress timed sessions.
  - **Section E (Recent Interviews)**: Compact empty state for past submissions with link to `/app/history`.
  - **Section F (Your Activity)**: Concise signals panel with planned/coming-soon indicators.

### Completed Milestone 1.3 Components & Pages (Application Shell)
- `AppShell` (`src/components/application/app-shell.tsx`): Root layout orchestrator coordinating desktop sidebar toggle (expanded 240px vs collapsed 64px rail), responsive mobile drawer with backdrop overlay, and max-5xl centered content area with horizontal overflow protection.
- `AppSidebar` (`src/components/application/app-sidebar.tsx`): Refined monochrome sidebar with Codevo Wordmark, subtle separators (`border-border/50`), restrained active navigation states (`bg-white/[0.08]` without bulky borders), uppercase monospace category dividers, and bottom user profile card.
- `AppHeader` (`src/components/application/app-header.tsx`): Compact 56px sticky topbar with subtle bottom divider (`border-border/50 bg-background/80 backdrop-blur-md`), minimal ghost toggle buttons, understated font-mono breadcrumbs (`Codevo / [Section]`), and compact user profile menu.
- `UserMenu` (`src/components/application/user-menu.tsx`): Compact user profile pill with 24px "GU" avatar, guest username, explicit "Demo Preview" badge, and clean popover menu with links to Settings, BYOK status, and landing page return.
- `EmptyState` (`src/components/application/empty-state.tsx`): Editorial, compact developer-grade state (`border border-border/60 bg-card/25 rounded-lg`) with 32px icon badge, concise text, and compact action button.
- Application Layout (`src/app/app/layout.tsx`): Next.js App Router nested layout wrapping all `/app/*` routes inside `AppShell`.
- Challenges Placeholder (`src/app/app/challenges/page.tsx`): Editorial page with roadmap badge, search/filter disabled preview, and compact library preparation state.
- History Placeholder (`src/app/app/history/page.tsx`): Editorial page with evaluation retention notice and compact empty state for past submissions.
- Settings Placeholder (`src/app/app/settings/page.tsx`): Clean settings dashboard with section anchors for Profile (explicitly identified as a demo layout placeholder), Appearance (Dark-First Monochrome system notice), and AI Provider Configuration (explicitly identified as planned functionality for Milestone 1.9 without premature security guarantees).
- Updated Marketing Navbar (`src/components/marketing/navbar.tsx`): Connected "Enter Dashboard" CTA button to direct users into `/app`.

### Completed Milestone 1.2 Components (Refined)
- `Navbar` (`src/components/marketing/navbar.tsx`): 64px sticky header with wordmark, anchor navigation (`#preview`, `#how-it-works`, `#challenges`, `#ai-modes`), action links, and mobile drawer.
- `Hero` (`src/components/marketing/hero.tsx`): Primary headline *"Real engineering. Not just interview puzzles."*, subtext, CTAs, category pill, and 4 refined, high-contrast feature signal cards.
- `WorkspacePreview` (`src/components/marketing/workspace-preview.tsx`): Custom browser IDE visual preview with distinct surface backgrounds, legible line numbers, syntax/defect highlights, embedded terminal test results, and interactive Chat/Agent AI assistant drawer.
- `HowItWorks` (`src/components/marketing/how-it-works.tsx`): 4-step workflow cards with comfortable typography, clear numbers, and clean icons.
- `ChallengeCatalogue` (`src/components/marketing/challenge-catalogue.tsx`): Filterable catalogue featuring the 5 PRD MVP challenges with a symmetrically centered second row on desktop (6-column layout) and tablet (2-column layout).
- `AiModes` (`src/components/marketing/ai-modes.tsx`): Dual-mode comparison (Chat Mode vs Agent Mode) with scannable capability rows and candidate BYOK breakdown.
- `CtaSection` (`src/components/marketing/cta-section.tsx`): High-contrast closing call to action *"Stop memorizing answers. Start solving real problems."*.
- `Footer` (`src/components/marketing/footer.tsx`): Monochrome footer with wordmark, tagline, platform links, challenge direct links, principles, and copyright notice.
- `MarketingLandingPage` (`src/app/page.tsx`): Modular landing page composition with horizontal overflow protection.

### Verified Checks (Milestone 1.4)
- ESLint: Passed (`npm run lint` -> 0 errors, 0 warnings).
- TypeScript Type Check: Passed (`npx tsc -p frontend/tsconfig.json --noEmit` -> 0 errors).
- Production Build: Passed (`npm run build` -> compiles static pages `/`, `/app`, `/app/challenges`, `/app/history`, `/app/settings`, and `/_not-found`).
- Prerendering: Verified HTML generation in `.next/server/app/` (`index.html`, `app.html` [80.7 KB], `challenges.html`, `history.html`, `settings.html`).

### Out of Scope / Unstarted
- Challenge library filtering and detail drawers (Milestone 1.5).
- Candidate Challenge Workspace & Monaco Editor (Milestone 1.6).
- Authentication, Supabase, backend FastAPI, AI provider SDKs, Docker execution, and evaluation engines remain untouched per roadmap order.

### Out of Scope / Unstarted
- Candidate Dashboard metrics/activity persistence (Milestone 1.4).
- Authentication, Supabase, backend FastAPI, AI provider SDKs, Docker execution, and Monaco/xterm integrations remain untouched per roadmap order.
