# Codevo — Intended Architecture

- Status: Proposed; not implemented
- Updated: 2026-11-07

## 1. Frontend
Planned: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Monaco Editor, xterm.js. Add other libraries only when the relevant milestone requires them.

Responsibilities: landing page, dashboard, challenge browsing, settings, history, results, browser IDE UI, timer display based on server deadline, candidate-facing API requests. Never bundle hidden tests or evaluator-only data.

## 2. Backend
Planned: Python + FastAPI.

Responsibilities: authorization, challenge catalogue, session lifecycle, authoritative deadlines, workspace provisioning/snapshotting, AI orchestration, agent tool authorization, execution orchestration, submission/evaluation, reports/history.

## 3. Database/auth & Platform-Wide Session Architecture
Planned: Supabase PostgreSQL and Supabase Auth with a Backend-for-Frontend (BFF) Session Architecture.

### 3.1 BFF Session Architecture, Database Session Store & Complete Interaction Flow
- **Architecture Flow**: Browser → Next.js Server (BFF) → FastAPI Backend → Supabase Auth / PostgreSQL.
- **Chosen BFF Session Store: PostgreSQL-Backed (`private.sessions`)**:
  - Rather than introducing Redis prematurely, Codevo employs a robust, database-backed session store in PostgreSQL schema `private.sessions`.
  - **Session Schema**:
    ```sql
    CREATE TABLE private.sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id_hash VARCHAR(64) NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        encrypted_access_token BYTEA NOT NULL,
        access_token_iv BYTEA NOT NULL,
        access_token_tag BYTEA NOT NULL,
        encrypted_refresh_token BYTEA NOT NULL,
        refresh_token_iv BYTEA NOT NULL,
        refresh_token_tag BYTEA NOT NULL,
        session_key_version INTEGER NOT NULL DEFAULT 1,
        token_expires_at TIMESTAMPTZ NOT NULL,
        idle_expires_at TIMESTAMPTZ NOT NULL,
        absolute_expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_sessions_hash ON private.sessions(session_id_hash);
    CREATE INDEX idx_sessions_user_id ON private.sessions(user_id);
    CREATE INDEX idx_sessions_cleanup ON private.sessions(idle_expires_at, absolute_expires_at);

    ALTER TABLE private.sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE private.sessions FORCE ROW LEVEL SECURITY;

    CREATE POLICY bff_sessions_access
    ON private.sessions
    AS PERMISSIVE
    FOR ALL
    TO codevo_bff_role
    USING (true)
    WITH CHECK (true);
    ```
  - **High-Entropy Opaque Session Tokens & Hashing**:
    - Browser cookie contains 32 cryptographically secure random bytes (256 bits of entropy), Base64URL-encoded: `crypto.randomBytes(32).toString('base64url')`.
    - The raw cookie token is **never persisted** to database or logs. The database stores strictly a SHA-256 hash: `session_id_hash = crypto.createHash('sha256').update(rawToken).digest('hex')`. A database leak or SQL dump cannot yield usable browser session cookies.
  - **Session Lookup Avoids Trusting Frontend-Supplied IDs**:
    - The candidate browser never sends a `user_id` parameter; it sends only the opaque cookie `__Host-codevo_session`. Next.js computes `hash = SHA256(cookie)` and queries `SELECT * FROM private.sessions WHERE session_id_hash = :hash`. Candidate `user_id` is derived strictly from the server-side decrypted row.
  - **Session Encryption Key Management (`CODEVO_SESSION_SECRET`)**:
    - **Key Material Separation**: The session encryption key is completely independent of the BYOK AI provider credential KEK/DEKs. Compromise of one key does not affect the other.
    - **Production KMS / Secret Manager**: In production, session keys are managed via AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault. (Local development baseline uses `CODEVO_SESSION_SECRET_V1` in secure local environment).
    - **AEAD Encryption & Metadata**: Supabase access and refresh tokens are encrypted at rest using AES-256-GCM. Each write generates fresh 96-bit IVs (`access_token_iv`, `refresh_token_iv`) and 128-bit authentication tags (`access_token_tag`, `refresh_token_tag`), stamped with `session_key_version`.
    - **Key Rotation Without Mass Session Invalidation**: Next.js BFF maintains a versioned Keyring map (`current: 2`, `supported: [2, 1]`). New and refreshed sessions are encrypted using `current` (`version 2`). Existing sessions encrypted under `version 1` continue to be decrypted using `version 1` and are re-encrypted with `version 2` upon token refresh, migrating active sessions seamlessly without logging candidates out.
    - **Controlled Retention & Retirement**: Previous key versions (`version 1`) are retained in the Keyring for the duration of the absolute expiration window (7 days). After 7 days, any remaining session under `version 1` has expired; `version 1` can then be securely retired from KMS.
    - **Failure Handling**: If a session row presents an unknown or unretrievable `session_key_version`, fail closed: log a structured security audit alert (without token data), delete the un-decryptable session row, and return `401 Unauthorized` prompting re-authentication.
    - **Invariant**: Never store plaintext session encryption keys in PostgreSQL or expose them to browser JavaScript.
  - **Session Expiration & Idle Timeout**:
    - `absolute_expires_at`: 7 days (604,800s) from creation. Session cannot be extended past this point without full re-authentication.
    - `idle_expires_at`: 24 hours (86,400s) from `last_active_at`. Extended on active user requests up to the absolute expiration ceiling.
  - **Refresh-Token Rotation & Concurrent Refresh Handling**:
    - When the forwarded Supabase JWT is within 60 seconds of expiration, Next.js initiates server-to-server token renewal.
    - To prevent race conditions from concurrent browser requests, Next.js uses an atomic conditional update query or advisory lock on `session_id_hash` (`UPDATE private.sessions SET ... WHERE session_id_hash = :hash`).
    - The renewed access and refresh tokens from Supabase Auth are re-encrypted and persisted atomically. Concurrent requests await the refresh operation or immediately utilize the updated token.
  - **Session Revocation & Logout**:
    - Explicit logout (`POST /api/auth/logout`) deletes the session row matching `session_id_hash`, calls Supabase `signOut` server-to-server, and clears the browser cookie with `Max-Age=0`.
  - **Invalidation Following Security Events**:
    - Password resets, credential compromises, or account suspensions trigger immediate server-side revocation: `DELETE FROM private.sessions WHERE user_id = :user_id`. All active sessions across all browser profiles are instantly terminated.
    - Cascading foreign key `REFERENCES auth.users(id) ON DELETE CASCADE` ensures deleting a Supabase user automatically purges all associated active sessions.
  - **Multi-Instance Consistency**:
    - Because sessions reside in PostgreSQL, horizontally scaled Next.js BFF instances share identical session state without requiring Redis, shared memory, or sticky load-balancer routing.
  - **Secure Cleanup of Expired Sessions**:
    - Periodic scheduled background worker or pg_cron job executes: `DELETE FROM private.sessions WHERE idle_expires_at < NOW() OR absolute_expires_at < NOW()`.

