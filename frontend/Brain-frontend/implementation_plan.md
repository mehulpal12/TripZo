# TRIPZO — Full Codebase Audit Report (Phase 1)

## Architecture Understanding

```
[Rider Browser]                     [Captain Browser]
     |                                      |
     | HTTP / WebSocket                     | HTTP / WebSocket
     v                                      v
[Next.js 16 Frontend] ──────────────────────────
     |
     | API calls (axios + Cookies auth)
     v
[Express Backend :4000]
     ├── /auth         → auth.controller.ts
     ├── /rides        → ride.controller.ts
     └── /captains     → captain.controller.ts
     |
     ├── PostgreSQL (Prisma) — durable ride/user state
     ├── Redis (node-redis) — GEO locations + ride assignment cache
     ├── Socket.IO — real-time events (rides, locations)
     └── BullMQ (ioredis) — scheduled ride queue
```

---

## A. Critical Problems (P0/P1 — Flow Breakers)

### C1 — `acceptRide` sets captain to `ON_RIDE` but `cancelRide` never resets it  *(P0)*
- **File**: `backend/src/services/ride.service.ts` L285–288, L206–212
- **Root cause**: `acceptRide()` sets captain status → `ON_RIDE`. But `cancelRide()` only deletes the Redis key; it never calls `prisma.captain.update({ status: AVAILABLE })`. If a ride is cancelled after acceptance, the captain's DB status stays `ON_RIDE` permanently.
- **Impact**: Captain can NEVER go offline or receive future rides. This is the source of the "Cannot change status while on a ride" error that keeps recurring.
- **Fix**: Reset captain to `AVAILABLE` inside `cancelRide()` if a `captainId` exists — **already partially applied** earlier in this session; verify it's complete and also handles `CAPTAIN_ARRIVED` status.

---

### C2 — `ride:captain_assigned` socket event does NOT emit to rider's personal room  *(P0)*
- **File**: `backend/src/services/ride.service.ts` L306
- **Root cause**: `io.to(`ride:${rideId}`).emit('ride:captain_assigned', ...)` — but the rider only joins `ride:${rideId}` via `socket.emit('join_ride', ...)` which is triggered **inside** `useRiderSocket.ts`'s `useEffect` that fires only when `activeRide` is set. However, `activeRide` is only set **after** the rider receives `ride:captain_assigned`. This is a chicken-and-egg race: the rider joins the room AFTER the event is emitted to the room — they miss it.
- **Impact**: Rider never receives captain confirmation in practice (the fact the E2E test works intermittently is because Fast Refresh forces a re-mount with the ride already set in Zustand).
- **Fix**: Backend should emit `ride:captain_assigned` to **both** `ride:${rideId}` AND `rider:${riderId}`. The rider is always in their personal room from connection.

---

### C3 — Captain `handleDecline` does NOT call the reject API  *(P1)*
- **File**: `frontend/app/app/(dashboard)/captain/page.tsx` L96–98
- **Root cause**: `handleDecline` only calls `setActiveRequest(null)` — it never calls `captainService.rejectRide(...)`. No rejection is recorded in Postgres. The ride matching service (`getNearbyCaptains`) filters out captains with a `RideRejection` record, but since none is created, the same captain will keep receiving the same ride request on every re-broadcast.
- **Fix**: `handleDecline` must call the `/rides/:rideId/reject` API endpoint.

---

### C4 — Socket disconnects when Captain goes offline — removes GEO data correctly but does NOT reset DB status  *(P1)*
- **File**: `backend/src/socket.ts` L116–127
- **Root cause**: On socket `disconnect`, the code removes the captain from Redis GEO. But it does **not** update the captain's `CaptainStatus` in PostgreSQL to `OFFLINE`. If a captain's browser crashes or goes offline without calling the `/captains/offline` endpoint, their DB status stays `AVAILABLE` or `ON_RIDE`, making them permanently available/stuck in Postgres even though they're gone.
- **Fix**: On disconnect, if the captain is `AVAILABLE` in Postgres, set them to `OFFLINE`.

