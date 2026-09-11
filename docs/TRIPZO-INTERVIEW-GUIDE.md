# TRIPZO System Design Interview Guide

## Basic

### Explain TRIPZO architecture.
**Short Answer:** A modular Node.js monolith with PostgreSQL as the source of truth, Redis for ephemeral state/GEO routing, and Socket.IO for real-time tracking.
**TRIPZO Implementation:** Requests hit Express routes. Controllers delegate to Services. Services mutate state in Postgres (Prisma) and publish events via Socket.IO.
**Follow-up:** How would you separate this into microservices?

### Explain captain matching.
**Short Answer:** Captains stream GPS coordinates to Redis. When a ride is requested, we do a GEO search for a 5km radius.
**TRIPZO Implementation:** `backend/src/services/matching.service.ts` uses `GEOSEARCH` on `captain_locations`. Socket.IO broadcasts `ride:new` to the found captains.
**Follow-up:** What if 5 captains try to accept at the exact same time?

## Intermediate

### How does captain assignment avoid race conditions?
**Short Answer:** Optimistic Concurrency Control (OCC) using an atomic SQL update with a version check.
**TRIPZO Implementation:** `ride.service.ts` uses `prisma.ride.updateMany` with `where: { id, status: 'SEARCHING', version }`. If another captain already accepted it, the status or version changed, the DB returns 0 updated rows, and we throw a 409 Conflict.
**Follow-up:** Why not use a Redis lock for this?

### Why WebSockets instead of polling?
**Short Answer:** Polling creates massive HTTP overhead and latency. WebSockets provide a persistent, bi-directional channel ideal for 1Hz GPS ticks.
**TRIPZO Implementation:** `backend/src/socket.ts` handles auth during the handshake, joining users to specific `ride:${rideId}` rooms to stream `captain:location` events purely over TCP.
**Follow-up:** How do you scale WebSockets horizontally across multiple Node servers?

## Advanced

### What happens if Redis crashes?
**Short Answer:** Matching and live tracking degrade, but durable state (Ride, Payment) remains safe in PostgreSQL.
**TRIPZO Implementation:** If Redis is down, `redisClient.isReady` checks fail safely. We lose GEO capabilities, so no new matches can form until it recovers. Active rides fall back to relying on DB state, though live tracking stops.
**Follow-up:** How would you implement high-availability Redis?

### How would you scale WebSockets horizontally?
**Short Answer:** A pub/sub backplane (like Redis) to route events between different WebSocket servers.
**TRIPZO Implementation:** We already implemented `@socket.io/redis-adapter` in `socket.ts`. When Server A emits to a room, the Redis Pub/Sub channels it to Server B, which sends it to the client connected there.
**Follow-up:** What happens if the Redis pub/sub link drops messages?

### How do scheduled rides work?
**Short Answer:** Delayed jobs via a durable queue system.
**TRIPZO Implementation:** `rideQueue.ts` (BullMQ) takes a job and stores it in Redis with a delay offset (15 mins before scheduled time). The worker sleeps and only pulls the job when it's time to transition the DB from `SCHEDULED` to `SEARCHING`.
**Follow-up:** What if the worker crashes right after pulling the job?
