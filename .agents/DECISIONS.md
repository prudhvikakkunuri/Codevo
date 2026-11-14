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

### D-012 — Evaluation Architecture & Candidate BYOK Scope
- Date: 2026-11-12
- Decision: Automated public and hidden tests with deterministic scoring are the primary evaluation mechanism. Candidate BYOK credentials power the interactive interview assistant only and are not required or consumed for platform-side evaluation.
- Context: Clarifying candidate inference costs vs platform scoring costs to maintain a predictable ₹0 local development and evaluation model.
- Alternatives: Requiring candidate API keys to evaluate their own submissions (rejected: creates security, reliability, and cost-attribution friction).
- Status: Accepted.

### D-013 — Frontend Architecture & Layout
- Date: 2026-11-12
- Decision: Next.js App Router project initialized within the `frontend/` directory using TypeScript, Tailwind CSS v4 with `@tailwindcss/postcss`, shadcn/ui components, and Lucide icons.
- Context: Keeps the repository modular, preserving a dedicated space for future backend (`backend/`) and execution services while standardizing on modern Tailwind v4.
- Alternatives: Initializing Next.js at repository root (rejected to avoid file clutter when introducing Python backend and Docker tooling).
- Status: Accepted.

### D-014 — Backend-Only BYOK Credential Storage & Execution
- Date: 2026-11-14
- Decision: All candidate-provided AI provider API keys (OpenAI, Anthropic, DeepSeek, Gemini, Groq, Cerebras, Sarvam, OpenRouter) must be stored and used exclusively on the backend. Client-side browser storage (in-memory or sessionStorage) and direct browser-to-provider API calls are completely prohibited.
- Context: Browser-side storage exposes candidates' personal API keys to client-side memory extraction, DevTools inspection, malicious extensions, and unauthorized network capture. Direct provider calls from the browser bypass backend audit logs and rate-limiting controls.
- Architecture:
  1. Frontend sends credentials over authenticated TLS to backend API endpoints (`/api/v1/me/provider-credentials/{provider}`).
  2. Backend stores credentials using envelope encryption (AES-256-GCM) with root encryption keys managed outside the application database (e.g., AWS KMS / GCP Cloud KMS / Vault). Key versioning is enforced.
  3. Strict row-level / user ownership checks ensure candidates can only manage their own credentials.
  4. Decrypted keys exist solely in backend ephemeral memory for the duration of the outbound provider call.
  5. The backend streams responses to the frontend via Server-Sent Events (SSE).
  6. The frontend receives only masked metadata (status, hint, last tested), never plaintext keys.
- Alternatives:
  - Browser in-memory + optional sessionStorage BYOK (rejected: violates zero-credential-leakage security invariant).
  - Web Workers / IndexedDB with Web Crypto (rejected: keys remain vulnerable to client-side extraction and malicious browser extensions).
- Status: Accepted.

