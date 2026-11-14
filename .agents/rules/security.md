---
trigger: model_decision
description: "Apply when handling authentication, API keys, user data, agent tools, terminal commands, code execution, hidden tests, or evaluation infrastructure."
---

# Codevo security rules — Platform-Wide Application Security Policy

Adopt OWASP Top 10:2025 as the application risk coverage baseline and OWASP ASVS 5.0.0 as the technical verification reference across all components.

## 1. Core Trust Boundaries
- The frontend must never act as a security authority. All authentication, authorization, identity verification, session validation, and permission enforcement execute strictly server-side.
- Treat candidate code, repositories, terminal input, user messages, uploaded files, and model-generated content as untrusted.
- Enforce deny-by-default server-side authorization on every endpoint and resource. Never trust client-supplied `user_id`, roles, or ownership claims.

## 2. Credentials, Session Security & Browser Storage Invariants
- **Accurate Browser Credential Lifecycle**:
  - Passwords and candidate AI provider API keys necessarily exist transiently in browser memory while the candidate enters and submits them in form inputs.
  - No persistent credential or token storage: Never persist passwords, password hashes, JWT access/refresh tokens, auth secrets, AI provider API keys, database credentials, or encryption keys in `localStorage`, `sessionStorage`, `IndexedDB`, client state caches, URLs, or browser logs.
  - No unnecessary JavaScript state copies: Avoid duplicating raw credentials into global application state (e.g. Zustand, Redux), window properties, or component lifecycle histories.
  - Immediate state clearance: Form input state containing raw secrets must be cleared immediately upon successful network submission.
  - Zero secret leakage: Never expose credentials in client-side error boundaries, telemetry, analytics capture, URL query parameters, or crash reporting.
  - Server-side tokens: JWT access tokens and refresh tokens remain strictly server-side. The browser receives only an opaque `HttpOnly` session cookie (`__Host-codevo_session` in production, `codevo_session` locally).
  - One-way key submission: AI provider API keys are transmitted over HTTPS to the backend for encrypted storage and are never returned to the browser after submission (the client receives only masked metadata, e.g. `sk-...1234`).
  - Workspace buffer boundary: Non-sensitive demo workspace document buffers (`codevo:workspace:v1:*`) in local development are permitted for editor offline resilience, but must never contain secrets.
- **BFF CSRF Protection, PostgreSQL Session Store & Service Authentication**:
  - The browser interacts exclusively with Next.js BFF via same-origin requests; browser receives only an opaque `__Host-codevo_session` HttpOnly cookie with `SameSite=Lax` (or `Strict`), `Secure`, `Path=/`.
  - **Database-Backed Session Store (`private.sessions`)**: Server-side sessions are persisted in PostgreSQL under dedicated role `codevo_bff_role` (`LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`). Browser cookie tokens (32 random bytes, Base64URL) are hashed with SHA-256 (`session_id_hash`) before storage; raw tokens are never persisted in the database. Supabase access and refresh tokens are stored encrypted at rest via AES-256-GCM.
  - **Session Key Management**: Session encryption keys are independent of provider credential keys, managed via KMS / secret manager with `session_key_version`. Key rotation uses a versioned keyring without mass session invalidation; retired keys are retained for the 7-day session window.
  - **Service-to-Service Authentication (Next.js BFF ↔ FastAPI)**: Distinguish caller service identity (mTLS / internal workload identity / internal service key) from candidate user identity (`Authorization: Bearer <SUPABASE_JWT>`). Next.js BFF must strip any browser-supplied `Authorization` header and build the backend authorization request exclusively from the validated database session. FastAPI independently verifies the Supabase JWT via JWKS and never trusts forwarded user/role headers. Direct public browser ingress to protected FastAPI endpoints is quarantined.
  - State-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require explicit Origin validation against trusted origins.
  - Anti-CSRF defense: Pair SameSite cookies with a synchronizer CSRF token (`X-CSRF-Token`) or cryptographically bound double-submit cookie token.
  - Referer fallback validation: If the `Origin` header is absent, validate the `Referer` header; drop the request if neither is present or if the origin does not match.
  - CSRF coverage applies to: credential updates, credential deletion, account changes, logout (`POST /api/auth/logout`), and any other state-changing operation.
  - Login CSRF defense: Issue pre-flight CSRF tokens and enforce session regeneration on login to prevent session fixation and forced-login attacks.
  - Test coverage: Automated tests verify rejection of cross-origin form submissions (`<form method="POST">`) and malicious-origin `fetch()` calls.