- **Detailed Interaction Sequence**:
  1. **Authentication**: Candidate submits credentials (`email`, `password`) over HTTPS to Next.js BFF endpoint (`/api/auth/login`).
  2. **Server-Side Token Acquisition**: Next.js server calls Supabase Auth `signInWithPassword(email, password)` server-to-server.
  3. **Server-Side Token Retention**: Supabase access token (JWT) and refresh token are encrypted and stored in `private.sessions`. Tokens never touch browser JavaScript.
  4. **Opaque Cookie Issuance**: Next.js issues an opaque, cryptographically random high-entropy session identifier (`__Host-codevo_session` in production / `codevo_session` in local development) with flags: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`.
  5. **Server-to-Server Request Forwarding**: Browser sends same-origin requests to Next.js BFF. Next.js hashes the cookie, validates the session in `private.sessions`, retrieves and decrypts the active Supabase JWT (refreshing if expired), and forwards the request to FastAPI.
  6. **Independent FastAPI Verification & Authorization**: FastAPI receives the forwarded JWT, independently verifies it against the Supabase JWKS endpoint (`kid`, `["ES256", "RS256"]`, `iss`, `aud`, `exp`, `sub`), extracts the authoritative `user_id = token["sub"]`, and executes server-side authorization checks on the requested resource.
  7. **Revocation & Logout**: `POST /api/auth/logout` invalidates the server-side session, revokes refresh tokens on Supabase Auth, and clears the cookie with `Max-Age=0`.

### 3.2 BFF CSRF Defense Architecture
- **Threat Model**: Browser requests to the Next.js BFF are same-origin. Because browser cookies (`__Host-codevo_session`) are automatically attached by the browser, CORS alone offers no protection against CSRF attacks (e.g. cross-origin form submissions, forged cross-origin fetch/XHR, or malicious image/script pings).
- **Mandatory Defenses**:
  1. **Strict Origin & Referer Verification**:
     - All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require verification of the HTTP `Origin` header against the trusted Codevo origin.
     - If the `Origin` header is absent, validate the `Referer` header against the trusted host and scheme.
     - If both headers are absent or fail to match the trusted origin, the request is immediately rejected with `403 Forbidden`.
  2. **Synchronizer / Cryptographically Bound Anti-CSRF Token**:
     - State-changing mutations require an `X-CSRF-Token` header.
     - The CSRF token is cryptographically bound to the authenticated server session or distributed via an HMAC-signed double-submit cookie.
     - The Next.js BFF validates that the provided `X-CSRF-Token` matches the active session before processing the mutation or forwarding requests to FastAPI.
  3. **SameSite Cookie Attributes**:
     - Session cookies enforce `SameSite=Lax` (preventing ambient cross-site `POST` requests while allowing top-level navigation). High-security endpoints (credential changes, account deletion) require re-authentication and strict CSRF validation.
  4. **Protected Operations**:
     - CSRF protection covers: AI provider credential updates (`PUT /api/v1/me/provider-credentials/{provider}`), credential deletion (`DELETE`), account profile updates, password resets, logout (`POST /api/auth/logout`), and challenge submission finalization.
  5. **Login CSRF Defense**:
     - Pre-flight CSRF tokens are issued to the unauthenticated login form.
     - Session regeneration is enforced immediately upon successful authentication to prevent session fixation attacks where an attacker tricks a victim into authenticating into the attacker's pre-existing session.
  6. **Automated Verification**:
     - Automated security tests assert: rejection of cross-origin HTML form submissions (`<form action="..." method="POST">`), rejection of `fetch()` from untrusted origins, rejection of requests with missing/mismatched `X-CSRF-Token`, and rejection of requests with spoofed `Referer` headers.

### 3.3 Target Deployment Infrastructure Requirements & Service-to-Service Authentication
*(Note: Cloudflare WAF, internal VPC, service mesh, and private database subnets represent target deployment architecture requirements/options pending final hosting provider selection. Unprovisioned infrastructure is not represented as deployed or verified).*
- **Target Network Ingress Quarantine**:
  - In target production deployment, FastAPI is quarantined from direct untrusted public browser ingress via private VPC / internal container networking (`http://fastapi-backend:8000`).
  - Browser clients communicate exclusively with the Next.js BFF via same-origin requests (`/api/*`).
  - Only the Next.js server-side runtime communicates directly with FastAPI.
- **Service-to-Service Authentication (Next.js BFF ↔ FastAPI)**:
  - Communication between the Next.js BFF server and the FastAPI backend requires explicit, two-layered authentication distinguishing **Service Identity** from **Candidate User Identity**:
    1. **Service Identity Verification (Layer 1)**:
       - Production Target: Mutual TLS (mTLS) with internal PKI certificates or managed cloud workload identity (e.g. AWS IAM / GCP Service Account identity tokens).
       - Development / Container Baseline: Cryptographically secure pre-shared internal service token passed via `X-Internal-Service-Key: <SECRET>` header across internal network.
       - FastAPI rejects any request lacking valid service identity credentials, blocking direct unauthorized access even from within the same VPC.
    2. **Candidate User Identity Verification (Layer 2)**:
       - The Next.js BFF server retrieves the decrypted Supabase JWT from `private.sessions` and attaches it to the internal backend request as `Authorization: Bearer <SUPABASE_JWT>`.
       - **Strict Invariant**: Next.js BFF must **strip and discard any browser-supplied `Authorization` header** from the incoming browser request. Next.js constructs the backend `Authorization` header exclusively from the validated server-side database session.
       - FastAPI independently verifies the Supabase JWT against the Supabase JWKS endpoint (`kid`, `["ES256", "RS256"]`, `iss`, `aud`, `exp`, `sub`) on every protected invocation.
       - **Zero Trust for Forwarded Identity Headers**: FastAPI never accepts or trusts forwarded `user_id`, `role`, or `tenant_id` headers from Next.js. Candidate identity is derived solely from the verified JWT `sub` claim.
    3. **Separation of Concerns**:
       - Service identity authenticates that the calling machine/service is the trusted Next.js BFF.
       - User identity authenticates that the candidate session is authentic, active, and permitted to perform the requested operation.
- **CORS Scope & Role**:
  - In production, because clients do not directly address FastAPI, CORS on FastAPI is restricted strictly to the internal Next.js domain/IP, or disabled if entirely behind reverse proxy routing.
  - In local development, FastAPI enables CORS for `http://localhost:3000` with explicit methods and headers to facilitate local multi-port development.
  - **Invariant**: CORS is an origin-sharing browser directive, **never** an authorization or access-control mechanism. Missing or misconfigured CORS does not replace server-side authentication.