---

### C5 — `startMatchingForRide` uses `setTimeout` instead of BullMQ for the 2-minute fallback  *(P1)*
- **File**: `backend/src/services/ride.service.ts` L100–115
- **Root cause**: The fallback timer is a raw `setTimeout`. This means it's in-memory only. If the server restarts within 2 minutes of a ride being created (common during development, possible in production), the timer is lost and the ride stays `SEARCHING` forever — never cleaned up.
- **Fix**: Move the 2-minute fallback cancellation into BullMQ.

---

### C6 — Socket does not reconnect with the rider's current `activeRide` room after reconnect  *(P1)*
- **File**: `frontend/app/hooks/useRiderSocket.ts`
- **Root cause**: On socket reconnect, the rider's new socket connection is NOT automatically re-added to `ride:${rideId}` room — `join_ride` is only emitted inside the `useEffect`. However, since the `useEffect` dependency is `[activeRide, ...]`, it WILL re-run on reconnect only if `activeRide` changes. If `activeRide` is stable (state was hydrated from another source), the re-join won't trigger. The backend's socket room membership is per-connection and is lost on disconnect.
- **Fix**: Explicitly re-emit `join_ride` on the `connect` event inside the socket hook.

---

### C7 — `useCaptainSocket` disconnects on `isOnline = false` — killing the socket for ALL listeners  *(P1)*
- **File**: `frontend/app/hooks/useCaptainSocket.ts` L16–17
- **Root cause**: `socketClient.disconnect()` is called when `isOnline` is false. But `socketClient` is a singleton. This means the Rider's socket (which uses the same `socketClient`) would also be killed if this hook runs in a context where `isOnline` is false. While Rider and Captain are separate pages, if either ever mounts in the same app session, this creates problems. More critically, on the Captain page, going offline kills the socket immediately — so any real-time updates (e.g. receiving a `ride:cancelled` event) would be missed.
- **Severity**: Medium — won't break the core flow in isolation but is fragile architecture.

---

### C8 — `getCaptainAssignedRides` returns ALL rides (including completed/cancelled)  *(P1)*
- **File**: `backend/src/services/captain.service.ts` L50–55
- **Root cause**: `getCaptainAssignedRides` queries rides without any status filter. `captainService.getCurrentState()` on the frontend then checks `if (['CAPTAIN_ASSIGNED', 'CAPTAIN_ARRIVING', 'IN_PROGRESS'].includes(latestRide.status))` — but the backend returns the most recent ride regardless of status. If the last ride was `COMPLETED` 5 days ago, the frontend will see no active ride correctly. But if there are many rides, the query could be slow without proper ordering + limit.
- **More critical issue**: After a ride completes/cancels, the frontend calls `captainService.getCurrentState()` on mount and could potentially resurrect a stale ride. The filter exists but it means `CAPTAIN_ARRIVED` is missing — a captain who arrived will not have their active ride hydrated on refresh.
- **Fix**: Add `CAPTAIN_ARRIVED` to the status filter AND add `take: 1` with `orderBy: { createdAt: 'desc' }` to the query.

---

## B. Socket.IO Problems

| # | Problem | File | Severity |
|---|---|---|---|
| S1 | `ride:captain_assigned` only emits to `ride:${rideId}` room. Rider hasn't joined this room yet | `ride.service.ts:306` | P0 |
| S2 | No `join_ride` re-emit on socket reconnect | `useRiderSocket.ts` | P1 |
| S3 | Captain socket destroyed on `isOnline=false` | `useCaptainSocket.ts:17` | P1 |
| S4 | On disconnect, captain DB status not reset | `socket.ts:116-127` | P1 |
| S5 | GPS simulator does NOT handle `CAPTAIN_ARRIVED` status (also moves toward pickup, not standing still) | `useCaptainSocket.ts:53` | P2 |
| S6 | Socket uses wildcard CORS `origin: '*'` | `socket.ts:14` | P3 (security) |
| S7 | Redis Adapter pub/sub clients have no error handler | `socket.ts:22-26` | P3 |
| S8 | `ride:new` event uses `rideId` but ride rooms use the same `rideId` — captain never joins a ride room, so backend cannot target them in ride-specific events | `socket.ts` vs `useCaptainSocket.ts` | P2 |

