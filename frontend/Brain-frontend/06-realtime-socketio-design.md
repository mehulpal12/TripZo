# 06 — Realtime Socket.IO Design

The backend uses Socket.IO for realtime ride state/location communication.

## Connection lifecycle

Connect only after the authenticated session is available.

Handle:
- connect
- disconnect
- reconnect
- connect_error
- authentication failure

Do not create a new socket on every render.

Use one managed connection per authenticated browser session/role.

## Rider realtime

The rider needs realtime updates for:
- ride state changes
- captain assignment
- captain latest location
- relevant ride events

When entering an active ride screen:
1. fetch durable ride state from REST
2. connect/ensure socket
3. join/subscribe using the backend-defined mechanism
4. process live events
5. reconcile with REST state when necessary

## Captain realtime

Captain needs:
- incoming ride requests
- active ride events
- location update channel

Captain location updates should:
- be throttled/debounced appropriately
- include timestamp if backend expects it
- not fire when location is unavailable
- handle permission denial
- stop when captain goes offline or leaves active tracking

## Reconnect rule

On reconnect:
- do not replay stale GPS history
- fetch latest durable ride state
- obtain latest captain location/state
- resume live subscription

## Event handling

Create typed event handlers in one place.

Do not scatter socket.on() calls across dozens of components.

Example conceptual events:
- ride:new
- ride:updated / state-specific ride event
- captain:location
- ride:location
- reconnect sync

Use the actual backend event names after inspecting the code.

## Duplicate/out-of-order events

Frontend should be resilient:
- ignore events for unrelated rides
- compare ride IDs
- use timestamps/version/state transition data if provided
- refetch durable state if an event cannot be safely reconciled

Socket.IO is a transport for realtime updates; PostgreSQL-backed REST state remains authoritative.