### 3.4 Server-Side Authentication & Authorization
- **No Client Security Authority**: The frontend is responsible only for interface presentation and request dispatch. Frontend route guards, React state, and hidden UI elements are not security boundaries.
- **Server-Side Authentication**: FastAPI validates the incoming server session on every protected request, derives the authoritative `user_id` strictly from the server-validated identity, and rejects client-supplied user IDs or unauthenticated requests.
- **Server-Side Authorization (Deny-by-Default)**: Every protected operation (interview sessions, candidate profiles, submissions, evaluation reports, workspace documents, provider credentials, AI operations) verifies resource ownership and permissions server-side.
- **Safe Profile Models**: Endpoints return safe profile fields only (display name, profile image URL, email where required, account status, safe metadata). Sensitive secrets and tokens are strictly excluded by response schemas.

Potential tables: profiles, challenges, challenge_versions, interview_sessions, session_messages, session_events, code_submissions, test_results, evaluation_reports, user_ai_providers.

## 4. Session Lifecycle, Canonical Workspace Ownership & Synchronization
1. Candidate requests challenge start.
2. Backend validates session and creates interview record with authoritative `deadline_at`.
3. Workspace is provisioned from a pinned, versioned challenge package (`ci-001-fastapi-auth:v1.0.0`).
4. Candidate edits code; changes synchronize to the authoritative backend.
5. AI Agent or candidate executes tests in an isolated sandbox.
6. Candidate submits or deadline expires; backend freezes final candidate snapshot.
7. Evaluator runs final snapshot in a fresh isolated environment.
8. Results are persisted and returned.

### 4.1 Canonical Workspace Ownership and Synchronization Model
- **FastAPI Authoritative Ownership**:
  - The Python FastAPI backend is the single source of truth for workspace documents and revision tracking.
  - Each document maintains canonical state: `path: str`, `content: str`, `revision: int`, `hash: str`, and `updated_at: datetime`.
  - Frontend React state and Monaco buffers serve as a presentation and editing layer; the backend holds authority for all mutations performed by AI tools and persistence.
- **Revision-Aware Client Synchronization**:
  - Candidate Monaco changes synchronize to FastAPI via debounced (e.g. 400ms), revision-aware updates: `PUT /api/v1/workspaces/{session_id}/files/{file_path}` passing `{content: str, base_revision: int}`.
  - **Optimistic Concurrency Control**: The backend verifies `base_revision == current_revision`. If valid, the content is committed, `revision` increments by 1, and the new revision number is returned.
  - If `base_revision != current_revision`, the backend rejects with `409 Conflict` (`REVISION_MISMATCH`), preventing stale browser tabs from overwriting newer changes.
- **Atomic Multi-File Agent Changes (Transaction Coordinator)**:
  - When the AI Agent modifies one or multiple files via `edit_file`, mutations execute through a server-side `ChangeSetCoordinator`.
  - Edits across multiple files are validated and committed **atomically** in an in-memory lock.
  - Upon commit, affected document revisions increment atomically.
  - FastAPI broadcasts committed updates over Server-Sent Events (SSE) topic `workspace:updates` with payload `{file_path, new_revision, patch_or_content, source: "agent"}`.
- **Monaco Preservation & Smooth UI Updates**:
  - Upon receiving an Agent SSE update, the Next.js frontend checks if the file is currently open in Monaco.
  - If the active buffer is not dirty (no uncommitted candidate typing), the client calls Monaco's `model.applyEdits(...)`, applying the change while preserving candidate scroll position, active selection, and tab state without jarring model rebuilds.
- **Candidate / Agent Concurrency & Conflict Resolution Strategy**:
  - **Clean / Non-Conflicting State**: The candidate is viewing the file or working in a different file. The Agent's edit applies cleanly via SSE, and the editor tab reflects the change immediately.
  - **Concurrent Active Typing in Same File**:
    1. *Stale Agent Edit Rejection*: If the Agent formulated a diff against revision $N$, but the candidate already committed revision $N+1$, the backend transaction rejects the Agent's modification with `409 Conflict: Stale base revision`. The Agent receives a structured error: *"File was modified by candidate during planning. Re-read file before modifying."*
    2. *Local Unsaved Keystrokes (Client Guard)*: If the candidate has uncommitted keystrokes in Monaco when an Agent commit arrives, the frontend detects buffer divergence and surfaces an inline non-blocking resolution notification:
       `Agent modified this file. [Accept Agent Version] [Keep My Changes] [View Diff]`
    3. *Zero Silent Overwrite*: The candidate's local edits are never silently obliterated by incoming Agent edits.
- **Immutable Snapshots for Code Execution**:
  - When test execution is requested (by candidate or Agent), FastAPI freezes the canonical workspace into an immutable point-in-time snapshot before dispatching it to the runner. In-flight editor typing cannot alter a running test execution.

### 4.2 Trusted Test Suite Isolation & Harness Protection
- **Separation of Writable and Trusted Scopes**:
  - **Candidate Writable Scope**: Application source code (`app/routers/`, `app/services/`, `app/models/`, `app/main.py`). Candidates and the AI Agent can read and modify these files.
  - **Trusted Read-Only Scope**: Challenge verification tests and configuration (`tests/test_auth.py`, `conftest.py`, `pytest.ini`).
- **Mount-Level Sandbox Isolation**:
  - In the isolated execution sandbox, the candidate writable directory is mounted read-write (`:rw`), while the trusted test suite is mounted **strictly read-only (`:ro`)** from a protected harness directory (`/harness/tests`).
  - The runner service controls the exact execution command: `["pytest", "-q", "/harness/tests/test_auth.py"]`.
  - Candidate code cannot overwrite the test harness, tamper with `pytest` configuration, monkey-patch test assertions, or bypass test collection.
- **Agent Tool Boundary Enforcement**:
  - The backend workspace service enforces that `edit_file` strictly rejects any target path inside `tests/` or harness directories with `403 Forbidden: Cannot modify trusted test suite`.
  - The Agent is permitted to inspect (`read_file`) trusted tests to understand requirements, but cannot alter tests to manufacture false-positive passes.
- **Hidden Evaluator Isolation**:
  - Hidden evaluator tests, reference solutions, and private rubrics reside strictly on evaluator infrastructure and are never bundled, mounted, or accessible in candidate workspaces or sandboxes.

