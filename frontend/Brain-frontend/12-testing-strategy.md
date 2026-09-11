# 12 — Frontend Testing Strategy

## Unit tests

Test:
- state-to-UI mappings
- validation schemas
- formatting
- API error normalization
- auth refresh coordination
- location throttling
- realtime event reducers/handlers

## Component tests

Test:
- login/register
- booking form
- ride status UI
- cancellation confirmation
- captain accept/reject
- captain lifecycle actions
- scheduled ride form
- loading/error/empty states

## Integration tests

Verify:
- auth bootstrap
- API client + query cache
- Socket.IO event -> UI update
- mutation -> cache invalidation
- reconnect -> state reconciliation

## E2E

Minimum critical flows:
1. register/login
2. rider creates immediate ride
3. captain receives request
4. captain accepts
5. rider sees assignment
6. captain marks arrived
7. captain starts ride
8. captain completes ride
9. rider sees completed ride
10. rider cancels where valid
11. rider schedules ride
12. session refresh/re-login
13. reconnect during active ride

## Testing principle

Do not assert implementation details when behavior can be tested instead.
