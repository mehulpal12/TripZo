# TRIPZO Learning Roadmap

## 1. Node.js & Express Fundamentals
* **What you need to learn:** The Event Loop, asynchronous I/O, middleware chain, and request lifecycle.
* **Where TRIPZO uses it:** `backend/src/server.ts`, `backend/src/app.ts`, `backend/src/middleware/errorHandler.ts`
* **Questions to answer:** How does an Express request move from the router to the controller?
* **Exercise:** Add a simple middleware in `app.ts` that logs the request duration in milliseconds.

## 2. PostgreSQL & ORM (Prisma)
* **What you need to learn:** Relational data modeling, foreign keys, unique constraints, and atomic operations.
* **Where TRIPZO uses it:** `backend/prisma/schema.prisma`, `backend/src/services/ride.service.ts`
* **Questions to answer:** Why do we use `version: { increment: 1 }` when updating ride status?
* **Exercise:** Query the database using Prisma Studio (`npx prisma studio`) and manually inspect a Ride record.

## 3. Concurrency & Idempotency
* **What you need to learn:** Race conditions (e.g. two captains accepting the same ride) and OCC (Optimistic Concurrency Control).
* **Where TRIPZO uses it:** `backend/src/services/ride.service.ts` (acceptRide function).
* **Questions to answer:** What happens if `prisma.ride.updateMany` returns `{ count: 0 }`?
* **Exercise:** Try to accept a ride via the API twice simultaneously and observe the 409 Conflict error.

## 4. Redis Fundamentals & GEO
* **What you need to learn:** In-memory key-value stores, sets, and geospatial indexing.
* **Where TRIPZO uses it:** `backend/src/services/matching.service.ts` (Redis `GEOADD` and `GEOSEARCH`).
* **Questions to answer:** Why don't we query Postgres for nearby captains?
* **Exercise:** Use the Redis CLI to `GEORADIUS` the `captain_locations` key and see the raw output.

## 5. WebSockets & Real-Time Sync
* **What you need to learn:** Persistent TCP connections, event emitting, Socket.IO rooms, and reconnection handling.
* **Where TRIPZO uses it:** `backend/src/socket.ts`
* **Questions to answer:** How does a Rider only receive location updates for their specific assigned Captain?
* **Exercise:** Emit a custom `ping` event from a Postman WebSocket client and `console.log` it on the server.

## 6. Background Jobs & BullMQ
* **What you need to learn:** Job queues, delayed jobs, workers, and cron/repeatable schedules.
* **Where TRIPZO uses it:** `backend/src/jobs/rideQueue.ts`
* **Questions to answer:** Why use BullMQ instead of `setTimeout` for a ride scheduled 3 days in advance?
* **Exercise:** Schedule a ride for 16 minutes from now and watch the worker pick it up in 1 minute to start matching.
