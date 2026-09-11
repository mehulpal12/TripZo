# 18 — Antigravity Master Prompt: Build TRIPZO Frontend

You are the senior frontend engineer responsible for building the TRIPZO frontend against the existing backend.

IMPORTANT:
Do not start coding blindly.

## Step 1 — Inspect first

Inspect:
- repository tree
- backend/src
- backend routes/controllers/services
- Prisma schema
- Zod schemas
- auth middleware
- ride state machine
- Socket.IO server
- Redis-related realtime code
- scheduled ride queue/worker
- existing docs
- progress tracker

Determine exact:
- endpoints
- request bodies
- response bodies
- HTTP status codes
- error format
- auth flow
- role model
- ride states
- socket event names
- socket authentication
- room/subscription rules
- captain location payload
- scheduled ride lifecycle

Do not invent API contracts.

## Step 2 — Create frontend contract documentation

Create/update:
- docs/frontend-backend-contract.md
- docs/frontend-architecture.md
- docs/frontend-screen-map.md
- docs/frontend-state-machine.md
- docs/frontend-realtime.md
- docs/frontend-testing.md
- docs/frontend-security.md
- docs/frontend-progress.md

## Step 3 — Scaffold

Create a clean React + TypeScript frontend.

Use the dependency choices specified in the frontend specification unless the existing repository has a strong reason to use alternatives.

## Step 4 — Implement in order

F1 Foundation
F2 Authentication
F3 Rider
F4 Captain
F5 Realtime
F6 Scheduled rides
F7 Hardening

Do not skip directly to visual polish.

## Step 5 — Architecture rules

- API calls belong in API/service modules.
- Socket connection belongs in a dedicated realtime layer.
- Server state belongs in TanStack Query or equivalent.
- Do not duplicate server state in global stores.
- Ride state transitions must be driven by backend state.
- UI actions must be allowed only when valid for the current state.
- Do not implement payment logic yet.
- Do not put secrets in frontend environment variables.
- Do not trust client-side authorization.

## Step 6 — Realtime rules

On active ride:
1. fetch REST state
2. subscribe/connect realtime
3. process typed events
4. update cache/UI
5. on reconnect fetch authoritative state again
6. avoid stale GPS replay

Do not create duplicate sockets.

## Step 7 — Quality gates

After each phase:
- typecheck
- lint
- unit/component tests
- production build

Before declaring complete:
- E2E critical ride flow
- mobile responsive review
- accessibility review
- error/offline review
- security review

## Step 8 — Documentation

For every significant architectural decision explain:
- why it exists
- what problem it solves
- why alternatives were rejected
- how it maps to the backend

Update the progress tracker after every completed phase.

## Step 9 — Do not hide problems

If the backend contract is inconsistent or incomplete:
- stop the affected implementation
- document the exact mismatch
- identify the smallest backend change required
- do not silently create frontend workarounds that violate the architecture
- read all the file in the Brain-frontend folder all the file in detail

## Final deliverable

A production-structured frontend integrated with the current backend, with tested rider/captain flows, realtime ride tracking, scheduled ride support, and a clean extension point for Phase 8 payments.
