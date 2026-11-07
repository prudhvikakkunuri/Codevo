---
trigger: model_decision
description: "Apply when changing project specifications, architecture, decisions, roadmap, or implementation status."
---

# Codevo documentation maintenance

- Update the relevant project document when an accepted product or architecture decision changes.
- Add a new decision entry; do not silently erase decision history.
- Update MEMORY.md after a milestone, verified test/build result, or meaningful status change.
- Label work as proposed, planned, implemented, tested, or verified accurately.
- Do not mark roadmap items complete until acceptance criteria are met.
- Keep PRD.md for product requirements, ARCHITECTURE.md for system design, ROADMAP.md for sequence/status, DECISIONS.md for decision history, and MEMORY.md for concise current state.
- Never write secrets or credentials into documentation.