### D-015 — Real Authentication, Dual Database Roles, RLS Isolation, and Envelope Encryption Strategy
- Date: 2026-11-14
- Decision:
  1. **Authentication**: Bring real Supabase Auth forward into Substep 1.9.1. FastAPI verifies Supabase JWTs dynamically via the JWKS endpoint (`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` in production, `http://localhost:54321/auth/v1/.well-known/jwks.json` locally), matching `kid` and enforcing an explicit algorithm allowlist (`["ES256", "RS256"]`). Validate signature, issuer, audience, expiry, and subject (`sub`). Isolated local HS256 handling is strictly confined to development/testing and fails closed in production.
  2. **Dual Database Roles & Mutual Quarantine**: Establish two dedicated, least-privilege database roles:
     - `codevo_bff_role` (Next.js BFF): Granted `USAGE ON SCHEMA private`; `SELECT, INSERT, UPDATE, DELETE ON private.sessions`. Quarantined from `private.user_provider_credentials` (revoked).
     - `codevo_api_role` (FastAPI): Granted `USAGE ON SCHEMA private`; `SELECT, INSERT, UPDATE, DELETE ON private.user_provider_credentials`. Quarantined from `private.sessions` (revoked).
     - Both roles explicitly configured with `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`. Passwords provisioned through environment secrets, never embedded in migration files.
     - Schema `private` excluded from PostgREST Data API, with `anon`/`authenticated`/`public` permissions revoked.
  3. **Permissive RLS Policy Architecture & Testing**: Define the core ownership RLS policy as `AS PERMISSIVE` with `user_id` equality checks in both `USING` and `WITH CHECK`. (PostgreSQL requires at least one applicable permissive policy; restrictive alone results in default denial). Restrictive policies are reserved only for independently justified additional constraints on columns within the application schema. The `codevo_api_role` does not have access to `auth.users`, and policies must never query `auth.users` directly. Enforce `FORCE ROW LEVEL SECURITY`. RLS validity requires passing automated SQL test suites under `codevo_api_role` verifying `SELECT`, `INSERT`, `UPDATE`, and `DELETE` for authorized users (all succeed), unauthorized users (SELECT 0 rows, INSERT check_violation, UPDATE/DELETE 0 rows), and unauthenticated callers (fail closed).
  4. **RLS Trust Boundary Realism**: Explicitly document that PostgreSQL trusts the session claim set by FastAPI (`SET LOCAL request.jwt.claim.sub = :user_id`). RLS provides defense-in-depth against application query bugs, accidental cross-tenant queries, and ORM leakage, not absolute containment if the application role itself is compromised to execute arbitrary SQL. Maintain parameterized queries, least-privilege role permissions, and connection-pool isolation.
  5. **Envelope Encryption Lifecycle (AES-256-GCM + External KMS)**:
     - Generate a fresh, unique 256-bit DEK per credential record (`secrets.token_bytes(32)`).
     - DEK encrypts candidate provider API key using AES-256-GCM with unique 96-bit IV and AAD `f"codevo:cred:v1:{user_id}:{provider}"`.
     - External KMS wraps (encrypts) the DEK using the KEK (`kms_key_id`).
     - Persist `key_ciphertext`, `key_iv`, `key_tag`, `wrapped_dek`, `kms_key_id`, and `key_version`. Plaintext DEKs and KEKs are never stored.
     - Decryption retrieves row, calls KMS to unwrap `wrapped_dek`, and decrypts `key_ciphertext` with tag/AAD validation.
     - KMS KEK rotation unwraps and re-wraps `wrapped_dek` under new KEK without re-encrypting the underlying secret.
  6. **Plaintext Lifetime & Sanitized Errors**: Acknowledge Python memory constraints. Minimize plaintext key lifetime, avoid caching decrypted keys, avoid unnecessary copies, and release references immediately after request dispatch. Persist only sanitized error codes and messages (`last_test_error_code`, `last_test_error_message`), never raw provider error bodies or authorization headers.
- Context: Addresses security review findings on asymmetric key rotation, dedicated database roles, PostgREST API exclusion, RLS connection pooling, and credential protection.
- Alternatives:
  - Supabase Vault (evaluated: database extension holds decryption authority; database dump or SQL injection could access decrypted secrets; rejected in favor of external KMS isolation).
  - Privileged service_role connection without RLS (rejected: bypasses database-level tenant isolation).
  - Single shared database role for BFF and API (rejected: violates least privilege; BFF must not access candidate AI keys, and API must not access raw session tokens).
  - Hardcoded RS256 algorithm (resolved: JWKS with `kid` matching and `["ES256", "RS256"]` allowlist).
  - Restrictive-only RLS policy (rejected: PostgreSQL default-denies access without an applicable permissive policy).
- Status: Accepted.