### 4.3 Versioned CI-001 Challenge Package (`ci-001-fastapi-auth:v1.0.0`)
- **Package Identity**: `ci-001-fastapi-auth`, Version `1.0.0`.
- **Package Hierarchy**:
  ```
  packages/challenges/ci-001-fastapi-auth/
  ├── challenge.json              # Immutable metadata, category, difficulty, duration (40m), rubric
  ├── starter/                    # Initial broken starter repository (candidate writable scope)
  │   ├── app/
  │   │   ├── __init__.py
  │   │   ├── main.py
  │   │   ├── models/
  │   │   │   ├── __init__.py
  │   │   │   └── user.py
  │   │   ├── routers/
  │   │   │   ├── __init__.py
  │   │   │   └── auth.py
  │   │   └── services/
  │   │       ├── __init__.py
  │   │       └── authentication.py  # Contains intentional starter defects
  │   ├── README.md
  │   └── requirements.txt
  ├── harness/                    # Trusted read-only test harness
  │   └── tests/
  │       ├── __init__.py
  │       ├── conftest.py
  │       └── test_auth.py        # 5 official assertions (3 passing, 2 failing initially)
  └── solution/                   # Reference patch (maintainer only; excluded from candidate image)
      └── reference.patch
  ```
- **Known Initial Defects**:
  1. *Plaintext Password Storage*: `register_user` in `authentication.py` stores passwords in plaintext; fails to invoke `pwd_context.hash()`.
  2. *Missing Duplicate Email Check*: `register_user` allows multiple accounts to register with the identical email address without error.
  3. *Unsafe 500 on Invalid Login*: Missing exception handling when password verification fails, raising an unhandled 500 instead of returning a clean 401 Unauthorized with standard error schema.
- **Expected Initial Test Suite Baseline**:
  - `test_health_check`: PASSED
  - `test_registration_hashes_password`: FAILED (asserts bcrypt hash format `$2b$...`)
  - `test_registration_rejects_duplicate_email`: FAILED (asserts 400 Bad Request on duplicate email)
  - `test_valid_login_success`: PASSED
  - `test_invalid_login_error_schema`: PASSED
  - Total: 5 tests (3 passed, 2 failed).
- **Pinned Runtime & Dependencies**:
  - Python: 3.12+
  - Dependencies: `fastapi==0.115.0`, `pydantic==2.9.2`, `passlib[bcrypt]==1.7.4`, `bcrypt==4.2.0`, `pytest==8.3.3`, `httpx==0.27.2`.
- **Predefined Execution Commands**:
  - Allowed: `["pytest", "-q", "tests/test_auth.py"]`, `["pytest", "-v", "tests/test_auth.py"]`.
- **Sandbox Limits**:
  - 1.0 vCPU, 512 MB RAM, 64 process limit, 30s wall-clock timeout, `--network none`.
- **Reproducibility Guarantee**: The package is deterministic and can be reset or instantiated identically across multiple live local demonstrations.

## 5. AI Modes & Autonomous Agent Execution Loop
- **Chat Mode**: Candidate asks questions; assistant explains repository concepts, suggests architectural approaches, and provides debugging guidance. The candidate applies edits manually.
- **Agent Mode**:
  - The AI Agent acts autonomously within the candidate's authorized workspace.
  - **Autonomous In-Scope Code Modifications**: Candidate approval is **not required** for ordinary in-scope code edits within authorized challenge files. The Agent can autonomously inspect files, formulate an execution plan, apply multi-file code modifications, invoke real test execution, analyze failures, and iterate toward a fix.
  - **Mandatory Approval & Hard Restrictions**: Explicit approval or hard server-side rejection is mandatory for: destructive operations (e.g. file deletion outside challenge scope), out-of-scope file modifications, package installation (`pip install`), arbitrary shell command execution, external network access, and any attempt to access system files, host files, or credentials.
  - **Permitted Agent Tools**:
    - `list_files(directory?)`: Explores workspace hierarchy.
    - `read_file(path, start_line?, end_line?)`: Reads file contents safely.
    - `search_code(query, file_pattern?)`: Greps code across repository.
    - `edit_file(path, edits)`: Applies atomic multi-line changes using unified change-set management.
    - `run_tests(command?)`: Dispatches execution to the isolated runner service (predefined commands only, e.g. `pytest`).
  - **Autonomous Iteration Loop**:
    1. Inspect workspace $\rightarrow$ 2. Identify root cause $\rightarrow$ 3. Formulate short plan $\rightarrow$ 4. Apply file modifications $\rightarrow$ 5. Execute isolated tests $\rightarrow$ 6. Receive genuine stdout/stderr/exit codes $\rightarrow$ 7. Analyze test failures $\rightarrow$ 8. Iterate corrections within configured ceilings $\rightarrow$ 9. Generate final summary report.
  - **Guardrails**: Configurable iteration ceilings (e.g. max 5 tool loops per turn), cancellation support, full undo/conflict detection, and strict submission immutability (locking finalized sessions).

## 6. Challenge separation
Candidate-visible: starter repository, problem statement, public tests, setup/run instructions.
Evaluator-only: hidden tests, reference solution/patch, private rubric, validation notes.
Evaluator-only materials must never be mounted into candidate workspace, returned by candidate APIs, indexed by candidate-facing AI, bundled into frontend assets, or exposed in logs.

## 7. Evaluation
Freeze snapshot → fresh evaluator sandbox → pinned dependency setup → build/hidden tests → structured results → permitted static analysis → optional evidence-based AI review → challenge-specific score → persist candidate-safe report.

Automated tests are authoritative for defined behaviours. AI assessment is supplementary, not deterministic ground truth.

## 8. Platform-Wide Application Security Architecture (OWASP Top 10 & ASVS 5.0.0)
Codevo adopts a security-first engineering approach across the entire platform, utilizing OWASP Top 10:2025 as the risk coverage baseline and OWASP ASVS 5.0.0 as the technical verification reference.

### 8.1 Cross-Site Scripting (XSS) Defenses & CSP Architecture
- Strict reliance on React's automatic contextual escaping.
- Prohibit `dangerouslySetInnerHTML` unless input is processed through an approved, hardened DOMPurify pipeline.
- Prevent unsafe Markdown and code rendering: all Markdown content (problem briefings, chat messages, diffs) is sanitized before DOM injection.
- Validate all URLs against safe schemes (`http:`, `https:`). Reject `javascript:`, `data:`, or `vbscript:` schemes.
- **Cryptographic CSP Nonce Generation & Propagation**:
  - Nonces must be generated per response using a cryptographically secure source providing at least 128 bits of random entropy (16 random bytes encoded in Base64 via `crypto.getRandomValues(new Uint8Array(16))` or `crypto.randomBytes(16).toString('base64')`).
  - Next.js middleware generates the nonce, constructs the `Content-Security-Policy` header, and forwards the nonce to downstream server components via custom request header (`x-nonce`).
  - The Next.js root layout reads `x-nonce` from headers and applies the identical nonce to framework-generated scripts, runtime chunks, and approved application script elements (`<Script nonce={nonce}>`).
  - A fresh, unique nonce is generated for every individual HTTP response.
  - Caching prevention: All HTML responses enforce `Cache-Control: private, no-store, no-cache, must-revalidate` to ensure caching layers (CDN, reverse proxy, browser cache) never reuse nonce-bearing HTML and CSP headers across different users or subsequent requests.
