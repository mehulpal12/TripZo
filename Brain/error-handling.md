# Error Handling

## 1. Central error model

Create application errors with:
- code
- message
- HTTP status
- optional metadata

Example:

```text
RIDE_NOT_FOUND
RIDE_ALREADY_ASSIGNED
INVALID_RIDE_STATE
UNAUTHORIZED_RIDE_ACCESS
CAPTAIN_NOT_AVAILABLE
PAYMENT_ALREADY_PROCESSED
```

## 2. Error middleware

All unexpected errors reach one Express error middleware.

Do not expose stack traces in production.

## 3. Business conflicts

Use `409 Conflict` for state races such as:
- captain accepts already-assigned ride;
- ride already cancelled;
- captain starts ride from invalid state.

## 4. Logging

Log:
- request ID
- user ID where available
- route
- error code
- latency
- stack trace server-side

Never log:
- passwords
- raw refresh tokens
- payment secrets
- authorization credentials
