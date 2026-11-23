# Codevo Frontend

The Codevo frontend is the browser application for the **Build. Debug. Prove.** practical engineering interview platform. It provides the public product experience, candidate-facing application shell, challenge catalogue, coding workspace, AI-assistant interface, test feedback, and submission/report views.

This guide is intended for developers taking over frontend work. It explains how to run the app, how the routes and components are organized, how authentication is wired, how the frontend talks to FastAPI, and which screens currently use demo data.

> **Implementation status:** This is an actively developed prototype. The Next.js UI and the Supabase browser-auth foundation are implemented. Some dashboard metrics, profile/settings details, and portions of the assessment experience use demo or placeholder data. The frontend does not yet implement the planned Next.js BFF session-cookie architecture.

- Repository: [prudhvikakkunuri/Codevo](https://github.com/prudhvikakkunuri/Codevo)
- App directory: `frontend/`
- Framework: Next.js App Router
- Runtime: Node.js (project developed with Node 24.x / npm 11.x)
- Package manager: npm (lockfile is the dependency source of truth)

---

## 1. Product role and user journey

The frontend is responsible for rendering the candidate experience and coordinating browser interactions. It is not the authority for identity, workspace ownership, test results, or final assessment data; those responsibilities belong on the backend.

Typical candidate journey:

```text
Public landing page
       |
       v
Sign up / sign in (Supabase Auth)
       |
       v
Application dashboard
       |
       v
Challenge catalogue
       |
       v
Challenge briefing / start
       |
       v
Coding workspace
  |       |        |
  |       |        +--> AI assistant
  |       +-----------> Run tests
  +-------------------> Edit files
       |
       v
Submit workspace
       |
       v
Assessment report / interview history
```

The app currently supports a deterministic CI-001 demo workspace. Do not assume that every catalogue challenge has its own backend starter repository and trusted evaluator yet.

---

## 2. Technology stack

| Technology | Use in this project |
|---|---|
| Next.js 16.4.6 | App Router, route layouts, server/client component boundaries, build and dev server |
| React 19.3 | Component rendering and client-side state |
| TypeScript 5 | Type checking and typed component/data contracts |
| Tailwind CSS 4 | Utility-first styling and global design system |
| Base UI / shadcn | Reusable accessible UI primitives |
| Monaco Editor | Code editing in the interview workspace |
| xterm.js | Terminal-style workspace panel |
| Supabase JS 2.x | Browser authentication and session management |
| Lucide React | Icons |
| ESLint 9 / eslint-config-next | Linting |

The exact dependency versions and scripts are defined in `package.json`.

---

## 3. Application structure

The important frontend areas are:

```text
frontend/
├── public/                         # Static assets and icons
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root metadata, global CSS, AuthProvider
│   │   ├── page.tsx                # Public marketing landing page
│   │   ├── globals.css             # Global styles / Tailwind entry
│   │   └── app/
│   │       ├── layout.tsx          # Application shell layout
│   │       ├── page.tsx            # Candidate dashboard
│   │       ├── challenges/
│   │       │   └── page.tsx        # Challenge catalogue
│   │       ├── workspace/
│   │       │   └── [sessionId]/
│   │       │       └── page.tsx    # Dynamic coding workspace route
│   │       ├── history/
│   │       │   └── page.tsx        # Authenticated submission history
│   │       ├── results/
│   │       │   └── [submissionId]/
│   │       │       └── page.tsx    # Submission report
│   │       └── settings/
│   │           └── page.tsx        # Candidate settings UI
│   ├── components/
│   │   ├── application/            # Dashboard, challenges, workspace, reports
│   │   ├── marketing/              # Landing-page sections
│   │   └── ui/                     # Shared UI primitives
│   ├── data/                       # Challenge, workspace and demo fixtures
│   └── lib/
│       ├── auth-context.tsx        # Global Supabase auth state and actions
│       └── supabase.ts             # Supabase client and backend fetch helper
├── package.json
├── tsconfig.json
└── README.md
```

This is a guide to the main areas, not a promise that every nested component is listed. Use the source tree for the complete current inventory.

### Architectural boundaries

- `app/` owns URL routing, route-level composition, and layouts.
- `components/marketing/` owns public landing-page sections.
- `components/application/` owns the candidate product experience.
- `components/ui/` owns reusable low-level interface primitives.
- `data/` contains local challenge metadata and prototype fixtures.
- `lib/` contains cross-cutting browser integrations such as auth and API communication.

Prefer keeping route files thin: compose page-level components there and put reusable behavior in the relevant component or library module.

---

## 4. Routes and screens

| Route | Purpose | Current implementation notes |
|---|---|---|
| `/` | Public marketing landing page | Navbar, hero, workspace preview, how-it-works, challenge catalogue, AI modes, CTA, footer |
| `/app` | Candidate dashboard | Summary metrics and interview history preview include demo/placeholder content |
| `/app/challenges` | Challenge library | Reads `OFFICIAL_CHALLENGES` from local frontend data and renders the interactive library |
| `/app/workspace/[sessionId]` | Coding workspace | Accepts the explicit `ci-001-demo` session and `ci-001-*` session IDs |
| `/app/history` | Candidate submission history | Fetches submissions from the backend when a Supabase access token is present |
| `/app/results/[submissionId]` | Assessment report | Displays a submission report returned by the backend |
| `/app/settings` | Candidate preferences | Current profile/settings content includes demo placeholders; do not assume provider-key management is live |

The application layout wraps candidate pages in the shared `AppShell`. The root layout wraps the app in `AuthProvider` and sets global metadata/styles.

### Landing page

`src/app/page.tsx` composes the marketing sections in order. Edit the corresponding component under `src/components/marketing/` rather than adding the full landing-page markup to the route.

### Dashboard

`src/app/app/page.tsx` composes the welcome panel, dashboard metrics, available challenges, continue-practicing state, and recent activity. Some displayed values are intentionally preview/demo data. Do not present those values as live analytics without replacing the fixtures with backend data.

### Challenge catalogue

Challenge definitions live in `src/data/challenges.ts`. The route passes them to `ChallengeLibrary`, which owns catalogue interactions such as searching, filtering, cards, and briefing UI. The catalogue is currently frontend-defined; backend challenge provisioning is not yet generalized across all listed challenge IDs.

### Workspace

The route validates the session ID shape and renders `WorkspaceLayout`. The workspace feature is the most integration-heavy frontend area. It coordinates:
- File explorer and active file selection.
- Monaco editor tabs and content.
- Workspace file synchronization with FastAPI.
- Agent chat / execution timeline.
- Test-run output and results.
- Submit/reset and submitted/read-only state.

For the complete behavior, inspect `src/components/application/workspace/` and the backend route contract in `backend/app/api/v1/routes/agent_workspace.py`.

### History and results

The history page reads the current Supabase session and calls the backend submissions endpoint with the access token. The result page uses the submission identifier to retrieve/report the corresponding submission. Backend ownership checks remain authoritative.

---

## 5. Local development setup

### Prerequisites

- Node.js 24.x recommended (or a compatible supported Node release).
- npm 11.x recommended.
- Git.
- A Supabase project for real sign-up/sign-in.
- The Codevo FastAPI backend for workspace, agent, test, and submission integrations.
- A configured Groq API key on the backend for AI-agent requests.

### Clone and install

From the repository root:

```bash
git clone https://github.com/prudhvikakkunuri/Codevo.git
cd Codevo/frontend
npm install
```

### Configure environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The Supabase client also recognizes `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as an alternative to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The code currently has a default Supabase project URL in `src/lib/supabase.ts`; explicitly set the URL for the environment you intend to use. The public key must belong to the same Supabase project.

**Security:** Variables prefixed with `NEXT_PUBLIC_` are included in browser-visible code. Only use the Supabase publishable/anon key and public API URL here. Never put a Supabase service-role key, Groq API key, database password, private signing key, or other server secret in this file.

### Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The project uses the webpack dev/build commands defined in `package.json`.

### Available scripts

```bash
npm run dev       # Next.js development server (webpack)
npm run lint      # ESLint
npm run build     # Production build (webpack)
npm run start     # Start the built production app
```

Before a pull request, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

---

## 6. Authentication flow

Authentication state is centralized in `src/lib/auth-context.tsx`.

### AuthProvider responsibilities

The root layout mounts `AuthProvider`, which:
1. Creates/gets the singleton Supabase browser client.
2. Restores an existing session using `supabase.auth.getSession()`.
3. Subscribes to `onAuthStateChange` to react to sign-in, sign-out, refresh, and cross-tab changes.
4. Maps the Supabase user into the frontend `CandidateUser` shape.
5. Exposes auth state and actions through `useAuth()`.

The context exposes:
- `user`, `session`, and `token`.
- `isLoading`, `isAuthenticated`, and `isConfigured`.
- `login(email, password)`.
- `signup(fullName, email, password)`.
- `logout()`.
- `verifyBackendToken()`.

Use `useAuth()` in client components that need the active candidate or Supabase session. Do not duplicate Supabase session listeners in individual screens.

### Supabase client

`src/lib/supabase.ts` exports:
- `getSupabaseClient()`: lazily creates and reuses the browser client.
- `isSupabaseConfigured()`: checks whether usable public credentials are configured.
- `getBackendUrl(path?)`: builds the API URL from `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000`.
- `BACKEND_API_URL`: resolved backend base URL.
- `fetchWithAuth<T>()`: sends a request with the current session's bearer token and normalizes success/error responses.

Example:

```ts
const result = await fetchWithAuth<MyResponse>(
  "/api/v1/auth/me",
  session
);

if (result.error) {
  // Show a safe, user-readable error.
} else {
  // Use result.data.
}
```

The helper returns `{ data?, status, error? }`; network failures use status `0`. It does not replace backend authorization.

### Current security boundary

The current browser client uses Supabase's standard browser session persistence and sends the access token as a Bearer token to FastAPI. This is the current prototype integration, **not** the planned BFF model with HttpOnly opaque cookies, server-side token storage, and CSRF protection. Do not claim that the BFF architecture is already implemented.

---

## 7. Backend integration contract

The frontend API base URL is resolved by `getBackendUrl()` from `NEXT_PUBLIC_API_URL` (local default `http://localhost:8000`).

The key backend routes used by the workspace and candidate experience include:

| Method | Endpoint | Frontend use |
|---|---|---|
| GET | `/api/v1/auth/me` | Verify the Supabase token / current backend identity |
| POST | `/api/v1/workspace/{sessionId}/init` | Initialize starter workspace |
| GET | `/api/v1/workspace/{sessionId}/files` | Load file contents and revisions |
| PUT | `/api/v1/workspace/{sessionId}/files` | Save editor changes |
| POST | `/api/v1/workspace/{sessionId}/reset` | Restore starter workspace |
| POST | `/api/v1/workspace/{sessionId}/submit` | Finalize and lock a workspace |
| POST | `/api/v1/runner/{sessionId}/run` | Run trusted tests |
| POST | `/api/v1/agent/{sessionId}/chat` | Chat-only assistant mode |
| POST | `/api/v1/agent/{sessionId}/run` | Agent mode with workspace tools |
| GET | `/api/v1/agent/{sessionId}/stream?prompt=...` | Server-Sent Events agent timeline |
| GET | `/api/v1/submissions` | List current candidate's submissions |
| GET | `/api/v1/submissions/{submissionId}` | Fetch one candidate-owned report |

Protected requests must include:

```http
Authorization: Bearer <supabase_access_token>
```

The backend validates the token cryptographically. A frontend route being visible or a button being disabled is not an authorization boundary.

### Workspace synchronization and revisions

Workspace file responses include document content and a revision number. File updates can send `base_revision` to support optimistic concurrency. If another operation has changed the file, the backend may return HTTP 409 with revision-conflict details. The UI should handle this as a synchronization conflict rather than silently overwriting newer content.

After submission, the backend locks the session. The UI should reflect the submitted state, but the backend remains authoritative and rejects subsequent edits/agent execution.

### Agent modes

- **Chat:** conversational help without workspace modification tools.
- **Run:** an agent turn that can inspect/edit the workspace and invoke the trusted test runner.
- **Stream:** Server-Sent Events for displaying the agent's live execution timeline.

Keep the UI honest about which mode is active and distinguish model commentary from actual tool execution/test results.

---

## 8. Challenge and workspace data

### Challenge catalogue data

`src/data/challenges.ts` contains the current five challenge definitions:

| ID | Challenge | Category |
|---|---|---|
| CI-001 | Debug a Broken FastAPI Authentication API | Backend Engineering |
| CI-002 | Fix a Broken RAG Pipeline | AI & Machine Learning |
| CI-003 | Fix React and FastAPI Integration | Frontend Engineering |
| CI-004 | Debug a Broken ETL Pipeline | Data Engineering |
| CI-005 | Fix an ML Prediction API | AI & Machine Learning |

These are frontend catalogue entries. CI-001 is the challenge with the demonstrated backend starter workspace and trusted test suite. Do not assume CI-002 through CI-005 have equivalent backend execution implementations.

### Workspace data

`src/data/workspace.ts` contains workspace-related constants and prototype metadata, including the explicit demo session ID `ci-001-demo`. The route also permits IDs beginning with `ci-001-` for user-scoped sessions.

---

## 9. UI and styling conventions

- Global styles and Tailwind setup live under `src/app/globals.css`.
- The root layout sets the application to a dark-first visual baseline.
- Reusable low-level components belong in `src/components/ui/`.
- Product-specific components belong in `src/components/application/`.
- Public marketing sections belong in `src/components/marketing/`.
- Use the existing design tokens and component variants rather than introducing one-off styling systems.
- Keep route-level files focused on composition and data loading.
- Preserve responsive behavior and accessible labels/keyboard interaction when modifying controls.

When changing the workspace, test the layout at both desktop and narrower viewport widths; editor panes, file explorer, assistant, and terminal panels have competing space requirements.

---

## 10. Troubleshooting

### App starts, but Supabase authentication fails

- Check that `NEXT_PUBLIC_SUPABASE_URL` and the public key refer to the same Supabase project.
- Confirm the key is a publishable/anon key, not a service-role key.
- Restart Next.js after editing `.env.local`.
- Check Supabase Auth provider settings and email-confirmation behavior.

### Frontend requests fail to reach FastAPI

- Confirm the backend is running on port 8000.
- Set `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- Ensure backend `ALLOWED_ORIGINS` includes `http://localhost:3000`.
- Inspect browser Network tools and backend logs.
- Do not copy access tokens or secrets into bug reports.

### Backend returns 401

- Confirm the browser has a current Supabase session.
- Confirm the token belongs to the same Supabase project configured in the backend.
- Check token expiry and backend JWKS availability.
- The frontend cannot repair an invalid signature or issuer/audience mismatch.

### Agent panel reports provider unavailable

- Configure `GROQ_API_KEY` on the backend, not the frontend.
- Check the configured Groq model and backend logs.
- Confirm the workspace session has been initialized.

### Workspace file update returns 409

Another write changed the file revision after the editor loaded it. Refresh/reload the authoritative document or implement an explicit conflict-resolution experience. Avoid retrying the same stale revision blindly.

### Workspace test execution is unavailable

The backend runner requires its Docker isolation boundary by default. Ensure Docker is installed, running, and able to access the configured runner image. The secure default is to refuse execution when Docker is unavailable rather than silently run untrusted code on the host.

---

## 11. Recommended development workflow

1. Read this guide and the root repository README.
2. Identify the relevant route, component, data module, or library.
3. Check whether the behavior is live, demo-driven, or planned.
4. Keep browser presentation separate from server-side authority.
5. Use the shared auth context and backend URL/fetch helpers.
6. Handle loading, empty, error, and submitted/locked states.
7. Add or update tests when behavior changes; do not rely on a successful visual render alone.
8. Run lint, TypeScript checking, and production build.
9. Update this document when routes, environment variables, API contracts, or implementation status change.

### Common change map

| Change | Start here |
|---|---|
| Landing page content | `src/app/page.tsx`, `src/components/marketing/` |
| Dashboard | `src/app/app/page.tsx`, `src/components/application/dashboard/` |
| Challenge metadata | `src/data/challenges.ts` |
| Challenge interactions | `src/components/application/challenges/` |
| Workspace UI | `src/components/application/workspace/` |
| Workspace route validation | `src/app/app/workspace/[sessionId]/page.tsx` |
| Auth state/actions | `src/lib/auth-context.tsx` |
| Supabase and API helpers | `src/lib/supabase.ts` |
| History page | `src/app/app/history/page.tsx` |
| Settings UI | `src/app/app/settings/page.tsx` |
| Shared primitives | `src/components/ui/` |

---

## 12. Known limitations and next steps

The following should be treated as future engineering work unless the codebase has since changed:

- Implement the Next.js BFF session-cookie architecture and CSRF protections.
- Replace demo dashboard metrics and placeholder profile/settings data with authoritative backend data.
- Move challenge catalogue definitions and challenge lifecycle to backend-managed data when the platform needs dynamic challenge administration.
- Complete and verify end-to-end flows for all challenge IDs, not only CI-001.
- Expand frontend automated component and browser-level tests.
- Add robust reconnection/recovery behavior for streaming agent events.
- Improve workspace revision-conflict UX and offline/error recovery.
- Replace any illustrative assessment content with backend-generated, submission-specific evidence.

---

## 13. Further reading

- Root `README.md` — full product overview and repository-wide KT.
- `backend/README.md` — API service, authentication, agent, runner, and submission internals.
- `.agents/ARCHITECTURE.md` — intended system architecture.
- `.agents/MEMORY.md` — verified project progress and current implementation notes.
- `.agents/DECISIONS.md` — accepted architecture decisions.
- [Next.js App Router documentation](https://nextjs.org/docs/app)
- [Supabase JavaScript documentation](https://supabase.com/docs/reference/javascript)

---

**Codevo Frontend — the candidate-facing experience for Build. Debug. Prove.**