- **Content Security Policy Directives**:
  - `default-src 'self'`
  - `script-src 'self' 'nonce-{BASE64_128BIT}' 'strict-dynamic'` (permitting trusted Next.js script loading and Monaco/xterm web workers via blob/worker-src without broadly enabling `'unsafe-eval'`)
  - `style-src 'self' 'unsafe-inline'` (*Proposed residual risk awaiting explicit approval; see below*)
  - `connect-src 'self' https://*.supabase.co`
  - `worker-src 'self' blob:`
  - `frame-ancestors 'none'` (anti-clickjacking)
  - `object-src 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`
- **Status of Monaco Editor `style-src 'unsafe-inline'` (Proposed Residual Risk Awaiting Explicit Approval)**:
  - **Classification**: Proposed residual risk awaiting explicit approval, **NOT** an already accepted risk.
  - **Why Proposed**: Monaco Editor dynamically generates, compiles, and injects runtime CSS rules into `<style>` DOM elements for language syntax highlighting, tokenization, and dynamic theme switching.
  - **Security Limitations**: Allowing `'unsafe-inline'` for styles permits arbitrary inline CSS injection, potentially exposing the application to UI redressing, CSS-based phishing, or sequential attribute-selector data exfiltration attacks if an HTML injection vulnerability were to exist.
  - **Evaluation of Narrower Policies**: Evaluated CSP Level 3 `style-src-elem` hashes and nonces. Monaco creates dynamic, fragmented style blocks for individual token classes at runtime, making static build-time hashes impossible and runtime nonce tagging fragile without monkey-patching Monaco internals. External stylesheet pre-generation is unsupported by Monaco's dynamic tokenizer.
  - **Detection & Verification**: Production CSP configures violation reporting via `report-uri /api/v1/csp-reports` (or `report-to`). Automated Playwright browser tests verify that unexpected inline `<style>` tags injected outside Monaco boundaries trigger explicit CSP violation events.
  - **Approval Requirement**: Must receive formal security review and explicit written sign-off from the Codevo Lead Architect and Security Officer prior to production deployment.
  - **Verification Status**: **Proposed CSP architecture and compatibility target — implementation and browser verification pending.** (No application source code has been modified; browser-level verification will occur during Milestone 1.9 test execution).

### 8.2 Cross-Site Request Forgery (CSRF) & CORS Architecture
- **CSRF Defense**: Combine `SameSite=Lax` cookies with anti-CSRF synchronizer tokens (`X-CSRF-Token` header) and strict Origin / Referer fallback verification on all state-changing endpoints (`POST`, `PUT`, `DELETE`, `PATCH`).
- **Protected Operations**: Covers credential updates (`PUT /api/v1/me/provider-credentials/{provider}`), credential deletion (`DELETE`), account profile modifications, password resets, logout (`POST /api/auth/logout`), and challenge submission finalization.
- **Login CSRF Defense**: Unauthenticated login forms issue pre-flight CSRF tokens, and the backend enforces session regeneration upon successful login to prevent session fixation and forced-login attacks.
- **Automated Verification**: Automated test suites assert rejection of cross-origin form submissions (`<form method="POST">`) and unauthorized cross-origin `fetch()` requests.
- **CORS Architecture**: Strict backend origin allowlist matching deployed Codevo frontends. Wildcard origins (`*`) with credentials (`Access-Control-Allow-Credentials: true`) are strictly forbidden. Handle preflight (`OPTIONS`) requests cleanly. CORS is treated as a browser sharing policy, never an authorization boundary.

### 8.3 Broken Access Control, IDOR & BOLA Defenses
- Authoritative server-side ownership checks across all resources (profiles, sessions, documents, submissions, assessment reports, provider keys, AI conversations).
- Deny-by-default access control. Never trust frontend `user_id`, roles, or permission flags.
- Multi-user tenant isolation tests assert that changing UUIDs or request payloads never allows User A to access User B's resources.

### 8.4 Injection & File Security (SQLi, Command, Path Traversal, SSRF)
- **SQL Injection**: Strict parameterized queries via SQLAlchemy under `codevo_api_role`.
- **Command Injection**: Zero untrusted shell interpolation. Use safe subprocess argument lists (`["pytest", "-q"]`) without `shell=True`. Restrict commands to server allowlists.
- **Path Traversal**: Canonicalize all workspace file paths. Reject `..`, absolute paths, drive letters, and ASCII control characters. Scope all operations strictly to the candidate's workspace directory.
- **SSRF Defenses**: AI provider outbound requests are strictly confined to hardcoded server-side base URLs. Outbound HTTP clients explicitly block RFC 1918 private IPs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), localhost (`127.0.0.1`), link-local, and cloud metadata (`169.254.169.254`).