### D-016 — Platform-Wide Backend-for-Frontend (BFF) Session Architecture, PostgreSQL Session Store & Zero-Browser-Credential Invariant
- Date: 2026-11-14
- Decision:
  1. **Core Principle**: The frontend must never act as a security authority. All authentication, authorization, identity verification, session validation, and permission enforcement are performed strictly server-side.
  2. **Chosen Session Store: PostgreSQL-Backed (`private.sessions`)**:
     - Implement a robust database-backed session store in PostgreSQL rather than introducing Redis prematurely.
     - Dedicated database role `codevo_bff_role` owns session access; quarantined from provider credentials.
     - High-entropy opaque session cookies (32 random bytes, Base64URL, 256 bits entropy) issued as `__Host-codevo_session` (`HttpOnly`, `Secure`, `SameSite=Lax`).
     - Store strictly a SHA-256 hash (`session_id_hash`), preventing stolen database dumps from yielding valid session cookies.
     - Session lookup queries by `session_id_hash`; user identity is derived strictly from server-side decrypted session records, never from frontend-supplied parameters.
     - Expiration: Absolute ceiling of 7 days; sliding idle timeout of 24 hours.
     - Refresh-token rotation: When access token expires within 60s, Next.js executes an atomic lock/update to refresh tokens via Supabase Auth server-to-server, handling concurrent requests safely.
     - Revocation & Logout: `POST /api/auth/logout` deletes the session row, calls Supabase `signOut`, and sets cookie `Max-Age=0`. Security events (password reset, account suspension) purge all user sessions: `DELETE FROM private.sessions WHERE user_id = :user_id`.
     - Multi-instance consistency: Guaranteed across all scaled Next.js instances by PostgreSQL persistence.
     - Expired sessions cleaned up via scheduled cron / pg_cron.
  3. **Session Encryption Key Management**:
     - Key material is completely separate from provider credential encryption keys (KEKs/DEKs).
     - Keys are managed via AWS Secrets Manager / GCP Secret Manager / Vault (local dev baseline: `CODEVO_SESSION_SECRET_V1` in secure local env).
     - Tokens are encrypted at rest with AES-256-GCM using unique IVs and authentication tags, tracked by `session_key_version`.
     - Key rotation without mass session invalidation: Next.js maintains a versioned Keyring map (`current: 2`, `supported: [2, 1]`). Writes use `current`; reads support prior versions. Active sessions seamlessly re-encrypt under `version 2` upon token refresh.
     - Retired keys are retained for the 7-day absolute session window before decommissioning.
     - Failure handling: If a session row presents an unknown or unretrievable `session_key_version`, fail closed: log an audit alert, delete the session row, and return `401 Unauthorized`.
     - Invariant: Never store plaintext session encryption keys in PostgreSQL or expose them to browser JavaScript.
  4. **Service-to-Service Authentication (Next.js BFF ↔ FastAPI)**:
     - Distinguish Service Identity from Candidate User Identity as two independent security checks.
     - Service Identity: Authenticated via mTLS or cloud workload identity in production (internal service key header `X-Internal-Service-Key` in local/container dev).
     - User Identity: Next.js retrieves decrypted Supabase JWT from `private.sessions` and forwards it as `Authorization: Bearer <SUPABASE_JWT>`.
     - Strict Invariant: Next.js BFF must strip any browser-supplied `Authorization` header and construct the backend authorization header exclusively from the validated database session. FastAPI independently verifies the Supabase JWT via JWKS and never trusts forwarded user/role headers.
     - Direct public browser ingress to protected FastAPI endpoints is quarantined.
  5. **Accurate Browser Credential-Handling Policy**: Passwords and API keys necessarily exist transiently in component memory while the candidate enters and submits them in form inputs. No persistent storage is permitted in `localStorage`, `sessionStorage`, or `IndexedDB`. Sensitive form values must be cleared from state immediately upon successful network submission. No unnecessary JavaScript state copies; zero secret logging, analytics capture, URL query exposure, or error-report capture. AI provider API keys are sent once to the backend for encrypted storage and are never returned to the browser after submission (only masked metadata `sk-...1234` is returned).
  6. **Authorization & Deny-by-Default**: Every protected operation (profile, interview sessions, submissions, workspace documents, credentials, AI operations) requires server-side ownership and permission checks. Client-supplied `user_id`, roles, or permission claims are never trusted.
  7. **Safe Profiles**: User profile endpoints return only safe display fields (display name, avatar URL, verified email, account status), explicitly excluding sensitive secrets and tokens.
- Context: Elevates the backend-only BYOK security model into a mandatory platform-wide standard across all user credentials, sessions, and protected resources.
- Alternatives:
  - Client-side Supabase client with tokens stored in localStorage (rejected: vulnerable to XSS and token exfiltration).
  - Passing JWTs via custom headers from client JS (rejected: requires JavaScript access to the token).
  - Redis session store (deferred: PostgreSQL database session store provides immediate multi-instance consistency without extra operational infrastructure).
- Status: Accepted.

