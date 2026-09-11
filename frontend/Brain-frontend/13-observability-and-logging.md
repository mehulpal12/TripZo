# 13 — Frontend Observability

Use structured, privacy-safe logging only.

Log useful technical events such as:
- app bootstrap failure
- API request failure metadata
- socket connection state
- unexpected realtime event
- route-level error boundary

Never log:
- tokens
- passwords
- cookies
- full personal information
- payment data

Use an ErrorBoundary around the application and route-level boundaries where useful.

Production error reporting must redact sensitive request/response data.