### 8.5 Production Security Headers
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cache-Control: no-store, no-cache, must-revalidate` on all authenticated and API endpoints.

### 8.6 AI Agent & Prompt Security
- Treat user prompts, workspace files, and model outputs as untrusted data.
- Defend against indirect prompt injection: model outputs cannot elevate server-side tool permissions.
- Explicit tool allowlist; server-side permission validation before every tool execution.
- **Autonomous In-Scope Execution**: The Agent autonomously applies ordinary in-scope code modifications within authorized challenge files. Candidate approval is not required for standard in-scope edits.
- **Mandatory Approval & Hard Rejection**: Explicit candidate confirmation or hard server-side rejection is strictly enforced for: destructive file operations, out-of-scope modifications, package installations (`pip`), arbitrary shell execution, external network access, and secret/credential access.
- Enforce token limits, tool iteration ceilings, and execution timeouts.
- Enforce submission immutability: Submitted interview sessions strictly reject all AI tool execution and workspace mutations.

### 8.7 Code Execution Sandboxing & Prototype Runner Architecture
- **Dedicated Isolated Runner**: Candidate code execution runs in a dedicated, isolated execution sandbox separated from the application backend.
- **Prototype Target**: Python 3.12+ execution for `CI-001` (FastAPI Authentication challenge) running `pytest`.
- **Sandbox Isolation Invariants**:
  - **Host Boundary**: Never execute candidate code directly on the FastAPI application host.
  - **Non-Root Execution**: Execution processes run as an unprivileged, non-root user.
  - **Resource Ceilings**: Strict enforcement of CPU limits (e.g. 1.0 vCPU), memory limits (e.g. 512 MB), max processes (e.g. 64 pids), disk write quotas, and execution wall-clock timeouts (e.g. 30 seconds).
  - **Restricted Filesystem**: Sandbox mounts only the per-session candidate workspace directory. Zero access to host filesystem, evaluator-only tests, private rubrics, or other sessions.
  - **Zero Credential Inheritance**: The execution sandbox inherits zero API keys, zero environment secrets, zero database credentials, and zero Docker socket mounts.
  - **Network Isolation**: Outbound network egress is completely disabled by default (`--network none`).
  - **Command Allowlists**: Execution is strictly restricted to predefined, server-authorized commands (`["pytest", "-q"]`). Arbitrary shell command strings are rejected.
  - **Genuine Feedback**: Returns authentic stdout, stderr, and exit codes directly to the Agent and the candidate workspace terminal/test dock.
- **Public Multi-Tenant Execution Boundary**:
  - A local-only sandbox (e.g. isolated local container or unprivileged process wrapper with resource quotas) is used for the first controlled prototype demonstration.
  - Plain Docker alone is **not** considered an adequate multi-tenant security boundary for public untrusted execution.
  - Public multi-user execution remains strictly disabled until an independently validated microVM / kernel isolation boundary (e.g. gVisor, Firecracker) is implemented and verified.

### 8.8 Security Acceptance Criteria
1. Zero known unresolved Critical or High severity security vulnerabilities.
2. All authentication, authorization, and tenant isolation tests pass.
3. Zero sensitive credentials in browser persistent storage (`localStorage`, `sessionStorage`, `IndexedDB`).
4. Zero secrets in application logs, error payloads, or API responses.
5. CORS and CSRF configurations verified against deployed origins.
6. Production security headers verified.
7. XSS, SQLi, command injection, and path traversal test suites pass.
8. Automated dependency and secret scans pass cleanly.
9. Security exceptions and accepted risks explicitly documented.
10. Public untrusted code execution remains disabled until isolation boundary is independently validated.
11. Formal security review completed prior to production release.
12. Acknowledge security posture honestly: automated checks pass, but no claim of absolute vulnerability-free status is made.

## 9. BYOK (Backend-Only Architecture & Security Controls)
All candidate-provided AI provider API keys (OpenAI, Anthropic, DeepSeek, Gemini, Groq, Cerebras, Sarvam, OpenRouter) are stored and used exclusively on the backend.
- **Accurate Browser Credential-Handling Policy**:
  - Passwords and API keys necessarily exist transiently in browser memory while the candidate enters and submits them in form inputs.
  - Zero persistent storage: Never store passwords, tokens, or API keys in `localStorage`, `sessionStorage`, or `IndexedDB`.
  - No unnecessary JavaScript state copies: Avoid copying raw secrets into global stores (Zustand, Redux), window objects, or component lifecycle histories.
  - Immediate state clearance: Form input fields and component state holding sensitive keys must be cleared immediately upon successful network submission.
  - Zero secret logging: Never expose raw keys in console logs, telemetry, error reporting, or URL query parameters.
  - Server-side tokens: JWT access tokens and refresh tokens remain strictly server-side; the browser receives only an opaque HttpOnly session cookie.
  - One-way key transmission: Frontend transmits API keys once over TLS to the backend for encrypted storage; keys are never returned to the browser after submission (only masked metadata `sk-...1234` is returned).
  - Direct browser-to-provider API calls are strictly forbidden.

### 9.1 Phased AI Provider Integration Strategy (Prototype First)
- **Extensible Architecture**: The backend provider registry, adapter interfaces, and credential database models are architected to support all 8 approved providers:
  1. OpenAI
  2. Anthropic Claude
  3. DeepSeek
  4. Google Gemini
  5. Groq
  6. Cerebras
  7. Sarvam AI
  8. OpenRouter
- **Prototype Initial Focus**: To deliver a working demonstrable prototype without delay, Substep 1.9.2 implements the server-side registry and integrates **one primary high-performance cloud AI provider** (selected for official API tool-calling fidelity, coding performance, and low latency, e.g. OpenAI GPT-4o or Anthropic Claude Sonnet) with live model inference, SSE streaming, connection testing, and error handling.
- **Post-Prototype Expansion**: Adapters for the remaining 7 providers will be implemented sequentially in subsequent milestones once the core autonomous agent loop is proven end-to-end.

### 9.2 Authentication Strategy (Supabase Auth & JWKS Verification)
- Real Supabase Auth is brought forward into Substep 1.9.1 (local Supabase Auth for development; managed Supabase Auth in production).
- FastAPI strictly verifies the Supabase JWT:
  - **JWKS Key Retrieval Endpoints**:
    - Production: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
    - Local Development: `http://localhost:54321/auth/v1/.well-known/jwks.json`
  - **`kid` Matching**: The token's header `kid` is matched against the corresponding public key in the JWKS catalogue.
  - **Algorithm Allowlist**: An explicit allowlist `["ES256", "RS256"]` is enforced for production asymmetric verification. Unsupported algorithms (including unsigned tokens with `alg: "none"` or symmetric tokens presented against JWKS) are rejected immediately.
  - **Key Rotation**: JWKS keys are cached in memory with a 10-minute TTL; if an incoming token presents an unknown `kid` (indicating key rotation), the cache is refreshed from the JWKS endpoint before rejecting, ensuring zero downtime.
  - **Complete Elimination of Legacy HS256**: Symmetric verification via HS256 is completely eliminated and unsupported across all environments (development, test, and production). The platform accepts only asymmetric ES256 and RS256 public keys via JWKS. Unit and integration tests generate offline asymmetric test keypairs rather than relying on shared symmetric secrets, completely closing symmetric key exposure risks.
  - **Claims Validation**: Signature, issuer (`iss`), audience (`aud == "authenticated"`), expiry (`exp`), and subject (`sub`) are verified. Candidate identity is derived **strictly from the verified `sub` claim**. Client-supplied `user_id` values in request bodies, query strings, or headers are completely ignored.