---

## C. Redis Problems

| # | Problem | File | Severity |
|---|---|---|---|
| R1 | GEO uses `userId` as member key but `ride_assignment` cache also uses `userId` — consistent, but GEO cleanup on captain offline uses `userId` which is correct | `socket.ts:122`, `captain.service.ts:33` | OK |
| R2 | No TTL on `captain_locations` GEO set entries — stale location cleanup relies on lazy "5 minute" check in matching service. A captain who goes offline without disconnecting cleanly stays in GEO forever | `matching.service.ts:28` | P2 |
| R3 | Redis Adapter `pubClient` / `subClient` connections have no error handlers — unhandled promise rejection if Redis disconnects after server start | `socket.ts:22` | P2 |
| R4 | `ride_assignment` key has a 24h TTL which is correct, but if captain completes/cancels, it's deleted — there is no race condition here | `ride.service.ts:283` | OK |
| R5 | BullMQ uses `ioredis` while the rest of the app uses `node-redis` — two separate Redis connections with different clients is fine but adds complexity | `rideQueue.ts:10` | P4 |
| R6 | `captain_location_meta` hash has no TTL — grows indefinitely with every captain that ever connected | `socket.ts:100` | P3 |

---

## D. Database/Prisma Problems

| # | Problem | File | Severity |
|---|---|---|---|
| D1 | `captain.status` not reset on cancel | `ride.service.ts` | P0 |
| D2 | `getCaptainAssignedRides` missing `CAPTAIN_ARRIVED` in frontend filter | `captain.service.ts` + `captain.service.ts (frontend)` | P1 |
| D3 | No DB transaction wrapping accept: `ride.updateMany` + `captain.update` + Redis set are not atomic. If the captain update fails, ride is `CAPTAIN_ASSIGNED` but captain status is still `AVAILABLE` | `ride.service.ts:266-290` | P2 |
| D4 | `User.name` is nullable — frontend uses `firstName`/`lastName` but schema has only `name`. This breaks the captain profile display on rider's `ActiveRideSidebar` | `schema.prisma` + `ActiveRideSidebar.tsx:82,94` | P1 |
| D5 | `Ride.cancelledBy` is a raw `String?` but `Role` enum exists — inconsistent typing | `schema.prisma` | P4 |
| D6 | No index on `(status, captainId)` composite — queries filtering by both are common | `schema.prisma` | P3 |

---

## E. API Problems

| # | Problem | File | Severity |
|---|---|---|---|
| A1 | `/captains/online` endpoint: `setCaptainStatus` uses `upsert` — but the `update: {}` means if a captain re-calls online while already online, it creates a no-op update. This is fine functionally | `captain.service.ts` | OK |
| A2 | `accept` endpoint does NOT check if captain is `AVAILABLE` — an `ON_RIDE` captain could theoretically accept another ride if they can reach the API | `ride.service.ts:237` | P1 |
| A3 | `reject` endpoint doesn't notify the matching service to re-broadcast to other captains | `ride.service.ts:314` | P1 |
| A4 | No rate limiting on any endpoint | `app.ts` | P3 |
| A5 | `getFare` query params are `z.string()` but used as floats — no coercion validation | `ride.routes.ts:27` | P3 |
| A6 | CORS `origin` in `app.ts` uses `env.CORS_ORIGIN` (configurable) but Socket.IO uses `'*'` | `socket.ts:14` | P3 |

---

## F. Frontend Problems

