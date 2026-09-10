# Architecture Decisions

## ADR-001 — Modular monolith
Use one deployable backend with clear domain modules.

Reason:
- easier development;
- easier debugging;
- avoids premature distributed-system complexity;
- modules can later be extracted.

## ADR-002 — PostgreSQL is source of truth
Ride state, assignments, payment records and durable business data live in PostgreSQL.

## ADR-003 — Redis GEO for nearby captains
Redis GEO provides an appropriate fast lookup mechanism for nearby active captains.

## ADR-004 — Socket.IO for live tracking
Live location and ride events are pushed through a persistent real-time connection.

## ADR-005 — BullMQ for scheduled jobs
Scheduled ride matching and asynchronous work are handled through a durable queue abstraction backed by Redis.

## ADR-006 — Payment lifecycle is independent
A completed ride may temporarily have a pending payment. Combining these concepts into one state machine would make recovery and reconciliation harder.