### 9.3 Database Isolation, Dual-Role Provisioning & RLS Trust Boundary
- Direct use of the privileged `service_role` is strictly prohibited for runtime user operations because `service_role` bypasses Row-Level Security (RLS).
- **Dual Dedicated Least-Privilege Database Roles**:
  Codevo enforces strict architectural separation of concerns at the database layer by provisioning two distinct, mutually quarantined application roles:
  1. **`codevo_bff_role` (Next.js BFF Server)**:
     - **Responsibilities**:
       - Lookup session records by `session_id_hash` (derived from opaque cookie).
       - Insert new session records upon successful candidate login.
       - Update encrypted tokens, `session_key_version`, and sliding idle expiration on token refresh.
       - Delete session records on logout and purge expired sessions.
     - **Role Attributes**: `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`. Non-owner, non-member of `service_role`, `supabase_admin`, or `postgres`.
     - **Table Permissions**: Granted `USAGE ON SCHEMA private`; granted `SELECT, INSERT, UPDATE, DELETE ON private.sessions TO codevo_bff_role`.
     - **Strict Table Quarantine**: `REVOKE ALL ON private.user_provider_credentials FROM codevo_bff_role;`. The Next.js BFF server has zero database privilege to access, read, or modify candidate AI provider credentials.
     - **Server Identity**: Next.js establishes its trusted server identity by connecting to PostgreSQL with credentials provisioned exclusively to the Next.js container environment (`CODEVO_BFF_DB_PASSWORD`).
     - **Identity Derivation (Zero Frontend Trust)**: The browser never provides a `user_id`. Next.js queries strictly by `session_id_hash = SHA256(rawCookie)`. Candidate `user_id` is established strictly from the server-side decrypted row.
  2. **`codevo_api_role` (FastAPI Backend Service)**:
     - **Responsibilities**:
       - Candidate AI provider credential management under RLS (`private.user_provider_credentials`).
       - Candidate challenge workspace, execution snapshots, and submission evaluation records.
     - **Role Attributes**: `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`. Non-owner, non-member of `service_role`, `supabase_admin`, or `postgres`.
     - **Table Permissions**: Granted `USAGE ON SCHEMA private`; granted `SELECT, INSERT, UPDATE, DELETE ON private.user_provider_credentials TO codevo_api_role`.
     - **Strict Table Quarantine**: `REVOKE ALL ON private.sessions FROM codevo_api_role;`. The FastAPI backend service has zero database privilege to access session cookies, session hashes, or raw auth session tokens.
     - **Server Identity**: FastAPI connects with its own independent database credentials (`CODEVO_API_DB_PASSWORD`).
- **Role Provisioning & Privilege Verification**:
  - No literal or placeholder passwords exist in executable migration SQL scripts. Role passwords are provisioned via environment variables or cloud secret managers.
  - Startup/migration verification queries assert that neither `codevo_bff_role` nor `codevo_api_role` possesses `rolsuper`, `rolbypassrls`, or `rolinherit`, and that neither is a member of `service_role` or `postgres`.
- **Dedicated Non-Exposed `private` Schema**:
  - The tables reside in schema `private`.
  - **Supabase Data API Exclusion**: In Supabase/PostgREST configuration (`pgrst.db_schemas`), `private` is **strictly excluded** (only `public` and `storage` are exposed).
  - All direct permissions for `anon`, `authenticated`, and `public` roles on `private`, `private.sessions`, and `private.user_provider_credentials` are explicitly revoked (`REVOKE ALL ON SCHEMA private FROM anon, authenticated, public;`). REST API calls to `/rest/v1/*` targeting the private schema are completely blocked.
