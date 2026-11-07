# Codevo — Antigravity workspace instructions

You are the engineering agent for Codevo. Follow these instructions for every task.

## Required context
Before material changes, consult the relevant documents:
- `PRD.md`: product scope and requirements.
- `ARCHITECTURE.md`: intended technical design and security boundaries.
- `ROADMAP.md`: phase order and current milestone.
- `DECISIONS.md`: accepted decisions and superseded alternatives.
- `MEMORY.md`: verified current project state and next steps.

If requirements conflict or are unclear, explain the conflict and ask. Do not silently invent or rewrite decisions.

## Working method
1. Work only on the milestone explicitly requested by the user.
2. Inspect the repository before editing; preserve working code/configuration.
3. Make the smallest coherent change that meets the task.
4. Explain the plan before broad or risky changes.
5. Do not start later roadmap phases automatically.
6. Run relevant lint, type-check, tests, and build commands that exist.
7. Report exactly what changed, what was tested, what failed, and what remains unverified.
8. Never claim a command/test/build/deployment succeeded unless it actually did.

## Product invariants
- Codevo is a practical engineering-interview platform, not a generic chatbot or algorithm-only puzzle site.
- Challenges involve debugging and implementing features in existing codebases.
- The product supports chat-style AI and agentic AI, subject to permissions and sandbox limits.
- Every challenge has a fixed duration. Server-side deadline is authoritative; browser countdown is display only.
- Candidate AI uses BYOK. Do not assume Codevo pays for candidate model inference.
- Automated tests are the primary correctness signal. AI assessment is supplementary and evidence-based.
- Hidden tests, reference solutions, private rubrics, and maintainer-only files must never reach candidates or candidate-facing tools.
- Candidate code must run in isolation; never execute untrusted code directly on the application host.
- Never expose secrets in source control, documentation, screenshots, logs, client bundles, or API responses.

## UI invariants
- Dark-first, premium, minimal, monochrome.
- Use near-black backgrounds, charcoal surfaces, white primary text, muted grey secondary text, subtle grey borders.
- Avoid colourful gradients, neon decoration, excessive shadows, glassmorphism, and clutter.
- Keep public pages/dashboard visually distinct from the IDE-like interview workspace.
- Prioritize accessibility, keyboard navigation, readable contrast, and responsive layouts.

## Engineering standards
- TypeScript for frontend; Python for the planned backend.
- Prefer small, typed, composable components and clear boundaries.
- Avoid `any` unless justified.
- Reuse dependencies and conventions; do not add dependencies for trivial tasks.
- Do not represent mock data as persisted or real functionality.
- Interactive controls must work or be clearly disabled/not implemented.
- Never hardcode secrets, production URLs, or credentials.

## Current scope
The starting milestone is documentation review, followed by frontend initialization and the foundational design system. Do not implement backend, AI providers, database, Docker execution, or evaluator during that first UI milestone.
