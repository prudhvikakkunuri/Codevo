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
- [ ] Create Next.js + TypeScript project.
- [ ] Configure Tailwind and shadcn/ui.
- [ ] Configure dark-first monochrome tokens.
- [ ] Configure fonts and metadata.
- [ ] Create Codevo wordmark.
- [ ] Create foundational button/card/typography styles.
- [ ] Create temporary minimal home page.
- [ ] Verify lint and production build.

### Step 2: Landing page
- [ ] Hero and CTA.
- [ ] How it works.
- [ ] Challenge categories.
- [ ] AI assistance explanation.
- [ ] Footer and responsive layout.

### Step 3: Application shell
- [ ] Sidebar/top navigation.
- [ ] Mobile navigation.
- [ ] Empty/loading/error states.

### Step 4: Dashboard
- [ ] Summary metrics with clearly identified mock data.
- [ ] Available challenges.
- [ ] Recent interviews.
- [ ] Responsive layout.

### Step 5: Challenge library
- [ ] Challenge cards.
- [ ] Search and filters.
- [ ] Difficulty/duration labels.
- [ ] Empty states.

### Step 6: Challenge details
- [ ] Problem summary and requirements.
- [ ] Difficulty, language, time limit.
- [ ] Start confirmation.

### Step 7: Interview workspace UI
- [ ] File explorer and tabs.
- [ ] Monaco editor.
- [ ] Problem panel.
- [ ] AI assistant panel.
- [ ] Terminal UI.
- [ ] Test/output panel.
- [ ] Timer and submit confirmation.
- [ ] Resizable/collapsible panels.

### Step 8: Results UI
- [ ] Overall score.
- [ ] Test summary.
- [ ] Rubric breakdown.
- [ ] Evidence-based feedback layout.

### Step 9: Settings/history
- [ ] Profile settings.
- [ ] AI provider settings mock UI.
- [ ] Interview history.
- [ ] Preferences.

### Step 10: UI quality pass
- [ ] Desktop/tablet/mobile checks.
- [ ] Keyboard/accessibility checks.
- [ ] No dead buttons.
- [ ] No misleading mock functionality.
- [ ] Consistent empty/loading/error states.

UI phase uses mock data only. Do not imply persistence, AI, or code execution is real before integration.

## Phase 2 — Authentication and database
Supabase setup, schema/migrations, RLS, auth flows, profile persistence, challenge APIs, session metadata APIs.

## Phase 3 — Workspace functionality
Workspace model, file operations, editor state, autosave/snapshot, terminal connection, server-authoritative timer, submission state machine.

## Phase 4 — BYOK AI
Provider abstraction, model compatibility, secure credential lifecycle, connection test, chat mode, scoped agent mode, usage/error handling.

## Phase 5 — Code execution
Local Docker prototype, disposable sandbox, resource limits, network restrictions, command approval, workspace snapshots, infrastructure failure classification, security review before public exposure.

## Phase 6 — Evaluation
Complete runnable CI-001 repository, public/hidden separation, reference solution verification, broken starter verification, incorrect-patch verification, scoring engine, candidate-safe report, then remaining challenges.

## Phase 7 — End-to-end hardening
Candidate journey tests, deadline/disconnect tests, authorization tests, sandbox security testing, secret review, privacy/retention review, accessibility/performance.

## Phase 8 — Deployment
Choose hosting after current terms/limits review, configure domain/TLS/secrets, monitoring without secret leakage, backups/recovery, production smoke tests.