- **Enforced Row-Level Security & Policy Architecture**:
  - Tables are created with forced RLS:
    - `ALTER TABLE private.sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE private.sessions FORCE ROW LEVEL SECURITY;`
    - `ALTER TABLE private.user_provider_credentials ENABLE ROW LEVEL SECURITY; ALTER TABLE private.user_provider_credentials FORCE ROW LEVEL SECURITY;`
  - `FORCE ROW LEVEL SECURITY` guarantees that RLS is applied unconditionally to all queries, including table owners and background processes.
  - **Critical PostgreSQL RLS Architecture Rule**:
    - PostgreSQL requires at least one applicable `PERMISSIVE` policy to grant access. A `RESTRICTIVE` policy alone results in default denial because restrictive policies only reduce the set of records granted by permissive policies.
    - The core user ownership policy on `private.user_provider_credentials` is defined as `AS PERMISSIVE` (the PostgreSQL default):
      ```sql
      CREATE POLICY user_provider_credentials_isolation
      ON private.user_provider_credentials
      AS PERMISSIVE
      FOR ALL
      TO codevo_api_role
      USING (user_id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID)
      WITH CHECK (user_id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID);
      ```
    - The access policy on `private.sessions` is defined for `codevo_bff_role`:
      ```sql
      CREATE POLICY bff_sessions_access
      ON private.sessions
      AS PERMISSIVE
      FOR ALL
      TO codevo_bff_role
      USING (true)
      WITH CHECK (true);
      ```
    - Restrictive policies (`AS RESTRICTIVE`) are added only when there is an independently justified additional constraint on columns within the application schema (for example, locking updates/deletions on finalized sessions). The `codevo_api_role` does not have access to `auth.users`, and policies must never query `auth.users` directly.
  - **Executable RLS Test Coverage Requirements**:
    - Before declaring the RLS implementation valid, actual PostgreSQL tests under `codevo_api_role` must execute and demonstrate:
      1. **Authorized User** (session claim matches `user_id`):
         - `SELECT`: Can read own credential records.
         - `INSERT`: Can insert records with own `user_id`.
         - `UPDATE`: Can update own records.
         - `DELETE`: Can delete own records.
      2. **Unauthorized User** (session claim set to different `user_id`):
         - `SELECT`: Returns 0 rows (silent tenant isolation, no leakage).
         - `INSERT`: Fails with `check_violation` error (RLS WITH CHECK blocks inserting rows for other users).
         - `UPDATE`: Affects 0 rows (cannot tamper with other users' records).
         - `DELETE`: Affects 0 rows (cannot delete other users' records).
      3. **Unauthenticated / Missing Claim** (`request.jwt.claim.sub` unset or empty):
         - All operations fail closed (0 rows returned or check violation).
    - The backend and database test suite must run these tests deterministically in CI.
- **RLS Trust Boundary & Defense-in-Depth Model**:
  - The claim `request.jwt.claim.sub` is set by FastAPI via `SELECT set_config('request.jwt.claim.sub', :user_id, true)` (`SET LOCAL`) inside an atomic transaction.
  - **Accurate Boundary Definition**: PostgreSQL does not independently cryptographically verify this claim; PostgreSQL trusts what the connected application role sets.
  - The security pipeline is:
    1. FastAPI cryptographically verifies the Supabase JWT.
    2. FastAPI derives the user ID from the verified `sub` claim.
    3. FastAPI sets the identity transaction-locally (`SET LOCAL`).
    4. PostgreSQL RLS enforces row visibility and mutation restrictions using that identity.
  - **Documented Limitation**: A compromised application database role capable of executing arbitrary SQL could set an arbitrary custom session claim. Therefore, RLS acts as **defense-in-depth** against normal application query mistakes, ORM filtering bugs, and accidental cross-tenant queries, not as absolute containment against arbitrary SQL execution by a compromised application role.
  - To preserve this boundary, Codevo maintains: strict parameterized queries (zero raw SQL interpolation), strict authentication prior to any database call, no arbitrary query endpoints, least-privilege role permissions, transaction-scoped claim assignment (`SET LOCAL`), connection-pool isolation tests, and strict table-level isolation between `codevo_bff_role` and `codevo_api_role`.
- **Transaction-Scoped User Claims (`SET LOCAL`)**:
  - Using `true` in `set_config` bounds the setting strictly to the active transaction (`SET LOCAL`).
  - Upon `COMMIT` or `ROLLBACK`, PostgreSQL automatically purges the setting, preventing tenant context from bleeding across pooled database connections.

### 9.4 Envelope Encryption & KMS Architecture
- **Primary Selection: Application-Managed AES-256-GCM with External KMS**:
  - **Trust Boundary**: The database engine stores only opaque ciphertexts and wrapped keys. Plaintext secrets, master encryption keys (KEKs), and decryption authority are kept strictly outside the database. Even in the event of a full PostgreSQL dump or SQL injection, secrets cannot be decrypted without external KMS access and IAM credentials.
- **Envelope Encryption 6-Stage Lifecycle**:
  1. **Unique DEK Generation**: A fresh, high-entropy 256-bit Data Encryption Key (DEK) is generated for each individual credential record using a cryptographically secure random source: `secrets.token_bytes(32)`. DEKs are never reused across records.
  2. **Data Encryption (AES-256-GCM)**: The DEK encrypts the candidate's provider API key using AES-256-GCM with a unique 96-bit initialization vector (`key_iv = secrets.token_bytes(12)`). The Additional Authenticated Data (AAD) is bound to `f"codevo:cred:v1:{user_id}:{provider}"`. The operation produces `key_ciphertext` and the 128-bit authentication tag `key_tag`.
  3. **DEK Wrapping (KMS)**: The external KMS (AWS KMS, GCP Cloud KMS, HashiCorp Vault, or local development master key) wraps (encrypts) the plaintext DEK using the Key Encryption Key (KEK identified by `kms_key_id`), producing `wrapped_dek`.
  4. **Persistence**: Both the encrypted credential payload (`key_ciphertext`, `key_iv`, `key_tag`) and the wrapped key payload (`wrapped_dek`, `kms_key_id`, `key_version`, `key_hint`) are persisted to `private.user_provider_credentials`. The plaintext DEK is immediately discarded from memory. Plaintext DEKs and KEKs are never stored.
  5. **Decryption Flow**: When an AI request requires provider invocation:
     - FastAPI retrieves the record from `private.user_provider_credentials`.
     - FastAPI calls the external KMS to unwrap `wrapped_dek` using `kms_key_id`, recovering the ephemeral DEK.
     - FastAPI decrypts `key_ciphertext` using AES-256-GCM, verifying `key_tag` and the AAD binding.
     - Decryption failure (tampered ciphertext, swapped user, or mismatched tag) immediately halts processing.
  6. **KMS Key Rotation & DEK Re-Wrapping**:
     - When the master KMS KEK is rotated, existing records undergo background re-wrapping: the KMS unwraps `wrapped_dek` using the previous KEK and re-wraps the DEK using the new KEK (`kms_key_id`), incrementing `key_version`.
     - Re-wrapping updates only `wrapped_dek` and `kms_key_id` in PostgreSQL; the underlying provider API keys do not require re-encryption or candidate re-entry.
- **Plaintext Memory Lifetime Minimization**:
  - Acknowledge that the Python runtime does not guarantee immediate memory zeroization of immutable strings.
  - Plaintext key lifetime is strictly minimized: avoid caching decrypted keys, avoid intermediate string copies, decrypt strictly within the local async request handler scope, and release references immediately after HTTP request dispatch.

### 9.5 Credential Persistence, Foreign Key & Sanitized Error Storage
- **Final Normalized Credential Schema (`private.user_provider_credentials`)**:
  ```sql
  CREATE TABLE private.user_provider_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      provider VARCHAR(32) NOT NULL,
      key_ciphertext BYTEA NOT NULL,
      key_iv BYTEA NOT NULL,
      key_tag BYTEA NOT NULL,
      wrapped_dek BYTEA NOT NULL,
      kms_key_id VARCHAR(255) NOT NULL,
      key_version INTEGER NOT NULL DEFAULT 1,
      key_hint VARCHAR(16) NOT NULL,
      is_valid BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_tested_at TIMESTAMPTZ,
      last_test_status VARCHAR(16),
      last_test_error_code VARCHAR(64),
      last_test_error_message VARCHAR(255),
      CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
  );
  ```
- **Foreign Key Cascade**: Deleting a Supabase Auth user automatically cascades and deletes that user's encrypted provider credentials. PostgreSQL executes foreign key cascade operations under table owner privileges, requiring zero unnecessary permissions for `codevo_api_role` on `auth.users`.
- **Sanitized Error Fields**: Replaces raw error persistence with `last_test_error_code VARCHAR(64)` and `last_test_error_message VARCHAR(255)`. Never store raw provider response bodies, authorization headers, request bodies, or secret-bearing stack traces.

### 9.6 Endpoint & Operational Hardening
- HTTPS enforced outside local development (HSTS, TLS 1.3).
- Request-body logging is strictly disabled on all credential endpoints.
- APM, tracing, and exception middleware are configured with redaction filters to prevent capturing secret-bearing request bodies or headers.
- Rate limiting: Max 5 connection tests per minute per user; max 20 AI streaming requests per minute per user.
- Response headers: `Cache-Control: no-store` applied to all credential and AI endpoints.
- Input validation: Provider allowlisting (8 approved providers only); strict API key size limits (max 512 bytes).
- Outbound requests use trusted, server-configured base URLs only. Never accept arbitrary base URLs from frontend.
- Credential replacement and deletion are executed within atomic database transactions.

## 10. Deployment Direction & Production Infrastructure Status
- **Current Development Baseline**: Proposed local development baseline; service setup and verification pending implementation. Only mark services as verified after actual execution and test evidence exist. (Application source code and backend services remain unstarted pending explicit authorization).
- **Target Deployment Infrastructure Options (Pending Provider Selection)**:
  - Production infrastructure components—including Cloudflare WAF, internal VPC, private container networking / service mesh, dedicated KMS (AWS KMS, GCP KMS, Vault), and private database subnets—are identified as **target deployment requirements and architecture options**.
  - Final provider selection (e.g. AWS ECS/Fargate, GCP Cloud Run, Supabase Managed Cloud, Railway, Fly.io) will occur after reviewing commercial terms, latency, security certifications, regional data boundaries, and free-tier/operating costs.
  - **Invariant**: Unprovisioned or planned infrastructure must never be represented as already deployed, verified, or operational until explicitly provisioned and validated with live deployment verification tests.
  - Public candidate code execution must run on a hardened, dedicated microVM or sandbox execution tier (Phase 5).
