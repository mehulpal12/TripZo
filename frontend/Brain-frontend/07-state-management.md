# 07 — State Management and Ride State

## Durable server state

Server state must come from the backend:
- authenticated user
- captain status
- ride
- ride history
- scheduled ride

Use query caching and invalidation.

## Ride state

The frontend should represent the backend state machine explicitly.

Expected conceptual states include:
- REQUESTED
- SEARCHING
- ACCEPTED
- ARRIVED
- IN_PROGRESS
- COMPLETED
- CANCELLED

Verify exact enum names in Prisma/backend before coding.

Create a single state-to-UI mapping rather than repeated if/else logic.

For each state define:
- title
- description
- progress indicator
- valid user actions
- valid captain actions
- realtime behavior
- next expected transition

## Optimistic updates

Use optimism sparingly.

Safe candidates:
- UI-only toggles

Be careful with:
- ride cancellation
- captain accept
- captain start
- captain complete

These are concurrency-sensitive backend operations. Prefer waiting for confirmed API success and realtime reconciliation.

## Query invalidation

After a successful ride mutation:
- invalidate ride detail
- invalidate relevant ride lists
- update active screen from returned response
- allow realtime event to reconcile

Avoid refetching the entire application after every action.