### D-017 — Platform-Wide Application Security Baseline (OWASP Top 10:2025 & ASVS 5.0.0)
- Date: 2026-11-14
- Decision: Adopt OWASP Top 10:2025 as the application risk coverage baseline and OWASP ASVS 5.0.0 as the technical verification reference across the entire Codevo stack.
  1. **Cross-Site Scripting (XSS) & Cryptographic CSP Nonces**: Prohibit `dangerouslySetInnerHTML` unless strictly sanitized via an approved DOMPurify pipeline. Implement restrictive Content Security Policy (CSP) with nonces providing at least 128 bits of random entropy (16 random bytes, Base64-encoded), generated fresh per response by middleware and propagated via `x-nonce` request header to Next.js `<Script nonce={...}>`. HTML responses enforce `Cache-Control: private, no-store, no-cache, must-revalidate` to prevent accidental caching or reuse of nonces. Verification status: Proposed CSP architecture and compatibility target — implementation and browser verification pending.
  2. **Monaco `style-src 'unsafe-inline'` Status**: Classified as a *proposed residual risk awaiting explicit approval* by the Lead Architect and Security Officer before production, NOT an already accepted risk. Documented reasons: dynamic Monaco token/theme DOM styling; security limitations; evaluation of narrower policies; detection via CSP reporting and Playwright tests; formal approval gate.
  3. **Cross-Site Request Forgery (CSRF)**: Pair `SameSite=Lax` cookies with anti-CSRF synchronizer tokens (`X-CSRF-Token`) and strict Origin / Referer fallback verification on all state-changing endpoints (`POST`, `PUT`, `DELETE`, `PATCH`). Protect credential updates/deletions, account settings, logout, and submission. Issue pre-flight CSRF tokens and enforce session regeneration on login to defend against login CSRF. Verify via automated tests rejecting cross-origin forms and malicious fetch requests.
  4. **Cross-Origin Resource Sharing (CORS)**: Strict origin allowlist matching deployed Codevo frontends; zero wildcards on credentialed endpoints; no arbitrary origin reflection. CORS is treated as a browser sharing directive, never an authorization boundary.
  5. **Broken Access Control (IDOR/BOLA)**: Strict server-side resource ownership verification on every read, write, delete, and AI operation. Deny-by-default.
  6. **Injection Defenses (SQLi, Command, Path Traversal)**: Strict parameterized SQL via SQLAlchemy under `codevo_api_role`; zero untrusted shell string interpolation (safe argument arrays only); canonicalized workspace path sandboxing.
  7. **Server-Side Request Forgery (SSRF)**: All outbound AI provider requests restricted to hardcoded server-side base URLs. Block all private IPv4 (`10/8`, `172.16/12`, `192.168/16`), loopback (`127/8`), link-local/cloud metadata (`169.254/16`), IPv6 loopback (`::1`), link-local (`fe80::/10`), unique-local (`fc00::/7`), and IPv4-mapped IPv6 (`::ffff:*`). Enforce DNS rebinding validation and redirect validation.
  8. **AI Agent & Prompt Security**: Treat user prompts, workspace files, and model outputs as untrusted. Enforce tool permission boundaries and iteration limits server-side. Enforce submission immutability.
  9. **Target Deployment Infrastructure Options & Verification Status**: Cloudflare WAF, internal VPC, service mesh, and private database subnets are target deployment requirements or architecture options pending final hosting provider selection. Proposed local development baseline; service setup and verification pending implementation. Unprovisioned infrastructure must not be represented as deployed or verified.
  10. **Security Acceptance**: A 12-point release criteria matrix must be verified prior to production launch. Do not claim the system is vulnerability-free.
- Context: Establishes a permanent, comprehensive security baseline across the entire platform lifecycle.
- Status: Accepted.

