---
trigger: glob
globs: "*.tsx, *.ts, *.css"
description: "Frontend implementation rules for Codevo's Next.js and TypeScript application."
---

# Codevo frontend rules

- Follow monochrome design tokens in the global stylesheet.
- Prefer existing shadcn/ui components where suitable.
- Use semantic HTML, accessible labels, visible keyboard focus, and keyboard-accessible interactions.
- Prefer server components by default; add client components only when browser interactivity/state requires them.
- Keep client component boundaries small.
- Use typed props; avoid `any`.
- Test responsive layouts and narrow viewports.
- Prefer design tokens over arbitrary inline colours.
- Do not represent mock data as persisted or real functionality.
- Every visible control must work, be disabled with explanation, or be clearly marked as not implemented.
- Do not install Monaco, xterm.js, chart libraries, or other large dependencies until the corresponding roadmap milestone.
