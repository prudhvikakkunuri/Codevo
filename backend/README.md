# Codevo Backend API

The Codevo backend is the FastAPI service that coordinates candidate workspace operations, verifies Supabase access tokens, invokes the AI coding agent, executes trusted challenge tests through an isolated runner, and creates/retrieves submission reports.

This document is a backend-focused knowledge-transfer guide for developers who need to run, understand, debug, or extend the service.

> **Implementation status:** The repository contains a working FastAPI API, asymmetric Supabase JWT/JWKS verification, a Groq-backed agent integration, a CI-001 workspace manager, a Docker-first test runner, and a file-backed submission/report prototype. It is not yet the complete production architecture: PostgreSQL persistence, BFF session cookies/CSRF, BYOK credential vault, and hardened multi-tenant execution infrastructure remain future work.

- Repository: [prudhvikakkunuri/Codevo](https://github.com/prudhvikakkunuri/Codevo)
- Service directory: `backend/`
- Python: 3.12+
- Framework: FastAPI
- API prefix: `/api/v1`

---

## 1. Responsibilities and boundaries

The backend is the trusted service boundary between the browser, Supabase identity provider, Groq model API, candidate workspace files, trusted challenge tests, and submission records.

It is responsible for:

1. **HTTP API:** versioned FastAPI routes and request/response validation.
2. **Authentication:** cryptographic validation of Supabase JWTs using public JWKS keys.
3. **Workspace management:** initialize challenge files, read/write files, track revisions, reset, and lock submitted sessions.
4. **AI agent:** send conversation/tool context to Groq and orchestrate allowed workspace tools.
5. **Test execution:** execute the trusted test suite against candidate workspace code using Docker isolation by default.
6. **Submission and reports:** record test runs, snapshot candidate files, evaluate CI-001, and expose candidate-owned submissions.
7. **Operational safety:** typed configuration, CORS, structured logging, sanitized exception responses, and health probes.

The backend is authoritative for protected operations. Frontend state, URL parameters, hidden buttons, and client-provided identity fields must never be treated as proof of authorization.

---

## 2. Technology stack

| Technology | Responsibility |
|---|---|
| Python 3.12+ | Runtime |
| FastAPI | Async HTTP API framework |
| Uvicorn | ASGI server |
| Pydantic v2 | Request, response, and domain model validation |
| pydantic-settings | Environment configuration |
| PyJWT + cryptography | JWT signature and claims verification |
| httpx | Async JWKS and Groq HTTP requests |
| pytest | Automated backend tests |
| pytest-asyncio | Async test support |
| Docker | Isolated challenge test execution |
| Groq OpenAI-compatible API | LLM inference for the coding agent |
| argon2-cffi | Password hashing dependency used by authentication challenge code |

Dependency declarations are in `requirements.txt` and `pyproject.toml`. Keep both aligned when adding/removing dependencies.

---

## 3. Backend folder structure

```text
backend/
├── app/
│   ├── main.py                    # FastAPI app factory, lifespan, middleware
│   ├── api/
│   │   └── v1/
│   │       ├── router.py          # Aggregates versioned route modules
│   │       └── routes/
│   │           ├── health.py      # Liveness and readiness
│   │           ├── auth.py        # Verified candidate identity
│   │           └── agent_workspace.py
│   │                                # Workspace, agent, runner, submissions
│   └── core/
│       ├── auth/
│       │   ├── dependencies.py    # Current-user FastAPI dependency
│       │   ├── exceptions.py     # Auth/JWKS exception types
│       │   ├── jwks.py            # Public-key fetch, validation and cache
│       │   ├── models.py          # Authenticated identity models
│       │   └── verifier.py        # JWT signature and claim validation
│       ├── agent/
│       │   ├── orchestrator.py   # Model/tool turn loop and timeline events
│       │   ├── tools.py          # Tool definitions and dispatcher
│       │   └── workspace_manager.py
│       │                            # Safe workspace file operations/revisions
│       ├── ai/
│       │   ├── groq_adapter.py   # Groq API adapter
│       │   └── models.py         # Provider-neutral chat/tool models
│       ├── runner/
│       │   └── isolated_runner.py# Docker-first pytest execution
│       ├── evaluator/
│       │   ├── engine.py         # CI-001 rubric/evidence evaluation
│       │   ├── models.py         # Report, submission and test-run models
│       │   └── submission_manager.py
│       │                            # File-backed records and snapshots
│       ├── config.py             # Typed environment settings
│       ├── errors.py             # Global exception handlers
│       └── logging.py            # Safe logging setup
├── challenges/
│   └── ci-001/
│       ├── starter/              # Candidate-visible starter project
│       └── trusted_tests/        # Evaluator-owned tests; not candidate editable
├── tests/                        # Backend unit and integration tests
├── workspace_storage/            # Runtime workspaces and file-backed records
├── .env.example
├── pyproject.toml
├── requirements.txt
└── README.md
```

The tree above highlights the primary modules. Refer to the live repository for the complete set of files.

---

## 4. Application startup and request lifecycle

### App factory

`app/main.py` exposes `create_app(settings=None)` and a default ASGI object named `app`.

At startup it:
- Loads validated settings.
- Configures environment-aware logging.
- Creates a shared JWKS provider when a Supabase URL is configured.
- Registers CORS middleware.
- Registers centralized exception handlers.
- Mounts the versioned API router at the configured API prefix.
- Disables interactive OpenAPI docs in production.

At shutdown, the app closes the JWKS provider's owned HTTP client.

Run the service with:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

For container hosting, set `HOST=0.0.0.0` through the deployment environment.

### Request flow

```text
HTTP request
    |
    v
FastAPI app / CORS / exception handlers
    |
    v
/api/v1 router
    |
    +--> health route
    |
    +--> auth dependency --> Supabase JWT verifier --> JWKS cache
    |
    +--> workspace route --> WorkspaceManager
    |
    +--> agent route --> Orchestrator --> Groq provider
    |                              |
    |                              +--> Tool dispatcher
    |                                      |
    |                                      +--> Workspace manager
    |                                      +--> Isolated test runner
    |
    +--> runner route --> Isolated test runner
    |
    +--> submission route --> SubmissionManager --> EvaluatorEngine
```

Not every route currently applies the same authentication dependency. Review the route code before exposing it publicly; see the security notes below.

---

## 5. Local development setup

### Prerequisites

- Python 3.12 or later.
- Git.
- Docker Engine/Desktop for the secure test-runner path.
- Supabase project for real access-token verification.
- Groq API key for agent endpoints.
- PowerShell on Windows or a POSIX-compatible shell on macOS/Linux.

### Create the virtual environment

From the repository root:

```bash
cd backend
py -3.12 -m venv .venv
```

Activate it.

**Windows PowerShell**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Configure environment

Copy the template:

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux**

```bash
cp .env.example .env
```

Configure the values used by `app/core/config.py`:

```env
ENVIRONMENT=development
DEBUG=true
PROJECT_NAME=Codevo Backend API
VERSION=0.1.0
API_V1_PREFIX=/api/v1

HOST=127.0.0.1
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000

# Local development placeholder only. Use a strong random secret where required.
INTERNAL_SERVICE_KEY=dev-internal-service-key-change-in-production

SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_JWKS_CACHE_TTL_SECONDS=600
SUPABASE_JWKS_TIMEOUT_SECONDS=5.0

GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-120b
```

The `INTERNAL_SERVICE_KEY` is a future BFF/service-to-service boundary setting; it does not mean that the BFF is already implemented. Only set secrets in the backend environment. Never commit `.env`.

### Start FastAPI

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- API root: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Interactive docs in development: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- OpenAPI schema in development: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

---

## 6. Configuration reference

Settings are centralized in `app/core/config.py`. Environment variable names are case-sensitive in the current settings configuration.

| Variable | Meaning | Default / notes |
|---|---|---|
| `ENVIRONMENT` | Runtime mode | `development`; allowed: development, test, production |
| `DEBUG` | Debug behavior | `false` by default; production must not enable debug |
| `PROJECT_NAME` | FastAPI service title | `Codevo Backend API` |
| `VERSION` | Service version | `0.1.0` |
| `API_V1_PREFIX` | Versioned route prefix | `/api/v1` |
| `HOST` | Bind address | `127.0.0.1` |
| `PORT` | Bind port | `8000` |
| `ALLOWED_ORIGINS` | Browser origins allowed by CORS | `http://localhost:3000` |
| `INTERNAL_SERVICE_KEY` | Secret intended for internal service authentication | Optional in current prototype |
| `SUPABASE_URL` | Trusted Supabase project URL | Required for live JWT verification |
| `SUPABASE_JWKS_CACHE_TTL_SECONDS` | JWKS cache lifetime | `600` seconds |
| `SUPABASE_JWKS_TIMEOUT_SECONDS` | JWKS HTTP timeout | `5.0` seconds |
| `GROQ_API_KEY` | Groq provider credential | Required for agent routes |
| `GROQ_MODEL` | Primary model identifier | `openai/gpt-oss-120b` |

Production configuration applies additional validation, including secure Supabase URL requirements, disabled debug mode, and stricter CORS/service-secret constraints. Consult the validators in `config.py` rather than relying only on this summary.

---

## 7. API reference

All versioned routes are mounted below `/api/v1`.

### Service and health

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Service identity/heartbeat response |
| GET | `/health/live` | Process liveness |
| GET | `/health/ready` | Readiness of implemented configuration/components |

### Authentication

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/me` | Verify the bearer token and return authenticated user ID/role |

Example:

```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  http://127.0.0.1:8000/api/v1/auth/me
```

### Workspace

| Method | Path | Purpose |
|---|---|---|
| POST | `/workspace/{session_id}/init` | Initialize CI-001 starter workspace; supports `force_reset` query option |
| GET | `/workspace/{session_id}/files` | Read workspace documents, sizes, and revisions |
| PUT | `/workspace/{session_id}/files` | Update one file with optional optimistic `base_revision` |
| POST | `/workspace/{session_id}/reset` | Reset session and restore starter files |
| POST | `/workspace/{session_id}/submit` | Create submission/report and lock workspace |

File update request:

```json
{
  "path": "app/services/authentication.py",
  "content": "file content goes here",
  "base_revision": 1
}
```

A stale `base_revision` produces HTTP 409 with conflict details. Submitted sessions reject further edits.

### Test runner

| Method | Path | Purpose |
|---|---|---|
| POST | `/runner/{session_id}/run` | Execute trusted CI-001 tests against the candidate workspace |

The response includes exit code, pass/fail status, test counts, duration, runner type, test cases, stdout, and stderr.

### AI agent

| Method | Path | Purpose |
|---|---|---|
| POST | `/agent/{session_id}/chat` | Chat-only agent interaction; no workspace modification tools |
| POST | `/agent/{session_id}/run` | Tool-enabled agent execution |
| GET | `/agent/{session_id}/stream?prompt=...` | Server-Sent Events for agent execution timeline |

POST body for chat/run:

```json
{
  "prompt": "Inspect the authentication flow, identify the defects, and fix them."
}
```

Agent endpoints require a configured Groq provider. The orchestrator is configured with a maximum of 10 turns and up to 3 correction iterations in the current route dependency.

### Submissions

| Method | Path | Purpose |
|---|---|---|
| GET | `/submissions` | List submissions belonging to the authenticated candidate |
| GET | `/submissions/{submission_id}` | Retrieve a candidate-owned assessment report |

The submission read endpoints require a verified authenticated user and enforce ownership checks.

---

## 8. Supabase JWT and JWKS verification

Authentication code lives under `app/core/auth/`.

### Trust model

The browser obtains an access token from Supabase Auth and sends it to FastAPI as:

```http
Authorization: Bearer <access_token>
```

FastAPI does not trust decoded JWT claims on their own. It verifies the signature against the public keys published by the configured Supabase project.

The server derives the following values from `SUPABASE_URL`:

- Issuer: `{SUPABASE_URL}/auth/v1`
- JWKS: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- Expected audience: `authenticated`

### Verification sequence

1. Parse the JWT structure and untrusted header only to discover `alg` and `kid`.
2. Enforce the supported algorithm allowlist: `ES256` and `RS256`.
3. Require a non-empty key ID.
4. Retrieve the matching public key from the JWKS provider.
5. Verify that the key's declared algorithm agrees with the token header.
6. Cryptographically verify the signature and standard claims.
7. Validate issuer, audience, expiry, issued-at/not-before constraints, and subject identity.
8. Return a typed `AuthenticatedUser` to the route dependency.

### JWKS cache behavior

`JWKSProvider`:
- Fetches and validates public JWKs.
- Caches keys for the configured TTL (default 600 seconds).
- Synchronizes refreshes to avoid concurrent cache stampedes.
- Handles unknown key IDs with a controlled refresh/cooldown.
- Rejects malformed or unsuitable keys and private key material.
- Distinguishes an unknown signing key from a JWKS provider/network failure.

The verifier fails closed. An unavailable key provider is an infrastructure failure, not evidence that the user's password/token is wrong. The auth exception mapping distinguishes invalid credentials (401) from upstream JWKS availability failures (503).

### Why HS256 is not accepted

The backend intentionally accepts asymmetric signing algorithms only. It verifies using public keys and does not need the Supabase JWT private signing secret. This reduces the blast radius of a compromised backend service.

---

## 9. Workspace manager and revision model

The workspace manager is responsible for the candidate's file tree and session state.

Key behaviors:
- Creates a session directory below the configured local workspace storage.
- Copies the CI-001 starter files into a new workspace.
- Lists and reads files using paths relative to the workspace root.
- Resolves paths and rejects traversal outside the workspace boundary.
- Tracks per-file revisions.
- Applies edits and returns updated revision information.
- Detects stale writes through optimistic concurrency checks.
- Tracks submitted state and blocks writes after finalization.
- Resets a session to the challenge starter state when requested.

The demo session ID is `ci-001-demo`. User-scoped sessions use the `ci-001-<user-id>` naming convention in the current frontend/backend flow.

### Concurrency

A client should send the revision it last read as `base_revision`. If the current server revision differs, the backend returns a conflict rather than silently accepting an overwrite. The client should reload or explicitly reconcile the latest file content.

### Persistence limitation

Workspace files and revision/session metadata are currently stored locally by the prototype manager. This is not a horizontally scalable shared workspace store. PostgreSQL-backed session/workspace persistence remains future architecture work.

---

## 10. AI coding agent

The agent implementation is divided into three layers.

### Provider adapter

`app/core/ai/groq_adapter.py` implements the provider-specific HTTP integration with Groq's OpenAI-compatible chat-completions endpoint. It:
- Sends chat messages and optional function/tool definitions.
- Parses assistant messages and tool calls into provider-neutral models.
- Applies request timeouts.
- Handles provider authentication, rate limiting, and API errors.
- Uses the configured primary model and a fallback model for the model-not-found path.

The default model is `openai/gpt-oss-120b`; the current route configures `openai/gpt-oss-20b` as fallback. Keep API keys on the backend only.

### Orchestrator

`app/core/agent/orchestrator.py` manages the agent turn loop:
1. Builds the system and workspace context.
2. Sends conversation context and available tool definitions to the provider.
3. Detects tool calls in model responses.
4. Dispatches allowed tools.
5. Appends tool results to the conversation.
6. Continues until a final answer or turn/iteration limit.
7. Emits typed timeline events for messages, tool activity, file edits, and test results.

### Tool dispatcher

The current tool catalogue includes operations such as:

| Tool | Purpose |
|---|---|
| `list_files` | List candidate workspace files |
| `read_file` | Read a workspace file |
| `search_code` | Search for text/symbols in workspace files |
| `patch_file` | Replace an exact snippet and produce a diff |
| `edit_file` | Replace file content and produce a diff |
| `run_tests` | Execute the trusted test suite |

Tools must operate only within the session workspace and through the backend-controlled dispatcher. Never let model-generated arguments directly become arbitrary filesystem paths or shell commands.

### Agent modes

- **Chat mode:** conversation without workspace editing tools.
- **Run mode:** tool-enabled agent loop.
- **Stream mode:** SSE transport for the run timeline.

A model response saying a test passed is not evidence. Only a result returned by the test runner should be represented as an executed test result.

---

## 11. Isolated test runner

`app/core/runner/isolated_runner.py` executes pytest against candidate code and a separate trusted test directory.

### Docker execution

The Docker runner is configured with:
- Network disabled (`--network none`).
- Memory limit (default 512 MB).
- CPU limit (default 1 CPU).
- Non-root user (UID/GID 1000).
- `no-new-privileges`.
- Read-only container root filesystem.
- A bounded writable tmpfs for temporary files.
- Candidate workspace mounted at `/workspace`.
- Trusted evaluator tests mounted read-only at `/trusted_tests`.
- Execution timeout (default 30 seconds).

The runner parses pytest output into pass/fail counts and returns a structured `TestRunResult`.

### Fail-closed behavior

Docker is preferred and unsafe host execution fallback is disabled by default. If Docker is missing or execution fails, the runner returns a failure result explaining that the isolation boundary is unavailable. Do not weaken this behavior for convenience when executing untrusted candidate code.

### Local runner image

The default image name is `codevo-runner:3.11`. Ensure the image is built/available using the repository's runner setup before attempting execution. The backend Python runtime and the runner image Python runtime are separate concerns.

**Production warning:** Docker hardening in a prototype is not, by itself, a complete multi-tenant sandbox security certification. Before public untrusted workloads, perform threat modeling and add stronger isolation, lifecycle cleanup, quotas, monitoring, and infrastructure-level controls.

---

## 12. Submission and evaluation flow

Submission code lives under `app/core/evaluator/`.

### Flow

1. Candidate requests a test run.
2. Backend executes the trusted CI-001 tests.
3. Test-run metadata and workspace revisions are recorded.
4. Candidate submits the workspace.
5. Submission manager verifies that the workspace has not changed since the latest test run.
6. The candidate workspace is snapshotted.
7. The evaluator computes the CI-001 rubric/report from test evidence and inspected files.
8. The session is marked submitted/read-only.
9. Candidate can list or retrieve their own submission report.

### Current CI-001 rubric

The evaluator contains evidence-oriented rubric categories. The first documented category is Functional Correctness & Verification (40%); Security & Validation Hygiene is another rubric area. Consult `app/core/evaluator/engine.py` and `models.py` for the exact current weights, scoring formulas, and report schema before changing scoring behavior.

### Persistence

The current `SubmissionManager` writes submission/test-run records and workspace snapshots to local JSON/files under `workspace_storage/`. Some latest-run lookup is cached in memory and can be reconstructed from local files. This is prototype persistence, not durable database-backed production storage.

### Important evaluation invariant

The trusted evaluator tests must remain separate from candidate-editable workspace files. Never modify trusted tests or scoring logic merely to make a candidate's solution pass.

---

## 13. Testing and quality checks

The backend test suite is under `tests/`. The project progress notes report 60 offline tests covering authentication, JWKS behavior, configuration validation, health probes, and CORS.

Run from `backend/` with the virtual environment activated:

```bash
pytest -v
```

Run a focused module when iterating:

```bash
pytest tests/test_auth_jwt.py -v
pytest tests/test_auth_jwks.py -v
pytest tests/test_auth_endpoint.py -v
pytest tests/test_config.py -v
pytest tests/test_health.py -v
```

The auth tests use generated keys/fixtures and should not need a live Supabase service.

Before committing:
- Run the full test suite.
- Add tests for new routes, error cases, and authorization boundaries.
- Test invalid, expired, wrong-issuer, wrong-audience, and unknown-`kid` JWT paths when touching auth.
- Test path traversal and revision conflicts when touching workspaces.
- Test Docker-unavailable and timeout behavior when touching the runner.
- Ensure no secrets or raw bearer tokens appear in logs or error responses.

---

## 14. Security requirements for contributors

1. **Authenticate server-side.** Never trust a user ID or role sent in a request body/header other than the verified token identity.
2. **Authorize every resource.** A valid JWT alone does not prove ownership of a session or submission.
3. **Treat candidate code as hostile.** Never execute it in the FastAPI process.
4. **Keep trusted tests immutable to the candidate.** Mount them read-only and keep them outside the candidate workspace.
5. **Constrain filesystem access.** Resolve all user/model-provided paths against the session root and reject traversal.
6. **Keep secrets server-side.** Do not expose Groq keys, service-role keys, signing secrets, or internal keys to the browser.
7. **Fail closed.** Do not bypass authentication, signature checks, or runner isolation on failure.
8. **Sanitize logs and errors.** Avoid logging access tokens, API keys, passwords, or full sensitive provider payloads.
9. **Validate model tool calls.** The model is an untrusted caller; tool schemas are not a substitute for server-side validation.
10. **Do not overstate production readiness.** Local file persistence and Docker-based prototype isolation are not production multi-tenant infrastructure.

### Route authentication review

The current route module does not apply `get_current_user` uniformly to every workspace, runner, and agent endpoint. Some operations (notably submission and submission retrieval/listing) do use verified-user dependencies and ownership checks. Before deploying the API publicly, review and enforce authentication plus session ownership for **every** workspace, agent, runner, reset, and submission operation. CORS is not authentication.

---

## 15. Known gaps and roadmap

The repository's architecture notes describe a broader target system. These are not all implemented in the current service:

- Next.js BFF with opaque HttpOnly session cookies and CSRF protection.
- PostgreSQL schemas, migrations, connection management, and Row-Level Security.
- Durable shared workspace/session/test/submission storage.
- Candidate BYOK credential vault with envelope encryption and external KMS.
- Complete challenge provisioning and evaluator coverage beyond CI-001.
- Stronger production-grade multi-tenant execution isolation and operational controls.
- Comprehensive end-to-end authorization and abuse testing.

Use `.agents/ARCHITECTURE.md`, `.agents/DECISIONS.md`, and `.agents/MEMORY.md` to understand the target design and current project progress. Architecture documents describe intended boundaries; always verify implementation in source.

---

## 16. Troubleshooting

### Settings validation fails at startup

- Check spelling and case of environment variable names.
- Validate `ENVIRONMENT` is one of the supported values.
- In production, set `DEBUG=false`, use HTTPS for non-loopback Supabase URLs, and configure explicit allowed origins.
- Ensure required internal service secrets meet the validator's policy.

### `/auth/me` returns 401

- Confirm the request includes a valid Supabase access token.
- Confirm `SUPABASE_URL` points to the token issuer's project.
- Check issuer, audience, expiry, signing algorithm, and `kid`.
- Confirm the token uses ES256 or RS256 and the corresponding public key exists in JWKS.

### Authentication returns 503

The JWKS provider could not be reached or used. Check outbound network access, Supabase URL, DNS/TLS, and timeout settings. This is intentionally distinct from an invalid token.

### Agent endpoint returns 503

The backend does not have `GROQ_API_KEY` configured. Add it to the backend environment and restart the service.

### Agent requests time out or are rate-limited

Check Groq account/model availability, provider limits, backend connectivity, and logs. Do not expose provider credentials or raw request headers in debugging output.

### Runner says Docker is unavailable

Start Docker Desktop/Engine and verify `docker version` works in the same environment that runs FastAPI. Confirm the `codevo-runner:3.11` image exists. The secure default refuses unsafe host execution.

### Submission is rejected because files changed

The workspace revision is newer than the latest recorded test run. Run the tests again against the current workspace, then submit.

### Submission/report is missing after restart

The prototype uses local file-backed storage. Confirm the process has the same persistent `workspace_storage/` directory and that it was not removed. This is one reason durable database persistence is a planned milestone.

---

## 17. Developer change map

| Task | Start here |
|---|---|
| App startup / middleware / lifespan | `app/main.py` |
| API registration | `app/api/v1/router.py` |
| Health endpoints | `app/api/v1/routes/health.py` |
| Current-user endpoint | `app/api/v1/routes/auth.py` |
| Workspace / agent / runner / submission routes | `app/api/v1/routes/agent_workspace.py` |
| Environment validation | `app/core/config.py` |
| Global exception handling | `app/core/errors.py` |
| Logging | `app/core/logging.py` |
| JWT dependency and identity | `app/core/auth/dependencies.py`, `models.py` |
| JWKS provider/cache | `app/core/auth/jwks.py` |
| JWT verification | `app/core/auth/verifier.py` |
| Groq integration | `app/core/ai/groq_adapter.py` |
| Agent turn loop | `app/core/agent/orchestrator.py` |
| Tool catalogue/dispatch | `app/core/agent/tools.py` |
| Workspace files/revisions | `app/core/agent/workspace_manager.py` |
| Docker test execution | `app/core/runner/isolated_runner.py` |
| Scoring and report generation | `app/core/evaluator/engine.py` |
| Submission/test-run persistence | `app/core/evaluator/submission_manager.py` |
| Backend tests | `tests/` |

---

## 18. Further reading

- Root `README.md` — overall product KT and repository guide.
- `frontend/README.md` — candidate-facing app, routes, auth context, and frontend API integration.
- `.agents/ARCHITECTURE.md` — target architecture and system boundaries.
- `.agents/DECISIONS.md` — accepted technical decisions.
- `.agents/MEMORY.md` — verified implementation progress.
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [Supabase Auth documentation](https://supabase.com/docs/guides/auth)
- [PyJWT documentation](https://pyjwt.readthedocs.io/)

---

**Codevo Backend — the trusted API and execution coordinator behind Build. Debug. Prove.**
