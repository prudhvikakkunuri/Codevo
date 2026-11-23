# Codevo

**Build. Debug. Prove.** — an AI-assisted practical engineering interview platform where developers solve realistic, time-boxed engineering challenges in a browser-based coding workspace.

> **Project status (2026-11-23):** Codevo is an actively developed strategic prototype. The repository contains a Next.js frontend, a FastAPI backend, a working Groq-powered coding-agent / workspace / isolated-test-runner demonstration, and a Supabase JWT verification foundation. Some screens and assessment flows are still demo-driven; the complete production platform described in the architecture notes is not yet implemented. This README distinguishes verified functionality from planned architecture.

- **Repository:** [prudhvikakkunuri/Codevo](https://github.com/prudhvikakkunuri/Codevo)
- **Default branch:** `main`
- **Product category:** Practical engineering assessment / AI-assisted coding interview
- **Primary languages:** TypeScript and Python

---

## 1. What is Codevo?

Codevo is designed to make technical interviews more practical and evidence-based. Instead of relying only on quizzes or conversations, candidates work inside a realistic multi-file codebase, diagnose defects, implement changes, run tests, and submit a final solution.

The product combines:

1. **Challenge library** — engineering tasks across backend, frontend, AI/ML, and data engineering.
2. **Browser IDE** — a Monaco-based editor with a file explorer, tabs, terminal, and test-results area.
3. **AI coding assistant** — an agent that can inspect a challenge workspace, explain its findings, edit authorized files, and run tests.
4. **Execution and verification** — a backend-controlled test runner for challenge workspaces.
5. **Submission and assessment experience** — a final submission state, report UI, and interview history. Some report data and test scenarios are currently illustrative/demo fixtures, not a live production evaluator.
6. **Identity foundation** — Supabase Auth on the frontend and asymmetric Supabase JWT/JWKS verification in FastAPI.

### Intended candidate journey

```text
Discover Codevo
     |
     v
Browse engineering challenges
     |
     v
Open a challenge briefing
     |
     v
Start a timed coding workspace
     |
     +------> Inspect files and requirements
     |
     +------> Ask the AI assistant for help
     |             |
     |             v
     |       Agent reads / edits files
     |
     +------> Run tests in the workspace
     |
     v
Review changes and submit
     |
     v
View results / assessment report / history
```

The diagram describes the intended product flow. Not every step is fully connected to production-grade backend services yet.

---

## 2. Product capabilities and current implementation status

| Area | What it does | Current status |
|---|---|---|
| Marketing landing page | Introduces Codevo, its workflow, workspace preview, challenge catalogue, and AI modes | Implemented |
| Challenge library | Lists and describes engineering challenges with category and difficulty metadata | Implemented as frontend data |
| Coding workspace UI | IDE-style layout with Monaco editor, file tree, terminal, assistant, and test panels | Implemented |
| CI-001 workspace | Demonstration FastAPI authentication codebase with intentional defects | Implemented |
| AI coding agent | Groq-backed agent loop with file-reading, patching, and test-running tools | Implemented and demonstrated |
| Workspace API | Initializes session files, returns files, and accepts editor changes | Implemented for prototype |
| Test execution | Runs pytest for the challenge workspace using an isolated Docker runner where available | Implemented for prototype; fallback exists for local environments without Docker |
| Supabase identity | Frontend Supabase Auth integration and FastAPI JWT/JWKS verification | Foundation implemented |
| Health endpoints | Liveness and readiness probes | Implemented |
| Submission locking and report UI | Demonstration submission state, read-only workspace state, scorecard/report presentation | UI and client-side demo behavior implemented; not a complete production evaluator |
| Persistent production database | PostgreSQL schema, migrations, full data persistence, and RLS | Planned / not complete |
| Next.js BFF session architecture | HttpOnly opaque session cookies, server-side token storage, CSRF defense, and BFF forwarding | Planned |
| Candidate BYOK credential vault | Secure provider credential management and envelope encryption | Planned |
| Production multi-tenant code execution | Strong tenant isolation beyond a local prototype runner | Not enabled; requires further security engineering and verification |

**Important:** A UI element, design document, or proposed architecture is not proof that the corresponding production service exists. Treat the implementation status above as the source of truth when evaluating readiness.

---

## 3. Technology stack

### Frontend

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | Web application and routing |
| React 19 | UI component model |
| TypeScript 5 | Type-safe frontend development |
| Tailwind CSS 4 | Styling and design tokens |
| shadcn/ui and Base UI | Reusable interface components |
| Monaco Editor | In-browser code editor |
| xterm.js | Terminal emulator UI |
| Supabase JS | Frontend authentication integration |
| Lucide React | Icons |
| ESLint | Linting |

The frontend is located in `frontend/`. Its npm scripts are defined in `frontend/package.json`.

### Backend

| Technology | Purpose |
|---|---|
| Python 3.12+ | Backend language/runtime |
| FastAPI | HTTP API framework |
| Pydantic v2 / pydantic-settings | Request models and configuration |
| Uvicorn | ASGI development server |
| PyJWT with cryptography | JWT signature and claims verification |
| httpx | Async HTTP client / JWKS retrieval |
| Argon2-CFFI | Password-hashing dependency |
| pytest / pytest-asyncio | Automated tests |
| Docker | Isolated challenge test execution in the prototype |
| Groq API | Live LLM provider for the coding-agent demonstration |

The backend is located in `backend/`. Its dependency declarations are in `backend/requirements.txt` and `backend/pyproject.toml`.

### External services

- **Supabase Auth:** user sign-up/sign-in and JWT issuer.
- **Supabase JWKS:** public signing keys used by FastAPI to verify asymmetric access tokens.
- **Groq:** model inference for the working agent demonstration. The configured default model is `openai/gpt-oss-120b`; the project memory also records `openai/gpt-oss-20b` as a supported demo model.

A configured service is not necessarily provisioned for every developer. You must supply your own local environment values.

---

## 4. Repository layout

The following is a conceptual map of the important repository areas (not an exhaustive listing of every component).

```text
Codevo/
├── .agents/
│   ├── ARCHITECTURE.md       # Intended system architecture and boundaries
│   ├── DECISIONS.md          # Accepted decisions and their rationale
│   ├── MEMORY.md             # Verified project progress and implementation notes
│   └── rules/
│       └── security.md       # Security engineering requirements and status rules
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js routes and layouts
│   │   │   ├── page.tsx      # Public landing page
│   │   │   └── app/          # Application/dashboard routes
│   │   ├── components/
│   │   │   ├── application/  # Dashboard, challenge, workspace, report UI
│   │   │   ├── marketing/    # Public landing-page sections
│   │   │   └── ui/           # Reusable UI primitives
│   │   ├── data/             # Challenge, workspace, assessment and demo data
│   │   └── lib/              # Auth context, Supabase and shared utilities
│   ├── public/               # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app factory and lifespan
│   │   ├── api/v1/
│   │   │   ├── router.py     # Versioned API router
│   │   │   └── routes/       # Health, auth, agent/workspace routes
│   │   └── core/
│   │       ├── auth/         # JWT verifier, JWKS provider, auth models
│   │       ├── agent/        # Coding-agent orchestration and tools
│   │       ├── runner/       # Isolated test runner
│   │       ├── config.py     # Typed environment settings
│   │       ├── errors.py     # Sanitized error handling
│   │       └── logging.py    # Structured safe logging
│   ├── tests/                # Backend automated tests
│   ├── workspace_storage/    # Local prototype workspace data (runtime)
│   ├── .env.example
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── README.md
│
└── README.md                 # This project / knowledge-transfer guide
```

For exact implementation details, inspect the source files and the project notes under `.agents/`. In particular, `.agents/MEMORY.md` is the progress record, while `.agents/ARCHITECTURE.md` describes the intended target architecture and must not be read as a list of already deployed features.

---

## 5. Local development setup

### Prerequisites

Install the following before starting:

- Git
- Node.js compatible with the frontend project (the project was developed with Node.js 24.x and npm 11.x)
- Python 3.12+
- Docker Desktop / Docker Engine for the isolated runner path
- A Supabase project for real authentication testing
- A Groq API key for live AI-agent requests

You can work on the frontend without configuring the backend. Authentication, live AI requests, and backend execution require their respective services and environment variables.

### 5.1 Clone the repository

```bash
git clone https://github.com/prudhvikakkunuri/Codevo.git
cd Codevo
```

### 5.2 Start the frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` and configure the public Supabase project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_BACKEND_API_URL=http://127.0.0.1:8000
```

Use the exact variable names expected by `frontend/src/lib/supabase.ts`. Never put a Supabase service-role key, Groq key, database password, or other server secret in a `NEXT_PUBLIC_*` variable.

Start the frontend:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other available frontend scripts:

```bash
npm run lint
npm run build
npm run start
```

### 5.3 Start the backend

Open a second terminal from the repository root:

```bash
cd backend
py -3.12 -m venv .venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create the local environment file:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
ENVIRONMENT=development
DEBUG=true
HOST=127.0.0.1
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000

# Local-only placeholder. Replace with a strong random value when needed.
INTERNAL_SERVICE_KEY=dev-internal-service-key-change-in-production

SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_JWKS_CACHE_TTL_SECONDS=600
SUPABASE_JWKS_TIMEOUT_SECONDS=5.0

GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-120b
```

Only configure secrets for services you are actually using. Do not commit `.env`, `.env.local`, real API keys, access tokens, or private credentials.

Start the API:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend should be reachable at [http://127.0.0.1:8000](http://127.0.0.1:8000).

In development, interactive API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 5.4 Verify backend health

```bash
curl http://127.0.0.1:8000/api/v1/health/live
curl http://127.0.0.1:8000/api/v1/health/ready
```

- `/live` confirms that the API process is responding.
- `/ready` reports readiness of the components currently implemented. It does not claim that unimplemented databases or external infrastructure are healthy.

### 5.5 Verify Supabase token authentication

After configuring Supabase and signing in through the frontend, obtain a valid Supabase access token and call:

```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  http://127.0.0.1:8000/api/v1/auth/me
```

The endpoint returns the verified candidate ID and role. It does not return the raw token.

---

## 6. Backend API overview

The API is versioned under `/api/v1`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend service identity probe |
| GET | `/api/v1/health/live` | Liveness probe |
| GET | `/api/v1/health/ready` | Readiness probe |
| GET | `/api/v1/auth/me` | Return identity from a verified Supabase access token |
| POST | `/api/v1/workspace/{session_id}/init` | Initialize the challenge workspace |
| GET | `/api/v1/workspace/{session_id}/files` | Retrieve workspace files and revisions |
| PUT | `/api/v1/workspace/{session_id}/files` | Synchronize candidate editor changes |
| POST | `/api/v1/runner/{session_id}/run` | Execute the workspace test suite |
| POST | `/api/v1/agent/{session_id}/run` | Run the coding agent and stream timeline events |

The workspace, runner, and agent routes are prototype capabilities. Their request/response contracts and authorization requirements should be checked in `backend/app/api/v1/routes/agent_workspace.py` before building an integration against them.

### Health versus readiness

Liveness and readiness intentionally have different meanings:

- **Liveness:** the Python process is alive and can answer an HTTP request.
- **Readiness:** implemented startup/configuration components are ready to receive requests.
- Neither probe should be interpreted as proof that a future database, KMS, production runner cluster, or other planned dependency has been provisioned.

---

## 7. How the AI coding-agent prototype works

The working prototype connects a Groq model to a constrained set of backend tools.

### Agent turn lifecycle

1. The frontend asks the backend to start an agent turn for a workspace session.
2. The backend loads the session workspace and constructs the agent context.
3. The model can request an allowed tool, such as reading a file, applying a patch, or running tests.
4. The backend validates and executes the tool call against the session workspace.
5. Tool results are added to the conversation and the model continues.
6. Timeline events are streamed to the frontend so the user can follow the agent's activity.
7. The agent reports its result, including relevant changes and test outcomes.

### Important backend modules

| Module | Responsibility |
|---|---|
| `backend/app/core/ai/groq_adapter.py` | Groq API integration, model response parsing, streaming, timeouts, retry/backoff, and error sanitization |
| `backend/app/core/agent/orchestrator.py` | Turn-based tool orchestration and event dispatch |
| `backend/app/core/agent/workspace_manager.py` | Workspace file access, safe path resolution, edits, and revision tracking |
| `backend/app/core/runner/isolated_runner.py` | Executes pytest against a workspace using the prototype isolation boundary |
| `backend/app/api/v1/routes/agent_workspace.py` | HTTP entry points for workspace, agent, and runner operations |

### Demonstrated challenge: CI-001

The first end-to-end demonstration uses **CI-001 — Debug a Broken FastAPI Authentication API**.

The starter code intentionally contains defects involving:

- Password hashing and verification.
- Duplicate user registration handling.
- Error-response sanitization.

The project progress record documents an end-to-end run in which the agent identified and fixed the three defects and the trusted test suite changed from **0/6 passing to 6/6 passing**. This is a recorded prototype demonstration, not a claim that every challenge has a production evaluator.

---

## 8. Challenge catalogue

The current frontend challenge data defines five challenge entries:

| ID | Challenge | Area | Difficulty | Duration |
|---|---|---|---|---:|
| CI-001 | Debug a Broken FastAPI Authentication API | Backend Engineering | Medium | 40 min |
| CI-002 | Fix a Broken RAG Pipeline | AI & Machine Learning | Hard | 50 min |
| CI-003 | Fix React and FastAPI Integration | Frontend Engineering | Medium | 45 min |
| CI-004 | Debug a Broken ETL Pipeline | Data Engineering | Medium | 45 min |
| CI-005 | Fix an ML Prediction API | AI & Machine Learning | Hard | 50 min |

Challenge definitions currently live in `frontend/src/data/challenges.ts`. The challenge catalogue is frontend data at this stage; do not assume the full catalogue is being dynamically served from a production database.

---

## 9. Authentication and security model

Security is a core design constraint, especially because Codevo handles source code, user identities, AI-provider credentials (planned), and execution of candidate-written code.

### Implemented foundation

- FastAPI settings are centralized and validated with Pydantic Settings.
- Sensitive configuration values use secret-aware types and safe logging practices.
- Production configuration rejects debug mode, wildcard CORS, weak/missing internal service keys, and missing/non-HTTPS Supabase configuration.
- Supabase JWTs are verified using public keys from the configured Supabase JWKS endpoint.
- Only asymmetric `ES256` and `RS256` algorithms are accepted by the verifier; symmetric `HS256` is intentionally not accepted.
- JWT issuer, audience, expiry/time claims, subject UUID, and role are validated.
- JWKS responses are cached; key rotation and unavailable-provider failure paths are handled.
- Workspace path resolution is designed to prevent directory traversal and access to sensitive files.
- The prototype Docker runner uses resource limits, a non-root user, read-only trusted-test mounts, and disabled network access where the Docker path is available.

### Planned security architecture

The following items are documented as target requirements, not completed production controls:

- Next.js Backend-for-Frontend (BFF) with opaque HttpOnly session cookies.
- PostgreSQL-backed session storage, hashed opaque session IDs, and encrypted Supabase tokens.
- CSRF synchronizer tokens and strict Origin/Referer checks.
- Separate database roles and PostgreSQL Row-Level Security policies.
- BYOK credential storage using AES-256-GCM envelope encryption and an external KMS.
- Strong production sandbox isolation suitable for untrusted, multi-tenant code execution.
- Production CSP nonce implementation and browser-level security verification.

### Security invariants for contributors

1. Never trust a user ID, role, or ownership claim supplied by the browser.
2. Enforce authentication and resource ownership on the server for protected operations.
3. Never log passwords, bearer tokens, API keys, refresh tokens, or raw sensitive provider responses.
4. Never expose server secrets through frontend environment variables or client bundles.
5. Treat prompts, model output, challenge files, and candidate code as untrusted input.
6. Never execute candidate code directly inside the FastAPI application process.
7. Keep trusted evaluator tests and reference solutions separate from candidate-writable workspace files.
8. Do not describe a planned security control as implemented or verified without code and test evidence.

See `.agents/rules/security.md` and `.agents/ARCHITECTURE.md` for the broader security requirements and threat model.

---

## 10. Testing and quality checks

### Backend tests

From `backend/`, activate the virtual environment and run:

```bash
pytest -v
```

The backend README and project progress record report **60 offline tests** for the current backend foundation, covering areas such as:

- Authentication endpoint behavior.
- JWT signature and claim validation.
- JWKS caching, rotation, and failure behavior.
- Configuration validation and production safeguards.
- Health probes and CORS behavior.

The tests are designed to run without calling a live Supabase service by using generated test keys and controlled fixtures.

### Frontend checks

From `frontend/`:

```bash
npm run lint
npx tsc -p tsconfig.json --noEmit
npm run build
```

Run these checks after UI, routing, TypeScript, or configuration changes.

### Runner verification

The CI-001 demonstration uses the trusted challenge test suite. The recorded demonstration result is 0/6 passing before the agent fixes the starter defects and 6/6 passing after the fixes.

Do not edit trusted evaluator tests merely to make a candidate solution pass. The candidate workspace and trusted verification scope must remain separate.

---

## 11. Development workflow and contribution guidance

1. Start from the latest `main` branch.
2. Read this README and the relevant notes under `.agents/` before changing architecture-sensitive code.
3. Identify whether a behavior is implemented, demo-only, planned, or a security requirement.
4. Keep frontend UI, backend business logic, and execution boundaries separated.
5. Add or update automated tests for backend behavior and security-sensitive changes.
6. Run the relevant lint, type-check, build, and pytest checks.
7. Update documentation when API contracts, environment variables, setup steps, or implementation status changes.

### Where to make common changes

| Task | Start here |
|---|---|
| Marketing landing page | `frontend/src/app/page.tsx`, `frontend/src/components/marketing/` |
| Dashboard / application routes | `frontend/src/app/app/` |
| Challenge metadata | `frontend/src/data/challenges.ts` |
| Workspace UI | `frontend/src/components/application/workspace/` |
| Frontend auth state | `frontend/src/lib/auth-context.tsx` |
| Frontend backend/Supabase client | `frontend/src/lib/supabase.ts` |
| FastAPI startup and middleware | `backend/app/main.py` |
| API route registration | `backend/app/api/v1/router.py` |
| Backend settings | `backend/app/core/config.py` |
| Supabase JWT verification | `backend/app/core/auth/` |
| Agent orchestration | `backend/app/core/agent/` |
| Workspace file operations | `backend/app/core/agent/workspace_manager.py` |
| Test execution | `backend/app/core/runner/isolated_runner.py` |
| Backend tests | `backend/tests/` |

---

## 12. Roadmap and next engineering milestones

The project notes identify the following broad workstreams. Their ordering and exact acceptance criteria should be confirmed against the latest `.agents/MEMORY.md` and `.agents/DECISIONS.md` before implementation.

- Complete the Next.js BFF session-cookie and CSRF architecture.
- Add persistent PostgreSQL schemas, migrations, database access boundaries, and verified RLS policies.
- Implement backend-only BYOK credential storage and external key-management integration.
- Expand challenge/session persistence and the production submission/evaluation pipeline.
- Strengthen execution isolation before enabling public multi-tenant untrusted code execution.
- Add end-to-end browser tests and security verification for authentication, session handling, CSP, CSRF, workspace locking, and execution boundaries.
- Replace illustrative frontend assessment fixtures with authoritative backend-generated reports when the evaluator is implemented.

### Architecture documents

- `.agents/ARCHITECTURE.md` — intended end-state architecture and data flows.
- `.agents/DECISIONS.md` — decisions, alternatives, and rationale.
- `.agents/MEMORY.md` — verified implementation progress and current development focus.
- `.agents/rules/security.md` — security requirements and verification expectations.

---

## 13. Environment variable reference

### Backend

| Variable | Purpose | Example / default |
|---|---|---|
| `ENVIRONMENT` | Runtime mode | `development` |
| `DEBUG` | Debug behavior; must be false in production | `true` locally |
| `HOST` | Bind address | `127.0.0.1` |
| `PORT` | API port | `8000` |
| `ALLOWED_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:3000` |
| `INTERNAL_SERVICE_KEY` | Internal service authentication secret | Local placeholder in example only |
| `SUPABASE_URL` | Supabase project URL; used to derive issuer and JWKS URL | `https://YOUR_PROJECT_REF.supabase.co` |
| `SUPABASE_JWKS_CACHE_TTL_SECONDS` | Public-key cache TTL | `600` |
| `SUPABASE_JWKS_TIMEOUT_SECONDS` | JWKS request timeout | `5.0` |
| `GROQ_API_KEY` | Groq credential for the live agent integration | Secret; configure locally |
| `GROQ_MODEL` | Groq model identifier | `openai/gpt-oss-120b` |

### Frontend

The frontend Supabase client reads the public Supabase URL and publishable/anonymous key from `frontend/.env.local`. The backend base URL is configurable through the frontend Supabase/client utility. Check `frontend/src/lib/supabase.ts` for the exact variable names and defaults before changing deployment configuration.

**Never commit real values.** The committed `backend/.env.example` is a template, not a place to store credentials.

---

## 14. Common troubleshooting

### Frontend cannot reach the backend

- Confirm FastAPI is running on port 8000.
- Confirm the frontend backend URL points to `http://127.0.0.1:8000`.
- Confirm `ALLOWED_ORIGINS` includes `http://localhost:3000`.
- Inspect the browser network panel and backend logs. Do not paste bearer tokens or secrets into issue reports.

### Supabase authentication fails

- Verify `SUPABASE_URL` and the frontend public Supabase values belong to the same project.
- Confirm the backend can reach `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
- Ensure the access token is a valid authenticated-user token and has not expired.
- Check server logs for sanitized error IDs and configuration errors; never log the token itself.

### JWKS endpoint is unavailable

The verifier fails closed. A key-provider/network failure is an infrastructure availability problem and is surfaced separately from an invalid user token. Check connectivity, project URL, and timeout configuration.

### Agent requests fail

- Confirm `GROQ_API_KEY` is set in the backend environment.
- Confirm the configured model is available to the account.
- Check backend logs for sanitized provider errors and request timeouts.
- Confirm the backend workspace session has been initialized.

### Isolated tests do not run

- Confirm Docker is installed and its daemon is running.
- Confirm the expected runner image is available or can be built by the project workflow.
- Check local Docker permissions and resource availability.
- The prototype has a subprocess fallback in certain local environments; that fallback should not be mistaken for the production isolation boundary.

---

## 15. Product and engineering principles

- **Practical over theoretical:** assess the ability to understand and change real code.
- **Evidence over opinion:** test results and concrete code changes should support evaluation feedback.
- **AI as an assistant:** the agent should help candidates reason and move faster, not silently replace engineering judgment.
- **Security by design:** candidate code, AI output, credentials, and sessions are untrusted until validated by server-side controls.
- **Clear implementation status:** demo behavior, planned architecture, and verified production behavior must never be conflated.
- **Accessible, focused UX:** a calm dark-first workspace should keep attention on code, tests, and feedback.

---

## 16. License and project status

No license grant is stated in this README. Unless a license file is present in the repository, do not assume the project is open source or that its code may be reused under a particular license.

Codevo is under active development. For the latest verified progress, consult the repository history and `.agents/MEMORY.md`.

---

**Codevo — Build. Debug. Prove.**