- **CORS Boundary**: Configure CORS strictly for genuinely required cross-origin access; never treat CORS as an authorization or API-access-control mechanism.
- **CSP Nonce Generation & Proposed Residual Risk Status**:
  - CSP nonces must be generated per response using a cryptographically secure source providing at least 128 bits of random entropy (16 random bytes encoded in Base64 via `crypto.getRandomValues(new Uint8Array(16))` or `crypto.randomBytes(16).toString('base64')`).
  - Next.js middleware passes the nonce to downstream server components via `x-nonce` request header, applying it to the `Content-Security-Policy` header and framework `<Script nonce={...}>` elements.
  - Response caching must explicitly enforce `Cache-Control: private, no-store, no-cache, must-revalidate` on HTML responses to prevent accidental caching or reuse of nonce-bearing HTML/headers across users or requests.
  - Enforce `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'`.
  - **Proposed Residual Risk Awaiting Explicit Approval**: Monaco Editor's `style-src 'unsafe-inline'` is classified as a *proposed residual risk awaiting explicit approval* by the Lead Architect and Security Officer before production, NOT an already accepted risk.
  - **CSP Verification Status**: Proposed CSP architecture and compatibility target — implementation and browser verification pending. (Never report verification as completed until actual code and test evidence exist).
- **SSRF Defense**: Block all private IPv4 (`10/8`, `172.16/12`, `192.168/16`), loopback (`127/8`), link-local/cloud metadata (`169.254/16`), IPv6 loopback (`::1`), link-local (`fe80::/10`), unique-local (`fc00::/7`), and IPv4-mapped IPv6 (`::ffff:*`). Enforce DNS rebinding validation, redirect validation, and proxy bypass prevention. Hardcode trusted provider base URLs.
- **Target Deployment Infrastructure Requirements**: Cloudflare WAF, internal VPC, service mesh, and private database subnets are target deployment requirements or architecture options pending final hosting provider selection. Proposed local development baseline; service setup and verification pending implementation. Unprovisioned infrastructure must not be represented as deployed or verified.
- **Dual Database Roles & PostgreSQL RLS Policy Architecture**:
  - Enforce role separation: `codevo_bff_role` (owns `private.sessions`, quarantined from credentials) vs `codevo_api_role` (owns `private.user_provider_credentials`, quarantined from sessions).
  - PostgreSQL requires at least one applicable `PERMISSIVE` policy to grant access. A `RESTRICTIVE` policy alone causes total denial.
  - The core user ownership policy must be defined as `AS PERMISSIVE` with `user_id` ownership checks in both `USING` and `WITH CHECK`.
  - Restrictive policies are added only when an independently justified additional constraint on columns within the application schema applies. `codevo_api_role` does not have access to `auth.users`, and policies must never query `auth.users` directly.
  - Policy behavior must be verified via actual executable SQL test suites under `codevo_api_role` testing SELECT, INSERT, UPDATE, and DELETE for authorized and unauthorized users before declaring RLS valid.
- **Testing & Verification**: Verify controls across Python backend security tests, Playwright browser E2E tests (XSS, CSRF, cookie flags, storage inspection, unauthorized navigation), and OWASP ZAP DAST scans.
- **Classification**: Every control must be classified as Documented architectural requirement, Implemented and verified, Planned for a future milestone, or Proposed residual risk awaiting explicit approval. Never claim a control is verified before its implementation exists.

