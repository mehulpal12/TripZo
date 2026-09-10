# Implementation Plan

Build in this order. Do not jump directly into advanced infrastructure.

## Phase 1 — Foundation
- initialize monorepo
- configure TypeScript
- Express app
- React app
- environment configuration
- PostgreSQL connection
- migrations
- Redis connection
- centralized errors
- request validation
- logging

## Phase 2 — Authentication
- users table
- registration
- login
- access JWT
- refresh sessions
- logout
- role middleware
- resource authorization

## Phase 3 — Ride Core
- ride schema
- fare service
- create immediate ride
- get ride
- ride history
- cancellation
- documented state machine

## Phase 4 — Captain
- captain profile
- online/offline
- vehicle
- captain ride APIs
- accept/reject
- arrived/start/complete

## Phase 5 — Matching
- Redis GEO
- availability mirror
- nearby captain search
- first-accept-wins atomic update
- retry/no-captain flow

## Phase 6 — Real Time
- Socket.IO auth
- ride rooms
- assignment events
- location events
- reconnect synchronization
- stale-location handling

## Phase 7 — Scheduled Rides
- BullMQ
- delayed jobs
- matching-window worker
- idempotent transition
- reconciliation job

## Phase 8 — Payments
- payments table
- payment service abstraction
- provider integration/mock provider
- webhook
- signature verification
- idempotency

## Phase 9 — Ratings/Admin
- ratings
- admin APIs
- dashboard
- pagination/filtering

## Phase 10 — Quality
- unit tests
- integration tests
- concurrency test
- E2E happy path
- security review
- observability
- Docker/deployment

## Definition of Done

A feature is not complete until:
- API implemented;
- validation implemented;
- authorization implemented;
- DB migration exists;
- error cases handled;
- tests added;
- logging added where useful;
- documentation updated.
