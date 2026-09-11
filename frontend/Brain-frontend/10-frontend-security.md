# 10 — Frontend Security

Frontend security does not replace backend authorization.

## Rules

- Never trust frontend role checks for authorization.
- Never place secrets in VITE_ environment variables.
- Never expose database credentials.
- Never store sensitive backend secrets in source code.
- Never render raw backend HTML.
- Sanitize/escape user-controlled display content.
- Do not log access/refresh tokens.
- Do not log full authentication headers.
- Avoid putting sensitive data in URLs.
- Clear private query caches on logout.
- Validate critical user input before submission and rely on backend validation as authority.

## XSS

Use React's default escaping. Avoid dangerouslySetInnerHTML unless there is a reviewed and sanitized requirement.

## Token leakage

Do not print:
- access token
- refresh token
- Authorization header
- cookies
- private user data

in console logs, analytics, error reports, or screenshots.

## Browser storage

Use the safest storage model compatible with the backend contract. Prefer HttpOnly/Secure/SameSite cookies for refresh credentials when supported by the backend.

## Dependency hygiene

Before finalizing:
- audit dependencies
- remove unused packages
- pin/lock versions through package manager lockfile
- review dangerous packages
