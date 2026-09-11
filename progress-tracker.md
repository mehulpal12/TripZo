# Project Progress Tracker

## Overall Progress

* [x] Phase 0 — Project Understanding
* [x] Phase 1 — Foundation
* [x] Phase 2 — Authentication
* [ ] Phase 3 — Database & Core Ride
* [ ] Phase 4 — Captain System
* [ ] Phase 5 — Matching
* [x] Phase 6 — Real-Time Tracking
* [ ] Phase 7 — Scheduled Rides
* [ ] Phase 8 — Payments
* [ ] Phase 9 — Ratings & Admin
* [ ] Phase 10 — Full System Verification & Deployment

## Phase 0 — Project Understanding

Status: COMPLETE

### Tasks
* [x] Read all documentation
* [x] Inspect codebase
* [x] Create roadmap
* [x] Create progress tracker
* [x] Create project knowledge index
* [x] Create Backend Deep Dive, Learning Roadmap, Study Tracker, and Interview Guide

### Completed Work
Read all markdown files in `Brain/`. Assessed existing repository (currently empty of code). Generated required documentation files. Later, performed a comprehensive codebase analysis to generate detailed `docs/` artifacts mapping out architecture, state machines, and concurrency controls.

### Files Created
- `implementation-roadmap.md`
- `progress-tracker.md`
- `project-knowledge.md`

### Files Modified
- `README.md` (root, to be updated)

### Tests
Not applicable.

### Problems Found
None critical.

### Decisions Made
- Skipped `apps/api` monorepo structure in favor of a simpler `backend` root folder to follow the user's manual initialization.
- Switched to Prisma ORM instead of raw `pg` driver.
- Configured application to use NeonDB managed cloud Postgres database, dropping local Postgres from Docker.p-level guides.

### Last Updated
2026-09-10

---

## Phase 1 — Foundation

Status: COMPLETE

### Tasks
* [x] Initialize backend (Express app)
* [x] Initialize frontend (React app)
* [x] Configure environment setup
* [x] Configure PostgreSQL connection
* [x] Configure Redis connection
* [x] Configure migrations
* [x] Configure validation
* [x] Configure centralized error handling
* [x] Configure structured logging
* [x] Add health endpoint
* [x] Add readiness endpoint
* [x] Add graceful shutdown
* [x] Add basic startup tests

### Completed Work
Implemented core backend structure using Express and TypeScript. Configured Prisma ORM, centralized error handling, environment variables validation, and set up the foundational app structure. Note: Frontend initialization was skipped for now as we focus on the backend.

