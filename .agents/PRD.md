# Codevo — Product Requirements Document

- Status: Draft for founder review
- Product: Codevo
- Working domain: `codevo.runs-on.dev` (user reports it is available; this document does not verify claim/configuration)
- Updated: 2026-11-07

## 1. Product summary
Codevo is an AI-assisted practical engineering interview platform. Developers practice realistic technical interviews by entering an existing codebase, understanding a task, debugging defects or implementing a feature, running tests, and submitting work within a fixed time limit.

Codevo assesses practical engineering ability, not only isolated algorithm puzzles.

Working tagline: **Build. Debug. Prove.**

The product name is provisional from a brand/legal perspective. Similar or identical names are used by existing businesses. Domain availability is not trademark clearance.

## 2. Problem
Real engineering work requires developers to understand unfamiliar repositories, trace behaviour, identify root causes, work across application layers, make safe changes, run tests, interpret results, explain decisions, and use AI responsibly. Codevo provides a structured environment to practice these skills.

## 3. Target users
- Software developers preparing for technical interviews.
- Junior and early-career developers.
- AI/ML engineers preparing for practical engineering interviews.
- Developers improving debugging and repository-level problem-solving.

Initial product is candidate-focused. Recruiter/ATS workflows are out of initial MVP scope.

## 4. Product principles
1. Practical engineering over puzzle-only practice.
2. Realistic repositories and reproducible challenge environments.
3. Transparent, challenge-specific evaluation.
4. Candidate-controlled AI assistance through BYOK.
5. Time limits create interview realism without hiding platform failures.
6. Candidate privacy and execution security are foundational.
7. Focused, fast, accessible developer-first UX.

## 5. Candidate journey
1. Visit landing page; sign up/sign in.
2. Browse and filter challenge library.
3. Open challenge details and review requirements, difficulty, language, and time limit.
4. Start an interview; timer starts and workspace is provisioned.
5. Inspect files, edit code, run tests/commands, optionally use AI.
6. Submit early or reach the deadline and auto-submit.
7. Evaluate the final snapshot in a fresh isolated environment.
8. Show results and store the session in interview history.

## 6. MVP features

### Landing page
Explain practical interviews, how Codevo works, challenge categories, AI assistance, and provide clear calls to action.

### Authentication/profile
Sign up, sign in/out, profile and basic preferences. Planned auth: Supabase Auth.

### Dashboard
Available challenges, active session if applicable, completed interviews, recent activity, and performance overview. Use honest empty states.

### Challenge library/details
Search and filter by difficulty/category/language. Show duration, summary, requirements, and start action.

### Timed interview
- Every challenge has a fixed duration.
- Timer begins only when candidate starts.
- Timer continues while editing, running tests, or using AI.
- Refresh/navigation must not reset deadline.
- Backend/server deadline is authoritative; browser timer is display only.
- Warnings at 10, 5, and 1 minute where applicable.
- Candidate can submit early.
- At deadline, finalize the latest successfully saved snapshot.
- Platform/infrastructure failures must be distinguished from candidate failures.
- Evaluation time after submission does not count against candidate.
- Pause/resume is not in MVP unless separately approved.

### Interview workspace
File explorer, Monaco editor/tabs, problem panel, terminal UI (xterm.js), test/output panel, resizable/collapsible AI assistant, timer, save state, and submit controls. Monaco is an editor component, not a full VS Code distribution.

### AI assistant — BYOK
Candidate supplies their own provider key and selects a supported provider/model. Providers under consideration: Gemini, OpenAI, Groq, Cerebras, and Ollama/local. Verify current provider/model compatibility before promising support.
- Chat mode: explanations/suggestions; candidate edits manually.
- Agent mode: inspect/edit workspace and run approved tools within permissions.
- Never return saved API keys in plaintext to browser after storage or log credentials.
- Hosted backend cannot automatically access candidate's localhost Ollama; local connectivity needs a deliberate local bridge/agent design.

### Evaluation/results
- Public tests may be visible.
- Hidden tests run only in evaluator-controlled infrastructure.
- Automated tests are primary correctness signal.
- Static analysis and AI review are supplementary.
- AI feedback must be evidence-based and communicate uncertainty.
- Never expose hidden test source, reference patches, or private rubrics.
- Show score breakdown, test summary, strengths, weaknesses, and improvement suggestions.

### History/settings
History includes previous sessions, challenge, date, status, score, report. Settings include profile, AI provider/key, preferred language, theme, account settings.

## 7. Initial challenge catalogue
Durations are initial values and may change after user testing.

| ID | Challenge | Difficulty | Duration |
|---|---|---|---:|
| CI-001 | Debug a Broken FastAPI Authentication API | Medium | 40 min |
| CI-002 | Fix a Broken RAG Pipeline | Hard | 50 min |
| CI-003 | Fix React and FastAPI Integration | Medium | 45 min |
| CI-004 | Debug a Broken ETL Pipeline | Medium | 45 min |
| CI-005 | Fix an ML Prediction API | Hard | 50 min |

CI-001: registration validation, password hashing/verification, duplicate email, safe errors.
CI-002: ingestion, chunking, embeddings, retrieval, metadata/citations, grounding, abstention.
CI-003: request/response contracts, loading/error/empty states, duplicate submissions, state synchronization.
CI-004: parsing, data quality, decimal/date handling, deduplication, idempotent loads, rejected-row accounting.
CI-005: training/serving preprocessing, feature ordering, validation, prediction parity.

## 8. Evaluation principles
- Each challenge has its own tests and rubric.
- Original broken starter should fail intended tests; reference solution should pass; plausible incorrect fixes should fail relevant tests.
- Hidden tests target behaviours/edge cases, not arbitrary implementation details.
- Infrastructure failures/timeouts are separate from candidate mistakes.
- Do not score raw prompt count, token count, typing speed, files opened, or time spent as direct proxies for ability.
- Chat and agent modes should not be scored differently solely due to mode.
- AI collaboration assessment must be evidence-based, not based on quantity of AI use.
- Challenge-specific rubric weights total 100.

## 9. Out of scope for initial MVP
Recruiter ATS, multiplayer interviews, video/audio proctoring, webcam/screen recording, public leaderboards, payments, unlimited cloud execution, arbitrary internet from candidate sandboxes, mobile-native apps, and claims that plain Docker alone is a complete public multi-tenant security boundary.

## 10. MVP success criteria
A candidate can register, browse challenges, start a timed session, inspect/edit a repository, run allowed tests/commands in isolation, use their own configured AI provider, submit early or auto-submit at deadline, receive a reproducible report, and review it in history. MVP is incomplete until the end-to-end journey and security boundaries are tested.
