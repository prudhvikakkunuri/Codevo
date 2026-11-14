# Codevo Backend API Service

FastAPI-powered backend service for the Codevo technical interview platform.

## Architecture & Responsibilities
- **Framework**: Python 3.12+ with FastAPI and Pydantic v2.
- **Role**: Authoritative execution coordinator, workspace manager, secure BYOK AI provider gateway, and test runner dispatcher.
- **Current Milestone**: Milestone 1.9.1 — Increment B: Supabase Authentication (Asymmetric JWT / JWKS Verification).

## Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application factory & lifespan setup
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py     # Aggregated v1 routing (/health, /auth)
│   │       └── routes/
│   │           ├── __init__.py
│   │           ├── auth.py   # Demonstration auth endpoints (/auth/me)
│   │           └── health.py # Liveness and readiness probes
│   └── core/
│       ├── __init__.py
│       ├── auth/
│       │   ├── __init__.py
│       │   ├── dependencies.py # get_current_user FastAPI dependency
│       │   ├── exceptions.py   # Auth, JWT, and JWKS exception hierarchy
│       │   ├── jwks.py         # Asymmetric JWKS provider & cache manager
│       │   ├── models.py       # AuthenticatedUser and AuthMeResponse models
│       │   └── verifier.py     # Cryptographic ES256/RS256 JWT verifier
│       ├── config.py         # Centralized typed settings via pydantic-settings
│       ├── errors.py         # Structured error handlers (zero leakage)
│       └── logging.py        # Safe logging configuration
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures, offline key generators, test clients
│   ├── test_auth_endpoint.py# /api/v1/auth/me integration tests
│   ├── test_auth_jwks.py    # JWKS caching, rotation, and failure mode tests
│   ├── test_auth_jwt.py     # Cryptographic token verification & claim tests
│   ├── test_config.py       # Configuration and production validation tests
│   └── test_health.py       # Health probe and CORS verification tests
├── pyproject.toml
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Supabase Authentication & JWKS Verification

### Configuration
Configure the following in your `.env` (or deployment environment):
- `SUPABASE_URL`: Fully-qualified Supabase project URL (e.g. `https://<project-ref>.supabase.co`).
  - Production requires `https://`.
  - Local Supabase CLI development permits loopback `http://localhost:54321` or `http://127.0.0.1:54321`.
- `SUPABASE_JWKS_CACHE_TTL_SECONDS`: Public key cache time-to-live (default: `600` seconds / 10 minutes).
- `SUPABASE_JWKS_TIMEOUT_SECONDS`: Connection and read timeout for JWKS requests (default: `5.0` seconds).

### Derived Endpoints
The backend deterministically derives all endpoint paths from the trusted server configuration:
- **Issuer (`iss`)**: `{SUPABASE_URL}/auth/v1`
- **JWKS Endpoint**: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- **Expected Audience (`aud`)**: `authenticated`

### Cryptographic Invariants
- **Permitted Signing Algorithms**: `ES256` and `RS256` only.
- **Why HS256 is Deliberately Prohibited**: Symmetric `HS256` requires sharing the project's master JWT signing secret across all backend microservices. If exposed, any service can forge arbitrary user tokens. Asymmetric verification allows FastAPI to verify signatures using public JWKs without ever possessing the private signing key.
- **Key Rotation**: When a token carries an un-cached `kid`, the provider performs at most one controlled JWKS refresh (subject to a cooldown rate limiter to prevent DoS attacks). If the key is still missing, the request fails with HTTP 401.
- **Fail-Closed Semantics**: If the JWKS endpoint is unreachable or times out, the backend returns HTTP 503 (`Retry-After: 10`) rather than misattributing the failure to invalid user credentials.

## Local Development Setup

### 1. Virtual Environment & Dependencies
```bash
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Run the Development Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Verify Endpoints
- **Liveness**: `curl http://127.0.0.1:8000/api/v1/health/live`
- **Readiness**: `curl http://127.0.0.1:8000/api/v1/health/ready`
- **Demonstration Auth Endpoint**:
  ```bash
  curl -H "Authorization: Bearer <valid-supabase-access-token>" http://127.0.0.1:8000/api/v1/auth/me
  ```
  Expected Response:
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "role": "authenticated"
  }
  ```

### 4. Run Automated Tests
All 60 tests execute offline without contacting live Supabase services:
```bash
pytest -v
```

## What Remains Unimplemented
- Next.js Backend-for-Frontend (BFF) session cookies and CSRF protection (Increment C).
- PostgreSQL database schemas, migration runners, and Row-Level Security policies (Increment D).
- Candidate BYOK AI credentials and envelope encryption (Increment E).
- AI provider integrations, agent orchestrators, and execution sandboxes.