| # | Problem | File | Severity |
|---|---|---|---|
| F1 | `handleDecline` has no API call | `captain/page.tsx:96` | P1 |
| F2 | `ActiveRideSidebar` uses `captain.user.firstName`/`lastName` but schema has only `name` | `ActiveRideSidebar.tsx:82,94` | P1 |
| F3 | `BookingPanel` hardcodes locations — not a bug but means real location search is unimplemented | `BookingPanel.tsx:18,22` | P2 |
| F4 | Rider socket `useEffect` only registers ride-specific listeners when `activeRide` exists — means `ride:captain_assigned` listener is ONLY active if rider already has an `activeRide` in store (circular dependency) | `useRiderSocket.ts:16` | P0 |
| F5 | Captain page `handleAccept` catches error and silently clears `activeRequest` — no user feedback | `captain/page.tsx:87-91` | P2 |
| F6 | Captain store and Rider store both use in-memory Zustand with NO persistence — a browser refresh loses all ride state, captain must go online again manually | `captain.store.ts`, `ride.store.ts` | P2 |
| F7 | `captainService.getCurrentState()` filter missing `CAPTAIN_ARRIVED` | `captain.service.ts (frontend):34` | P1 |
| F8 | `useCaptainSocket` GPS simulator never stops emitting even if socket is disconnected — calls `currentSocket.emit(...)` only if `connected`, but the interval keeps running | `useCaptainSocket.ts:49` | P3 |

---

## G. Architecture Problems

| # | Problem | Severity |
|---|---|---|
| G1 | Rider must join a ride-specific room to receive updates — but the room join happens AFTER captain_assigned event is emitted. Backend should emit to the rider's personal room directly | P0 |
| G2 | `setTimeout` used for 2-min fallback timer — non-durable, lost on restart | P1 |
| G3 | Captain going offline disconnects the singleton socket used by both Captain and (potentially) Rider components | P1 |
| G4 | No server-side ride room join on behalf of rider — server should proactively add the rider's socket to the ride room | P1 |

---

## H. Race Conditions

| # | Condition | Severity |
|---|---|---|
| RC1 | Two captains accept simultaneously — handled by `updateMany` with version check ✅ | OK |
| RC2 | `ride.updateMany` + `captain.update` + `redisClient.set` not atomic — partial failure leaves inconsistent state | P2 |
| RC3 | Captain socket disconnect cleans Redis before DB update — Redis and Postgres temporarily inconsistent | P2 |
| RC4 | Matching timeout (`setTimeout`) could fire after a captain already accepted — mitigated by checking `status === SEARCHING` | OK |
| RC5 | Rider books ride → `createRide` returns before `startMatchingForRide` completes → race between setting `activeRide` and captain socket emitting `ride:new` | P2 |

---

## I. Performance Problems

| # | Problem | Severity |
|---|---|---|
| P1 | `getCaptainAssignedRides` fetches ALL rides for captain, no pagination | P3 |
| P2 | GPS location emitted every 2 seconds to Redis GEO — high write frequency for a distributed GEO store (acceptable for MVP) | P4 |
| P3 | Matching queries Prisma for all active members from GEO one by one for TTL check (loop + hGet per member) | P3 |
| P4 | `captain_location_meta` hash grows unboundedly | P3 |

---

## J. Security Problems

| # | Problem | Severity |
|---|---|---|
| SEC1 | Socket.IO `cors: origin: '*'` — should match API CORS policy | P3 |
| SEC2 | Captain can accept ride without being `AVAILABLE` in DB — no server-side status check in `acceptRide` | P1 |
| SEC3 | `cancelledBy` accepts arbitrary string — no enforcement of only `RIDER`/`CAPTAIN`/`SYSTEM` | P4 |
| SEC4 | JWT token stored in a cookie accessible by JS (`Cookies.get('token')`) — consider `httpOnly` flag | P3 |
| SEC5 | No rate limiting on auth endpoints — brute-force login possible | P3 |

