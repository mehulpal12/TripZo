# Implementation Roadmap

## Phase 0 — Project Understanding

### Goal
Understand the system requirements and setup the roadmap.

### Prerequisites
None.

### Documentation
- All files in `Brain/`

### Tasks
1. Read documentation
2. Inspect codebase
3. Create roadmap
4. Create progress tracker
5. Create project knowledge index

### Acceptance criteria
- Roadmap, progress tracker, and knowledge index are present and populated.

## Phase 1 — Foundation

### Goal
Initialize the repository with frontend, backend, and environment setup.

### Prerequisites
None.

### Documentation
- `Brain/implementation-plan.md`
- `Brain/project-structure.md`

### Tasks
1. Initialize monorepo structure (`apps/api`, `apps/web`)
2. Configure TypeScript, Express app, and React app
3. Configure environment variables mapping
4. Configure NeonDB PostgreSQL connection and Prisma ORM migrations framework
5. Configure Redis connection
6. Set up centralized error handling middleware
7. Implement request validation framework
8. Configure structured logging

### Files to create
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/api/src/server.ts`
- `apps/api/src/app.ts`
- Database config files, Redis config files, error middleware, logger utilities.

### Acceptance criteria
- Both React and Express servers can start.
- Express connects successfully to NeonDB via Prisma and Redis.
- Health endpoint returns 200 OK.
- Database migrations can run.

## Phase 2 — Authentication

### Goal
Implement secure registration, login, and authorization.

### Prerequisites
Phase 1 (Foundation)

### Documentation
- `Brain/auth-security.md`
- `Brain/api-design.md`
- `Brain/database-design.md`

### Tasks
1. Create Prisma `User`, `Role` (USER, ADMIN, CAPTAIN) and `RefreshSession` models
3. Implement `Auth` module (controller, service, repository, validation, routes)
4. Add password hashing
5. Create POST `/auth/register` and POST `/auth/login`
6. Implement access JWT generation and refresh token logic
7. Create POST `/auth/refresh` and POST `/auth/logout`
8. Implement role-based authorization middleware
9. Add unit/integration tests for Auth

### Acceptance criteria
- Users can register and log in.
- Protected routes block unauthorized requests.
- Refresh tokens can rotate access tokens.

## Phase 3 — Database & Core Ride

### Goal
Implement ride creation and fare estimation logic.

### Prerequisites
Phase 2

### Documentation
- `Brain/database-design.md`
- `Brain/ride-state-machine.md`
- `Brain/api-design.md`

### Tasks
1. Create `captains` migration
2. Create `rides` migration
3. Implement Fare calculation service
4. Create GET `/rides/fare`
5. Create POST `/rides` (Immediate ride)
6. Create GET `/rides/:rideId` and GET `/rides`
7. Implement ride cancellation logic (POST `/rides/:rideId/cancel`)
8. Add tests for fare calculation and ride state validation

### Acceptance criteria
- Rider can request fare estimate.
- Rider can create a ride.
- Rider can view their active/past rides.
- Ride cancellation follows state machine rules.

## Phase 4 — Captain System

### Goal
Enable captains to go online, receive, and manage rides.

### Prerequisites
Phase 3

### Documentation
- `Brain/api-design.md`
- `Brain/matching-design.md`

### Tasks
1. Create POST `/captains/online` and `/captains/offline`
2. Create GET `/captains/rides`
3. Implement ride state transitions: accept, reject, arrived, start, complete
4. Add atomic SQL update for captain assignment
5. Implement captain authorization (only assigned captain can update ride)
6. Add unit/integration tests

### Acceptance criteria
- Captain can go online/offline.
- Captain can accept a ride atomically (first-accept wins).
- Captain can progress the ride state up to completion.

## Phase 5 — Matching

### Goal
Match searching rides to eligible available captains using Redis GEO.

### Prerequisites
Phase 4

### Documentation
- `Brain/matching-design.md`

### Tasks
1. Synchronize captain availability to Redis GEO
2. Implement matching service to find nearby captains
3. Build the first-accept-wins atomic update flow
4. Implement retry/no-captain timeout logic

### Acceptance criteria
- `SEARCHING` rides automatically find nearby eligible captains.
- Captain availability properly adds/removes them from Redis GEO.

## Phase 6 — Real-Time Tracking

### Goal
Add Socket.IO for live location and ride event broadcast.

### Prerequisites
Phase 5

### Documentation
- `Brain/realtime-design.md`
- `Brain/event-contracts.md`

### Tasks
1. Configure Socket.IO server
2. Implement Socket.IO authentication
3. Implement ride rooms (`ride:{rideId}`)
4. Add captain location ingestion, validation, and broadcast
5. Broadcast ride state transitions (assigned, arriving, started, completed)
6. Handle reconnection state sync

### Acceptance criteria
- Rider sees captain moving on map.
- Real-time events push ride state changes to clients instantly.
- Stale location events are rejected.

## Phase 7 — Scheduled Rides

### Goal
Support future ride booking using BullMQ.

### Prerequisites
Phase 3 (Core Rides)

### Documentation
- `Brain/scheduled-rides.md`

### Tasks
1. Create POST `/rides/schedule`
2. Configure BullMQ for delayed jobs
3. Create worker to transition `SCHEDULED` rides to `SEARCHING`
4. Add reconciliation cron job
5. Test idempotency

### Acceptance criteria
- Rider can schedule a ride for the future.
- System automatically starts matching exactly before the scheduled pickup time.

## Phase 8 — Payments

### Goal
Handle post-ride payments securely and idempotently.

### Prerequisites
Phase 4

### Documentation
- `Brain/payment-design.md`

### Tasks
1. Create `payments` migration
2. Create POST `/payments`
3. Create POST `/payments/webhook`
4. Implement signature verification (mock provider initially)
5. Implement idempotent payment status updates

### Acceptance criteria
- Completed rides trigger payment flow.
- Webhooks correctly transition payment state without race conditions.

## Phase 9 — Ratings & Admin

### Goal
Allow riders to rate captains and admins to view platform state.

### Prerequisites
Phase 4, Phase 8

### Documentation
- `Brain/database-design.md`
- `Brain/admin-design.md`

### Tasks
1. Create `ratings` migration
2. Implement POST `/rides/:rideId/rating`
3. Implement Admin APIs (users, captains, rides, stats) with pagination
4. Enforce unique rating constraint

### Acceptance criteria
- Rider can rate a completed ride exactly once.
- Admin dashboard APIs return paginated platform stats.

## Phase 10 — Full System Verification & Deployment

### Goal
Hardening, end-to-end testing, and production deployment.

### Prerequisites
All previous phases

### Documentation
- `Brain/testing-strategy.md`
- `Brain/observability.md`
- `Brain/deployment.md`

### Tasks
1. Write E2E happy path tests
2. Write critical concurrency tests (simulating multiple captains accepting)
3. Ensure structured logging is present in all critical paths
4. Set up Docker Compose for full stack deployment
5. Review security rules
6. Finalize README

### Acceptance criteria
- Automated tests cover all critical flows.
- System can be spun up completely via Docker.
- No remaining missing requirements.
