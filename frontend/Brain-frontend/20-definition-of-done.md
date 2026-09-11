# 20 — Frontend Definition of Done

A frontend phase is complete only when:

## Functionality
- feature works against real backend
- valid/invalid states are handled
- role restrictions work
- refresh/reconnect behavior works

## Code quality
- TypeScript has no unexplained errors
- no duplicated API calls
- no duplicated socket connections
- feature boundaries are clean
- no dead code

## UX
- loading
- empty
- error
- offline/reconnecting
- mobile
- accessibility

## Tests
- unit/component coverage for critical logic
- integration coverage for API/realtime coordination
- E2E coverage for critical user journeys

## Security
- no secrets shipped
- no sensitive logs
- auth failures handled
- private data cleared on logout

## Documentation
- contract documented
- architectural decisions documented
- progress tracker updated
- known limitations recorded
