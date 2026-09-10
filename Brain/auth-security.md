# Authentication and Security

## 1. Authentication

Use:
- short-lived access JWT;
- refresh-token/session mechanism;
- password hashing with a modern password hashing library.

Prefer secure HttpOnly cookies for refresh tokens.

## 2. Authorization

Use role middleware:

```text
requireAuth
requireRole('RIDER')
requireRole('CAPTAIN')
requireRole('ADMIN')
```

Then apply resource authorization.

Example:
A rider can only access their own rides.

## 3. Captain identity

For location and captain operations, derive captain ID from authenticated identity.

Never trust:

```json
{"captainId": "some-other-id"}
```

from the client.

## 4. Input validation

Validate:
- coordinates;
- UUIDs;
- enum values;
- dates;
- vehicle types;
- rating range;
- pagination;
- strings and lengths.

Reject invalid input before business logic.

## 5. Rate limiting

Stricter:
- login
- register
- refresh
- password operations

Moderate:
- ride creation
- cancellation
- payment creation

WebSocket:
- validate location frequency and payload size server-side.

## 6. Secrets

Never commit:
- JWT secrets
- database passwords
- payment credentials
- Redis credentials
- API keys

Use `.env` locally and secret management in production.

## 7. Common protections

- Helmet/security headers.
- CORS allowlist.
- Request body size limits.
- Parameterized SQL.
- Dependency updates.
- Audit logs for sensitive admin operations.
