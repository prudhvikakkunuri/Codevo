"""Security tests for user submission isolation, ownership authorization, and anti-IDOR controls."""

import uuid
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.auth.dependencies import get_current_user
from app.core.auth.models import AuthenticatedUser


USER_A_ID = uuid.UUID("11111111-1111-4111-a111-111111111111")
USER_B_ID = uuid.UUID("22222222-2222-4222-a222-222222222222")
NEW_USER_ID = uuid.UUID("33333333-3333-4333-a333-333333333333")

user_a = AuthenticatedUser(id=USER_A_ID, role="authenticated", email="user_a@example.com")
user_b = AuthenticatedUser(id=USER_B_ID, role="authenticated", email="user_b@example.com")
new_user = AuthenticatedUser(id=NEW_USER_ID, role="authenticated", email="new_user@example.com")


@pytest.mark.asyncio
async def test_unauthenticated_user_cannot_access_submissions(app: FastAPI):
    """Unauthenticated request to /submissions and /submissions/{id} must return 401 Unauthorized."""
    app.dependency_overrides.pop(get_current_user, None)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_list = await client.get("/api/v1/submissions")
        assert res_list.status_code == 401
        assert "Bearer" in res_list.headers.get("www-authenticate", "")

        res_item = await client.get("/api/v1/submissions/sub-any-id-12345")
        assert res_item.status_code == 401


@pytest.mark.asyncio
async def test_new_user_sees_empty_history(app: FastAPI):
    """A newly registered user with no submissions receives an empty submissions array, never dev fixtures."""
    app.dependency_overrides[get_current_user] = lambda: new_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/submissions")
        assert res.status_code == 200
        data = res.json()
        assert "submissions" in data
        assert data["submissions"] == [], "New user must receive an empty history list"
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_user_data_isolation_and_anti_idor(app: FastAPI):
    """Verify that User A sees only their submissions, User B cannot see User A's submissions, and User B cannot fetch User A's report."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. User A submits an interview solution
        app.dependency_overrides[get_current_user] = lambda: user_a
        session_a = f"ci-001-{USER_A_ID}"

        init_res = await client.post(f"/api/v1/workspace/{session_a}/init?force_reset=true")
        assert init_res.status_code == 200

        sub_res = await client.post(f"/api/v1/workspace/{session_a}/submit")
        assert sub_res.status_code == 200
        sub_data = sub_res.json()
        sub_a_id = sub_data["submission_id"]
        assert sub_a_id.startswith("sub-")

        # 2. User A retrieves their own submission report (200 OK)
        rep_res_a = await client.get(f"/api/v1/submissions/{sub_a_id}")
        assert rep_res_a.status_code == 200
        assert rep_res_a.json()["submissionId"] == sub_a_id
        assert rep_res_a.json()["userId"] == str(USER_A_ID)

        # 3. User A views their history: contains sub_a_id
        hist_a = await client.get("/api/v1/submissions")
        assert hist_a.status_code == 200
        subs_a = hist_a.json()["submissions"]
        assert any(s["submissionId"] == sub_a_id for s in subs_a)

        # 4. User B checks their history: must NOT contain User A's submission
        app.dependency_overrides[get_current_user] = lambda: user_b
        hist_b = await client.get("/api/v1/submissions")
        assert hist_b.status_code == 200
        subs_b = hist_b.json()["submissions"]
        assert not any(s["submissionId"] == sub_a_id for s in subs_b), "User B must never see User A's submission in history"

        # 5. User B attempts IDOR to fetch User A's report by changing submissionId in URL: must return 403 Forbidden
        rep_res_b = await client.get(f"/api/v1/submissions/{sub_a_id}")
        assert rep_res_b.status_code == 403, "User B must receive 403 Forbidden when attempting to retrieve User A's report"
        err_msg = rep_res_b.json().get("error", {}).get("message", "") or rep_res_b.json().get("detail", "")
        assert "permission" in err_msg.lower()

        # 6. User B cannot submit User A's workspace session
        hijack_res = await client.post(f"/api/v1/workspace/{session_a}/submit")
        assert hijack_res.status_code == 403, "User B cannot submit User A's session"

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_development_fixtures_not_returned_to_registered_users(app: FastAPI):
    """Existing test/dev submissions without a userId are never returned to normal users."""
    app.dependency_overrides[get_current_user] = lambda: user_b
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/submissions")
        assert res.status_code == 200
        for sub in res.json()["submissions"]:
            assert sub.get("userId") == str(USER_B_ID), "Every returned submission must match the authenticated user"
            assert sub.get("sessionId") != "ci-001-demo", "Shared demo session must never appear in normal user history"

    app.dependency_overrides.pop(get_current_user, None)