### Files Created
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/config/db.ts`
- `backend/src/config/env.ts`
- `backend/src/config/redis.ts`
- `backend/src/errors/AppError.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/middleware/validate.ts`
- `backend/src/utils/logger.ts`

### Files Modified
- `backend/tsconfig.json`

### Tests
- Basic setup ready, detailed startup tests pending.

### Problems Found
None.

### Decisions Made
- Use Zod for environment validation and request validation.
- Implement a custom `AppError` class for consistent API error responses.

### Last Updated
2026-09-10

---

## Phase 2 — Authentication

Status: COMPLETE

### Tasks
* [x] Create `users` and `refresh_sessions` schema
* [x] User Registration API
* [x] User Login API
* [x] JWT Access and Refresh Tokens logic
* [x] Token Refresh API
* [x] Logout API
* [x] Protect routes middleware
* [x] Write Unit Tests for Auth Endpoints

### Completed Work
Implemented user authentication including registration, login, token refresh, and logout using JWT and refresh tokens stored in Prisma. Added password hashing and a protected route middleware. Added unit tests for the auth endpoints using Jest and Supertest.

### Files Created
- `backend/src/controllers/auth.controller.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/utils/crypto.ts`
- `backend/tests/auth.test.ts`
- `backend/tests/tsconfig.json`

### Files Modified
- `backend/src/app.ts` (added auth routes)
- `backend/prisma/schema.prisma` (added User and RefreshSession models)

### Tests
- Created `auth.test.ts` to mock Prisma and test registration and login endpoints. Encountered and fixed an IDE error regarding 'jest' types.

### Problems Found
- IDE reported "Cannot find name 'jest'" in the test file. Fixed by explicitly adding `"jest"` to `types` in `backend/tsconfig.json`.

### Decisions Made
- Use stateful refresh tokens (stored in DB via Prisma) alongside stateless JWT access tokens for secure session management.

### Last Updated
2026-09-10

---

## Phase 3 — Database & Core Ride

Status: COMPLETE

### Tasks
* [x] Create `captains` migration
* [x] Create `rides` migration
* [x] Fare estimation service
* [x] GET `/rides/fare` API
* [x] POST `/rides` (Immediate ride) API
* [x] GET `/rides/:rideId` API
* [x] GET `/rides` (Ride history) API
* [x] POST `/rides/:rideId/cancel` API
* [x] Ride state machine enforcement

### Completed Work
Implemented the database schema for `Captain` and `Ride` using Prisma. Included support for user roles (`RIDER`, `CAPTAIN`, `ADMIN`). Built the fare estimation service specifically tailored for `BIKE` with a flat rate of 12/KM as requested. Developed the core ride endpoints, enforcing state machine transitions (like cancellation) using atomic queries via Prisma. Completed test coverage for ride endpoints and fare estimation.

### Files Created
- `backend/src/services/fare.service.ts`
- `backend/src/services/ride.service.ts`
- `backend/src/controllers/ride.controller.ts`
- `backend/src/routes/ride.routes.ts`
- `backend/tests/ride.test.ts`

### Files Modified
- `backend/prisma/schema.prisma` (added `Captain` and `Ride`, modified `User`)
- `backend/src/app.ts` (mounted ride routes)
- `backend/src/middleware/auth.ts` (updated Request types)
- `backend/src/utils/crypto.ts` (updated TokenPayload)

### Tests
- Validated atomic updates and concurrency management when cancelling rides.
- Ensure correct fare calculation (12/KM).
- Verified route protection and authorization constraints.

### Problems Found
- `prisma migrate dev` encounters issues when data structure implies data loss in a non-interactive environment. We utilized `prisma db push --accept-data-loss` for development velocity.

### Decisions Made
- `BIKE` is the only supported vehicle type initially, calculated via haversine distance at 12/KM.
- `RIDER` is the new default user role, superseding the placeholder `USER`.

### Last Updated
2026-09-10

---

## Phase 4 — Captain System

Status: COMPLETE

### Tasks
* [x] POST `/captains/online` API
* [x] POST `/captains/offline` API
* [x] GET `/captains/rides` API
* [x] POST `/rides/:rideId/accept` API
* [x] POST `/rides/:rideId/reject` API
* [x] POST `/rides/:rideId/arrived` API
* [x] POST `/rides/:rideId/start` API
* [x] POST `/rides/:rideId/complete` API
* [x] Atomic captain assignment logic

### Completed Work
Implemented the full Captain lifecycle and state transitions. Added the `RideRejection` model to the schema to track and prevent captains from receiving or accepting rides they previously rejected. Built the `captain.service.ts` to manage `ONLINE` and `OFFLINE` status. Upgraded `ride.service.ts` with atomic OCC functions to accept, reject, arrive, start, and complete rides, strictly enforcing permissions and correct sequential state transitions. Added dedicated `/captains` routes and mounted them under `app.ts`. Unit tests were created to verify atomic assignments and status updates.

### Files Created
- `backend/src/services/captain.service.ts`
- `backend/src/controllers/captain.controller.ts`
- `backend/src/routes/captain.routes.ts`
- `backend/tests/captain.test.ts`

### Files Modified
- `backend/prisma/schema.prisma` (added `RideRejection` and updated relations)
- `backend/src/services/ride.service.ts` (added new state machine handlers)
- `backend/src/controllers/ride.controller.ts` (added intent endpoint logic)
- `backend/src/routes/ride.routes.ts` (mounted intent endpoints)
- `backend/src/app.ts` (mounted `/captains` router)

### Tests
- Wrote tests for online/offline toggle functionality.
- Verified state transitions inside the captain system.
- Confirmed race conditions and invalid permissions revert with a `409 Conflict` or `403 Forbidden`.

### Problems Found
None.

### Decisions Made
- `RideRejection` tracks unique pairs of `rideId` and `captainId` to prevent offering the same ride multiple times to a rejecting captain.
- Final Fare currently resolves to the Estimated Fare natively upon completion for the MVP.

### Last Updated
2026-09-10



---

## Phase 5 — Matching

Status: COMPLETE

### Tasks
* [x] Redis GEO availability sync
* [x] Nearby captain search service
* [x] Matching flow implementation
* [x] Retry/fallback logic for no-match

### Completed Work
Implemented the Matching Service with Redis GEO tracking. Set up Socket.IO connected to the Express HTTP Server, including JWT-based authentication in the handshake. `backend/src/socket.ts` allows captains to join their specific rooms and update their geolocations via `captain:location`, dynamically updating the Redis `captain_locations` keyspace.

Integrated `getNearbyCaptains` directly inside `ride.service.ts` (`createRide`) to broadcast immediate `ride:new` requests to eligible captains inside a 5km radius. Attached event broadcasts (`ride:captain_assigned`, `ride:started`, etc.) to their respective OCC database transitions. Implemented an automatic 2-minute `setTimeout` fallback that flags unaccepted rides as `CANCELLED` when no captains respond in time.

### Files Created
- `backend/src/socket.ts`
- `backend/src/services/matching.service.ts`
- `backend/tests/matching.test.ts`

### Files Modified
- `backend/package.json` (installed `socket.io`)
- `backend/src/server.ts` (attached Socket.IO to HTTP server)
- `backend/src/services/ride.service.ts` (added matching and broadcasts)

### Tests
- Mapped mocked Redis Geo search queries and Prisma queries in `matching.test.ts`.
- Validated existing 12 tests inside the CI workflow continue to run smoothly.

### Problems Found
None.

### Decisions Made
- Wait time for no-match is exactly 2 minutes for the MVP.
- Search radius is strictly capped at 5 kilometers.
### Last Updated
2026-09-10

---

## Phase 6 — Real-Time Tracking

Status: COMPLETE

### Tasks
* [x] Socket.IO configuration
* [x] Socket authentication
* [x] Ride rooms connection logic
* [x] Location ingestion and Redis update
* [x] Stale location protection
* [x] Broadcast location events
* [x] Broadcast ride state transition events
* [x] Reconnect state sync

### Completed Work
Fully implemented Real-Time location tracking using Socket.IO. Validated captain assignments via Redis caching. Added stale location protection using `captain_location_meta` in Redis. Appended latest captain location to `GET /rides/:rideId` for robust reconnection sync.

### Files Created
- `postman-testing-guide.md` (Artifact)

### Files Modified
- `backend/src/socket.ts`
- `backend/src/services/ride.service.ts`

### Tests
Manually tested via Postman Socket.IO connections. Reconnection API sync validated.

### Problems Found
None.

### Decisions Made
- Cached captain-to-ride assignments in Redis instead of querying Postgres on every GPS tick to reduce latency.

### Last Updated
2026-09-10

---

## Phase 7 — Scheduled Rides

Status: COMPLETE

### Tasks
* [x] POST `/rides/schedule` API
* [x] BullMQ queue configuration
* [x] Delayed job for matching window
* [x] Job worker for `SCHEDULED` -> `SEARCHING`
* [x] Reconciliation cron job
* [x] Job idempotency checks

### Completed Work
Implemented Scheduled Rides using BullMQ. Added `POST /rides/schedule` endpoint. Created a delayed job that safely converts rides from SCHEDULED to SEARCHING 15 minutes before the pickup time, reusing the existing matching flow. Added a 5-minute reconciliation cron to recover missed jobs.

### Files Created
- `backend/src/jobs/rideQueue.ts`

### Files Modified
- `backend/src/services/ride.service.ts`
- `backend/src/controllers/ride.controller.ts`
- `backend/src/routes/ride.routes.ts`
- `backend/src/server.ts`

### Tests
Not started.

### Problems Found
None.

### Decisions Made
- BullMQ is used for reliable delayed job processing.
- Recon job runs every 5 minutes.

### Last Updated
2026-09-11

---

## Phase 8 — Payments

Status: NOT STARTED

### Tasks
* [ ] Create `payments` migration
* [ ] POST `/payments` API
* [ ] POST `/payments/webhook` API
* [ ] Payment provider abstraction (mock)
* [ ] Signature verification logic
* [ ] Idempotent payment updates

### Completed Work
None.

### Files Created
None.

### Files Modified
None.

### Tests
Not started.

### Problems Found
None.

### Decisions Made
None.

### Last Updated
Not started.

---

## Phase 9 — Ratings & Admin

Status: NOT STARTED

### Tasks
* [ ] Create `ratings` migration
* [ ] POST `/rides/:rideId/rating` API
* [ ] Unique rating constraint
* [ ] GET `/admin/users` API (paginated)
* [ ] GET `/admin/captains` API (paginated)
* [ ] GET `/admin/rides` API (paginated)
* [ ] GET `/admin/stats` API

### Completed Work
None.

### Files Created
None.

### Files Modified
None.

### Tests
Not started.

### Problems Found
None.

### Decisions Made
None.

### Last Updated
Not started.

---

## Phase 10 — Full System Verification & Deployment

Status: NOT STARTED

### Tasks
* [ ] E2E happy path tests
* [ ] Critical concurrency tests
* [ ] Log coverage check
* [ ] Docker Compose setup for full stack
* [ ] Security hardening review
* [ ] Final README updates

### Completed Work
None.

### Files Created
None.

### Files Modified
None.

### Tests
Not started.

### Problems Found
None.

### Decisions Made
None.

### Last Updated
Not started.
