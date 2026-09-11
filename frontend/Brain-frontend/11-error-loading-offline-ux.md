# 11 — Loading, Error, Empty and Offline UX

Every network-driven screen must define four states:

1. Loading
2. Success
3. Empty
4. Error

Realtime screens additionally need:
5. Connecting
6. Reconnecting
7. Stale data

## Rules

Never leave the user with:
- blank screen
- spinner forever
- disabled button with no explanation
- raw JSON error
- silently failed realtime connection

## Retry

Retry only operations that are safe to retry.

For mutations, rely on backend idempotency/semantics before automatic retrying.

## Offline

When offline:
- clearly indicate connection loss
- preserve non-sensitive UI context
- prevent actions that cannot safely execute
- reconnect automatically where appropriate
- reconcile state after reconnection

## Toasts

Use toasts for short feedback, not critical ride-state information. Critical ride updates should remain visible in the page state.
