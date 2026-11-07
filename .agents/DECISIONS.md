# Codevo — Decision Log

Add decisions here. Do not silently erase history. When a decision changes, mark the old one superseded and record why.

## Accepted initial decisions

### D-001 — UI-first development
Decision: Build and inspect frontend before backend and AI integration.
Reason: Validate product experience before integration complexity.
Status: Accepted.

### D-002 — Frontend stack
Decision: Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui.
Status: Accepted for initial UI.

### D-003 — Visual identity
Decision: Dark-first, premium, minimal, monochrome black/white/grey. Avoid decorative gradients, neon, glassmorphism, excessive shadows.
Status: Accepted.

### D-004 — Coding workspace
Decision: Monaco Editor for browser editor; build surrounding IDE-like experience ourselves; xterm.js for terminal UI. Monaco is not a full VS Code distribution.
Status: Accepted direction.

### D-005 — AI billing
Decision: Candidate-facing AI assistant uses BYOK.
Clarification: Separate platform-owned evaluation AI is not covered by candidate BYOK. Automated tests are primary; any evaluation AI needs separate cost/credential decisions.
Status: Accepted.

### D-006 — Time limits
Decision: Every challenge has fixed duration; initial values are in PRD.md. Server deadline is authoritative.
Status: Accepted.

### D-007 — Evaluation
Decision: Automated hidden tests are primary for defined behaviour; AI review is supplementary and evidence-based.
Status: Accepted.

### D-008 — Backend direction
Decision: Python + FastAPI, Supabase PostgreSQL/Auth.
Status: Proposed for later phase; not implemented.

### D-009 — Execution
Decision: Local Docker prototype; public multi-user execution needs stronger isolation and security review.
Status: Proposed for later phase; not implemented.

### D-010 — Product name
Decision: Codevo is the working project name.
Caveat: Similar/exact software businesses exist. Subdomain availability does not establish trademark rights.
Status: Provisional.

### D-011 — Cost
Decision: Aim for a ₹0 local MVP using open-source tooling/free tiers where practical.
Caveat: Free tiers have limits and may change; public hosting/execution/storage/provider inference are not guaranteed free.
Status: Accepted goal, not guarantee.

## New decision template
### D-XXX — Short title
- Date:
- Decision:
- Context:
- Alternatives:
- Consequences:
- Status: Proposed / Accepted / Superseded
