# 05 — Authentication and Session Design

Backend uses JWT access/refresh authentication with refresh sessions stored durably in PostgreSQL.

## Frontend goals

Implement:
- register
- login
- session bootstrap
- refresh
- logout
- role detection
- protected routes

## Token strategy

Prefer the backend's existing security model. Do not invent a second auth protocol.

If refresh tokens are delivered through secure HttpOnly cookies, the browser should not attempt to read them from JavaScript.

If the existing backend contract instead returns tokens explicitly, follow the verified backend contract and minimize persistent token exposure.

## Axios/fetch interceptor behavior

For a 401:
1. attempt refresh once
2. queue concurrent failed requests behind the same refresh operation
3. retry them after successful refresh
4. if refresh fails, clear client session and redirect to login
5. never recursively refresh forever

Avoid multiple simultaneous refresh calls.

## Logout

Logout should:
- call backend logout when possible
- clear client auth/session state
- clear relevant cached private queries
- disconnect authenticated realtime connection
- return user to login

## Role isolation

RIDER and CAPTAIN are separate application surfaces.

The frontend must not trust a route parameter or localStorage value as proof of role. The authenticated identity returned by the backend is authoritative.