---

## Priority Matrix

| Priority | Issues |
|---|---|
| **P0 — App broken** | C1 (captain stuck ON_RIDE), C2 (rider misses captain_assigned), F4 (circular socket dependency) |
| **P1 — Main flow broken** | C3 (decline no API), C4 (disconnect no DB reset), C5 (setTimeout fallback), C6 (no reconnect re-join), C8 (getCurrentState missing states), D4 (name vs firstName), A2 (accept no status check), A3 (reject no re-broadcast), F2 (firstName undefined), F7 (CAPTAIN_ARRIVED missing) |
| **P2 — Important** | G3 (socket singleton), D3 (non-atomic accept), F3 (hardcoded locations), F5 (no error feedback), F6 (no persistence) |
| **P3 — Reliability** | R6 (meta hash growth), A4 (no rate limiting), S6 (CORS wildcard) |
| **P4 — Minor** | D5, R5 |

---

## Corrected Architecture

```
RIDER FLOW:
  Login → JWT in cookie → Socket connects to personal room rider:{userId}
  ↓
  Book ride → POST /rides → ride created (SEARCHING) → startMatchingForRide()
  ↓
  Frontend sets activeRide → useRiderSocket joins ride:{rideId}
  Backend ALSO: server-side socket join for rider into ride:{rideId}
  ↓
  Captain accepts → emit to ride:{rideId} AND rider:{riderId} (personal room)
  ↓
  Rider receives ride:captain_assigned on personal room (no timing race)
  ↓
  Status updates: ride:captain_arrived, ride:started, ride:completed → to ride:{rideId}

CAPTAIN FLOW:
  Login → POST /captains/online → status = AVAILABLE, GPS emit starts
  ↓
  Ride created → Backend finds captain via Redis GEO → emit ride:new to captain:{userId}
  ↓
  Captain accepts → POST /rides/:id/accept → atomic updateMany + captain status reset
  ↓
  Captain declines → POST /rides/:id/reject → RideRejection created → re-broadcast
  ↓
  State progression: arrived → start → complete → captain status = AVAILABLE
  ↓
  Socket disconnect → captain DB status → OFFLINE
```

---

## Step-by-Step Fix Plan

### Phase 1: Critical Socket Fix (unblocks entire flow)
1. **Backend**: Emit `ride:captain_assigned` to `rider:${riderId}` personal room in addition to `ride:${rideId}`
2. **Frontend**: Register `ride:captain_assigned` listener unconditionally (not inside `if (activeRide)`) in `useRiderSocket.ts`
3. **Frontend**: Re-emit `join_ride` on socket `connect` event for reconnect support

### Phase 2: Captain State Machine
4. **Backend**: Add captain status check (`AVAILABLE`) in `acceptRide` before accepting
5. **Backend**: Fix `cancelRide` to reset captain status (verify the fix applied earlier is complete)
6. **Backend**: On socket disconnect, set captain DB status to `OFFLINE` if they were `AVAILABLE`
7. **Frontend**: Add `POST /rides/:id/reject` call in `handleDecline`

### Phase 3: Re-broadcast on Rejection
8. **Backend**: After creating `RideRejection`, call `startMatchingForRide` to re-broadcast to other captains

### Phase 4: Schema/Display Fixes
9. **Frontend `ActiveRideSidebar`**: Use `captain.user.name` instead of `firstName`/`lastName`
10. **Frontend `captain.service.ts`**: Add `CAPTAIN_ARRIVED` to active ride status filter

### Phase 5: Durability
11. **Backend**: Replace `setTimeout` 2-minute fallback with BullMQ delayed job
12. **Frontend**: Add `join_ride` re-emit on socket `reconnect` event

### Verification
- Re-run `npx playwright test` — expect 1 passed
- Manual test: cancel a ride mid-flow → captain can still go offline
- Manual test: captain socket disconnect → captain removed from GEO AND set offline in DB
