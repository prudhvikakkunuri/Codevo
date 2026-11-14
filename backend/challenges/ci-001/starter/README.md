# Authentication Service (CI-001)

## Overview
This service handles candidate registration and user credential verification.

## Instructions
1. Inspect the implementation in `app/services/authentication.py` and `app/utils/security.py`.
2. Fix registration duplicate email verification (should raise HTTP 409 Conflict).
3. Ensure Argon2id password verification correctly checks hashes and returns True for valid passwords.
4. Sanitize error responses so internal database/traceback details are not leaked.
5. Run `pytest` in the terminal to verify the test suite.