### D-018 — Strategic Development Shift: Prototype First, Complete Product Second
- Date: 2026-11-14
- Decision:
  1. **Strategic Pivot**: Prioritize building a functional, demonstrable prototype (Milestone 1.9) proving the core value proposition: an AI Agent that inspects an existing repository, modifies code, runs tests in isolation, analyzes failures, and autonomously iterates toward a fix.
  2. **Prototype Scope**: Focus initial end-to-end integration on one challenge (`CI-001` FastAPI Auth), one primary language (Python), and one verified cloud AI provider (e.g. OpenAI GPT-4o or Anthropic Claude Sonnet) with reliable tool calling and SSE streaming. Keep the architecture extensible for all 8 approved providers.
  3. **Autonomous In-Scope Edits**: The Agent is authorized to autonomously apply ordinary in-scope code edits within challenge files without requiring candidate approval on every edit. Candidate confirmation or hard rejection remains mandatory for destructive actions, out-of-scope edits, package installation, shell commands, network access, or credentials.
  4. **Real Isolated Code Execution**: Implement a dedicated runner service running non-root with strict resource quotas, workspace mounts, network egress disabled, and predefined commands (`["pytest", "-q"]`). Genuine stdout, stderr, and exit codes are returned for agent failure diagnosis. A local-only sandbox is used for initial demonstration; plain Docker is not treated as sufficient public multi-tenant isolation; public execution remains disabled until independent kernel isolation (gVisor/Firecracker) validation.
  5. **Post-Prototype Product Expansion**: Following prototype verification (Milestone 1.9.5), product development systematically resumes across independent milestones: full authentication/profiles, remaining 7 AI providers, remaining challenge catalogue (`CI-002` to `CI-005`), additional languages, authoritative timer engine, evaluation with hidden tests, results history, and hardened microVM infrastructure.
  6. **Security Invariants**: All security foundations (BFF session architecture, dual database roles, envelope encryption, RLS, CSRF, CSP, SSRF, submission lock) remain mandatory and active from the beginning.
- Context: Accelerates delivering a working, portfolio-ready product showcase for developer walkthroughs and open-source GitHub demonstration while preventing architectural compromises.
- Alternatives:
  - Building all features simultaneously before first end-to-end integration (rejected: delays demonstrable progress, compounds debugging complexity).
  - Simulated inference or mock test execution (rejected: violates zero-simulation core value proposition).
- Status: Accepted.

### D-019 — Canonical Workspace Ownership, Concurrency Control, and Trusted Test Isolation
- Date: 2026-11-14
- Decision:
  1. **Canonical Workspace Authority**: FastAPI owns the canonical state and integer revisions (`revision: int`) of all workspace files. The Next.js frontend acts as a presentation and editing layer.
  2. **Revision-Aware Client Sync**: Candidate Monaco changes synchronize via debounced updates (`PUT /api/v1/workspaces/{session_id}/files/{file_path}`) passing `{content, base_revision}`. Optimistic concurrency checks reject stale revisions with `409 Conflict`.
  3. **Atomic Multi-File Agent Changes**: Applied atomically by the server-side `ChangeSetCoordinator`. Committed changes broadcast over SSE and apply cleanly to Monaco using `applyEdits` to preserve cursor, selection, and scroll positions.
  4. **Concurrency & Conflict Strategy**: If the candidate has uncommitted local keystrokes when an Agent commit arrives, optimistic backend checks or client UI guardrails prevent silent overwriting and prompt the candidate (`[Accept Agent Edits] [Keep My Changes] [View Diff]`).
  5. **Trusted Test Suite Isolation**: In `CI-001` (and all challenges), application files are writable, but trusted tests (`tests/test_auth.py`, `pytest.ini`, `conftest.py`) are mounted strictly read-only (`:ro`). The runner controls execution commands (`pytest`). Agent `edit_file` tool rejects changes to test files (`403 Forbidden`).
  6. **Versioned `CI-001` Package**: Pinned package `ci-001-fastapi-auth:v1.0.0` with known defects (plaintext password, duplicate email, 500 on invalid login), 5 official test assertions (3 passing, 2 failing), pinned Python 3.12 dependencies, and resource limits.
- Context: Ensures single source of truth for workspace state, eliminates race conditions between candidate typing and autonomous Agent modifications, and prevents candidates or Agents from tampering with test suites to manufacture false passes.
- Alternatives:
  - Frontend-authoritative workspace (rejected: AI Agent runs in FastAPI and requires direct canonical file access).
  - Writable test suites in sandbox (rejected: allows candidates/Agents to delete or weaken test assertions).
- Status: Accepted.

## New decision template
### D-XXX — Short title
- Date:
- Decision:
- Context:
- Alternatives:
- Consequences:
- Status: Proposed / Accepted / Superseded
