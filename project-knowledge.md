# Project Knowledge Index

This file maps the core concepts of the project to the design documents where their source-of-truth is maintained.

## Core Domain Mapping

- **Ride lifecycle** → `Brain/ride-state-machine.md`
- **Database** → `Brain/database-design.md`
- **API contracts** → `Brain/api-design.md`
- **Real-time** → `Brain/realtime-design.md`
- **Matching** → `Brain/matching-design.md`
- **Scheduled rides** → `Brain/scheduled-rides.md`
- **Payments** → `Brain/payment-design.md`
- **Security** → `Brain/auth-security.md`
- **Testing** → `Brain/testing-strategy.md`
- **Architecture** → `Brain/architecture.md`
- **Admin** → `Brain/admin-design.md`
- **Implementation order** → `implementation-roadmap.md`
- **Current progress** → `progress-tracker.md`

## Architecture Summary

The application is a **modular monolith** running on Node.js (Express), separated into clear domain modules (Auth, Users, Captains, Rides, Matching, Payments, Admin). 
The frontend consists of React applications for Riders, Captains, and Admins.

**Infrastructure Stack**:
- **NeonDB (PostgreSQL)**: Managed cloud database as the durable source of truth for all business data. Accessed exclusively via **Prisma ORM**.
- **Redis**: Ephemeral state (latest captain locations, online availability, Redis GEO matching) and BullMQ processing.
- **Socket.IO**: Real-time bidirectional communication for live location tracking and ride events.
- **BullMQ**: Background job queue for delayed scheduling of rides.

## Critical Project Invariants

1. **NeonDB (PostgreSQL) is the durable source of truth.** Redis is only used for temporary or ephemeral coordination. Redis does not decide whether a ride was won; NeonDB does.
2. **Atomic Ride Assignment.** A ride can only be won by exactly one captain. A strict atomic update via Prisma is required to prevent read-then-write race conditions.
3. **Payment State Independence.** Payment status (`PENDING`, `SUCCESS`, etc.) is entirely separate from ride status (`COMPLETED`). A ride completing does not automatically mean payment succeeded.
4. **No Client Trust for Identity.** A client cannot determine their identity or authority via the request body (e.g. `{"riderId": "..."}`). Server-derived identity from JWT is strictly required.
5. **Idempotency.** Operations like webhook payments and background job processing must be safely repeatable without duplicating business effects.
6. **No GPS Flood to NeonDB.** Do not log every live GPS location event to NeonDB. Only keep it in Redis and broadcast it via WebSocket.
7. **Synchronize, don't replay.** Upon WebSocket reconnect, the client should fetch the latest state, not process a backlogged replay of stale location updates.
8. **Role Based Access.** The platform relies on exactly 3 roles: `USER`, `ADMIN`, and `CAPTAIN`.