## 3. Web Vulnerability Defenses (OWASP Top 10 / ASVS 5.0.0)
- **XSS**: Use React safe rendering; prohibit `dangerouslySetInnerHTML` unless strictly sanitized via an approved DOMPurify pipeline; validate URLs against dangerous schemes (`javascript:`, `data:`); implement strict CSP with nonces.
- **CSRF**: Enforce anti-CSRF tokens (`X-CSRF-Token`) and Origin/Referer verification on all state-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).
- **CORS**: Explicit allowlist of trusted Codevo frontend origins only; zero wildcard origins with credentials; no arbitrary origin reflection.
- **IDOR / BOLA**: Enforce server-side ownership checks across profiles, sessions, documents, submissions, assessment reports, provider keys, and AI chats.
- **SQL Injection**: Strict parameterized queries via SQLAlchemy; no string interpolation; restricted database privileges under `codevo_api_role` with PostgreSQL RLS.
- **Command Injection**: Zero untrusted shell interpolation; avoid `shell=True`; use safe subprocess argument arrays with strict server allowlists.
- **SSRF**: Outbound HTTP requests restricted to hardcoded server-side provider URLs; block localhost (`127.0.0.1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local, and cloud metadata (`169.254.169.254`).
- **Path Traversal**: Canonicalize all paths; reject `..`, absolute paths, drive letters, and control characters; scope file operations strictly to the candidate workspace directory.

## 4. Cryptographic & Sensitive Data Controls
- **Envelope Encryption Lifecycle (AES-256-GCM + External KMS)**:
  - Generate a unique 256-bit DEK per credential record (`secrets.token_bytes(32)`).
  - DEK encrypts candidate provider API key using AES-256-GCM with unique 96-bit IV and AAD `f"codevo:cred:v1:{user_id}:{provider}"`.
  - External KMS wraps (encrypts) the DEK using the KEK (`kms_key_id`).
  - Persist `key_ciphertext`, `key_iv`, `key_tag`, `wrapped_dek`, `kms_key_id`, and `key_version` in `private.user_provider_credentials`.
  - Plaintext DEKs and KEKs are never stored in database or persistent files.
  - Decryption retrieves row, calls KMS to unwrap `wrapped_dek`, and decrypts `key_ciphertext` with tag/AAD validation.
  - KMS KEK rotation unwraps and re-wraps `wrapped_dek` under new KEK without re-encrypting the underlying secret.
- Plaintext API keys must never be persisted to database or disk. Minimize in-memory plaintext lifetime; release references immediately after request dispatch.
- Never log authorization headers, API keys, refresh tokens, passwords, or raw provider response bodies.

## 5. AI Agent & Workspace Security
- Treat prompt content and model output as untrusted. Defend against indirect prompt injection.
- Prompt instructions cannot override server-side tool permissions.
- **Autonomous In-Scope Execution**: The Agent is permitted to autonomously inspect, plan, and apply ordinary in-scope code modifications within authorized challenge workspace files. Candidate approval is not required for standard in-scope code edits.
- **Mandatory Approval & Hard Rejection**: Explicit candidate confirmation or hard server-side rejection is strictly enforced for: destructive file operations, out-of-scope modifications, package installations (`pip`), arbitrary shell execution, external network access, and secret/credential access.
- Enforce token limits, tool iteration ceilings (max 5 loops per turn), execution timeouts, and cancellation.
- Enforce workspace submission lock: Submitted interview sessions become strictly immutable. Reject all AI tool executions, code modifications, or test executions on finalized sessions.

## 6. Execution & Supply Chain Safeguards
- **Host Isolation**: Never execute untrusted code directly on the FastAPI application host.
- **Dedicated Isolated Runner**: Candidate untrusted code executes in a dedicated, isolated execution sandbox as an unprivileged, non-root user.
- **Strict Resource Ceilings**: Enforce strict CPU limits (1.0 vCPU), memory limits (512 MB), process limits (64 pids), disk quotas, and wall-clock timeouts (30 seconds).
- **Network Isolation**: Execution sandboxes run with outbound network egress disabled by default (`--network none`).
- **Zero Credential Inheritance**: Sandboxes inherit zero API keys, environment secrets, host credentials, or Docker socket mounts.
- **Command Allowlists**: Execution is strictly restricted to server-predefined commands (`["pytest", "-q"]`). Arbitrary shell strings are rejected.
- **Public Multi-Tenant Boundary**: A local-only sandbox is used for the initial controlled prototype demonstration. Plain Docker alone is not treated as sufficient public multi-tenant isolation. Public multi-user execution remains strictly disabled until an independently validated microVM / kernel isolation boundary (e.g. gVisor, Firecracker) is verified.
- Audit all npm and Python dependencies using lockfiles and automated vulnerability scans.
- State security assumptions, test evidence, exclusions, and unverified boundaries honestly. Never claim the platform is vulnerability-free.
