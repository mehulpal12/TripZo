# TripZo / Rapido — Production-Grade Architecture Analysis

> **Scope:** Full-stack audit of the real-time ride-sharing system.  
> **Stack:** Node.js · Express 5 · Socket.io 4 · Redis (node-redis + ioredis) · PostgreSQL (Prisma 5) · BullMQ · Next.js 16 · Zustand · Axios  
> **Date:** September 2026  

---

## Table of Contents

1. [Socket.io Real-Time Layer](#1-socketio-real-time-layer)
2. [Redis Dual-Client Architecture](#2-redis-dual-client-architecture)
3. [Matching Service — Geo Search Pipeline](#3-matching-service--geo-search-pipeline)
4. [Ride State Machine & Concurrency Control](#4-ride-state-machine--concurrency-control)
5. [BullMQ Job Queue & Reconciliation](#5-bullmq-job-queue--reconciliation)
6. [Authentication & Token Management](#6-authentication--token-management)
7. [HTTP API Layer — Rate Limiting, Validation & DoS Surface](#7-http-api-layer--rate-limiting-validation--dos-surface)
8. [Database Layer — Connection Pooling & Query Efficiency](#8-database-layer--connection-pooling--query-efficiency)
9. [Frontend — Socket Client, State Drift & GPS Simulator](#9-frontend--socket-client-state-drift--gps-simulator)
10. [Operational Gaps — Observability, Deployment & Resilience](#10-operational-gaps--observability-deployment--resilience)
11. [Summary Priority Matrix](#11-summary-priority-matrix)

---

## 1. Socket.io Real-Time Layer

**File:** `backend/src/socket.ts`

### 1.1 Critical Edge Cases & Failure Modes

#### A — Redis Adapter Race Condition on Boot

```typescript
// socket.ts : L22-26
Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
}).catch(err => {
  console.error('Failed to initialize Redis Adapter:', err);
});
```

**Failure Mode:** `initializeSocket()` returns `io` immediately and the server begins accepting connections. If Redis is slow to connect (cold start, network blip), incoming sockets can fully authenticate and join rooms *before* the Redis adapter is installed. Those sockets are handled by the in-memory adapter. When the Redis adapter activates mid-session, those sockets are invisible to other server pods — events emitted to their rooms are silently dropped. This is a **split-brain scenario** with zero error visibility.

#### B — Silent Event Drop on `startMatchingForRide`

```typescript
// ride.service.ts : L111-113
} catch (err) {
  console.error('Error during matching flow:', err);
}
```

`startMatchingForRide` swallows all errors with a `console.error`. If Redis is unavailable or `getIO()` throws (server not yet initialised), captains are never notified and the ride hangs in `SEARCHING` with no automatic retry path (the BullMQ `cancelIfNoAssignment` job is *also* queued inside this same try-block, so it may not be added either).

#### C — CORS Wildcard `origin: '*'`

```typescript
// socket.ts : L13-14
cors: {
  origin: '*', // Adjust for production
```

This comment was never actioned. A wildcard CORS origin on a WebSocket server that authenticates with JWTs in `auth.token` means any webpage on the internet can open a socket connection. Combined with a stolen/leaked JWT, this is a trivial cross-origin socket hijack.

#### D — Disconnect Handler: Missing `await` on Redis Cleanup

```typescript
// socket.ts : L122-126
Promise.all([
  redisClient.zRem('captain_locations', user.userId),
  redisClient.hDel('captain_location_meta', user.userId)
]).catch(console.error);
```

The disconnect handler fires-and-forgets. If Redis is degraded and the cleanup fails, the captain's `userId` remains in the `captain_locations` GEO set indefinitely, causing ghost captains to receive `ride:new` events via `getNearbyCaptains`, or worse, to be selected and notified for a ride they cannot accept.

#### E — `join_ride` Is Unauthenticated & Unauthorised

```typescript
// socket.ts : L62-65
socket.on('join_ride', (rideId: string) => {
  socket.join(`ride:${rideId}`);
});
```

Any authenticated user (rider OR captain) can call `join_ride` with an arbitrary UUID. There is no check that the `rideId` actually exists or that the requesting user is a participant of that ride. A malicious rider can join `ride:<any-uuid>` and eavesdrop on all live events for that ride, including captain location, OTP-equivalent status events, and cancel signals.

---

### 1.2 Root Cause Analysis

- The adapter race stems from treating an async infrastructure connection as a fire-and-forget side effect during synchronous server boot.
- The silent catch in `startMatchingForRide` is a consequence of it being called in a `void` context — the caller (`createRide`) awaits it but the inner flow has no guaranteed fallback.
- `join_ride` is authorisation-free because the MVP focused on functionality before hardening.

---

### 1.3 Engineering Solutions

**Fix A — Await adapter before accepting connections:**

```typescript
export const initializeSocket = async (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, { cors: { origin: env.CORS_ORIGIN } });

  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  // NOW attach middleware and connection handlers
  io.use(authMiddleware);
  io.on('connection', connectionHandler);

  return io;
};
```

And in `server.ts`, await the call: `await initializeSocket(server);` before `server.listen()`.

**Fix B — Propagate errors out of `startMatchingForRide`:**

```typescript
export const startMatchingForRide = async (...) => {
  // Remove the top-level try/catch. Let errors bubble to the caller.
  const io = getIO();

  // Queue BullMQ job OUTSIDE the matching logic — always runs:
  const { rideQueue } = await import('../jobs/rideQueue');
  await rideQueue.add('cancelIfNoAssignment', { rideId }, {
    delay: 2 * 60 * 1000,
    jobId: `cancel-timeout-${rideId}`,
  });
};

// In createRide:
export const createRide = async (data) => {
  const ride = await prisma.ride.create({ ... });
  try {
    await startMatchingForRide(ride.id, ...);
  } catch (err) {
    logger.error(`Matching failed for ride ${ride.id}`, err);
    // BullMQ timeout job is guaranteed — ride will self-cancel
  }
  return ride;
};
```

**Fix C — Authorised `join_ride`:**

```typescript
socket.on('join_ride', async (rideId: string) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) return socket.emit('error', { code: 'RIDE_NOT_FOUND' });

  const captainProfile = user.role === 'CAPTAIN'
    ? await prisma.captain.findUnique({ where: { userId: user.userId } })
    : null;

  const isParticipant =
    (user.role === 'RIDER' && ride.riderId === user.userId) ||
    (user.role === 'CAPTAIN' && captainProfile?.id === ride.captainId);

  if (!isParticipant) return socket.emit('error', { code: 'UNAUTHORIZED' });

  socket.join(`ride:${rideId}`);
});
```

**Fix D — CORS tightening:**

```typescript
cors: {
  origin: env.CORS_ORIGIN, // e.g. "https://tripzo.app"
  methods: ['GET', 'POST'],
  credentials: true,
},
```

---

## 2. Redis Dual-Client Architecture

**Files:** `backend/src/config/redis.ts`, `backend/src/jobs/rideQueue.ts`

### 2.1 Critical Edge Cases & Failure Modes

#### A — Two Incompatible Redis Clients Running in Parallel

The codebase runs **two entirely separate Redis client libraries simultaneously**:

| Library | Used By | Instance |
|---|---|---|
| `redis` (node-redis v6) | `redisClient` | GEO, hash, pub/sub adapter |
| `ioredis` | BullMQ `connection` | Queue & Worker |

Both connect to the same Redis URL. This means two separate connection pools consuming Redis's `maxclients` quota. On `SIGTERM`, `server.ts` calls `redisClient.quit()` (node-redis) but never closes the `ioredis` connection — it leaks until the process is killed.

#### B — No Redis Connection Backpressure

```typescript
// redis.ts : L5-7
export const redisClient = createClient({
  url: env.REDIS_URL,
});
```

No `socket.connectTimeout`, `commandTimeout`, or retry strategy is configured. Under network partition, `redisClient` commands queue indefinitely until the connection resumes. If 10,000 captain location updates back up, they all fire simultaneously when Redis reconnects — a **thundering herd** of write commands.

#### C — `Promise.all` GEO+Hash Write Is Not Atomic

```typescript
// socket.ts : L94-101
await Promise.all([
  redisClient.geoAdd('captain_locations', { ... }),
  redisClient.hSet('captain_location_meta', user.userId, timestamp.toString())
]);
```

`Promise.all` is not atomic. If `geoAdd` succeeds but `hSet` fails, the GEO set and metadata hash are desynchronised. The staleness filter in `getNearbyCaptains` relies on the hash — a captain without a hash entry is classified as stale and removed from the GEO set, making them invisible.

### 2.2 Root Cause Analysis

The dual-client pattern emerged from BullMQ's requirement for `ioredis` and the existing `node-redis` client. No unification strategy was applied. The lack of connection configuration reflects an MVP approach where infrastructure reliability was assumed.

### 2.3 Engineering Solutions

**Consolidate on ioredis across the entire backend:**

```typescript
// config/redis.ts — rewrite with ioredis
import Redis from 'ioredis';

const redisOptions = {
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  commandTimeout: 2000,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
  tls: env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
};

export const redisClient = new Redis(env.REDIS_URL, redisOptions);
export const redisPub   = new Redis(env.REDIS_URL, redisOptions);
export const redisSub   = new Redis(env.REDIS_URL, redisOptions);
```

**Use Lua script for atomic GEO+hash write:**

```lua
-- scripts/update_captain_location.lua
local geo_key  = KEYS[1]
local meta_key = KEYS[2]
local userId   = ARGV[1]
local lng      = ARGV[2]
local lat      = ARGV[3]
local ts       = ARGV[4]

redis.call('GEOADD', geo_key, lng, lat, userId)
redis.call('HSET', meta_key, userId, ts)
return 1
```

```typescript
await redisClient.eval(luaScript, 2,
  'captain_locations', 'captain_location_meta',
  user.userId, String(lng), String(lat), String(timestamp)
);
```

**Graceful shutdown — close all connections:**

```typescript
await rideWorker.close();
await rideQueue.close();
redisClient.disconnect();
redisPub.disconnect();
redisSub.disconnect();
await prisma.$disconnect();
```

---

## 3. Matching Service — Geo Search Pipeline

**File:** `backend/src/services/matching.service.ts`

### 3.1 Critical Edge Cases & Failure Modes

#### A — N+1 Redis Round Trips in Stale Detection

```typescript
// matching.service.ts : L32-44
for (const member of nearbyMembers) {
  const timestampStr = await redisClient.hGet('captain_location_meta', member);
  ...
}
```

For every captain returned by `geoSearch`, a separate `HGET` is issued **serially inside a for-loop**. With 50 nearby captains, this is 50 sequential Redis round trips adding ~50ms of serial latency before the Postgres query even begins.

#### B — Matching Fan-Out: No Rate Limit Per Captain

```typescript
// ride.service.ts : L86-94
nearbyCaptains.forEach((captain) => {
  io.to(`captain:${captain.userId}`).emit('ride:new', { ... });
});
```

If `rejectRide` triggers `startMatchingForRide` in a rapid chain (all 5 nearby captains reject), this creates 5 overlapping Postgres queries + 5 Redis geo-searches within a 2-second window for a single ride. There is no circuit-breaker or rejection count cap.

#### C — Hardcoded `vehicleType = 'BIKE'` in `startMatchingForRide`

```typescript
// ride.service.ts : L80
const vehicleType = 'BIKE'; // Assuming BIKE for MVP
```

The `vehicleType` the rider selects is stored in the DB but **never passed through** the matching flow. This makes AUTO/CAB vehicle types permanently non-functional even though the schema and UI support them.

### 3.2 Root Cause Analysis

The N+1 Redis issue stems from using a single `HGET` instead of `HMGET`. The rejection loop is an architectural gap — no circuit breaker, no rejection count cap, no exponential back-off.

### 3.3 Engineering Solutions

**Fix A — Batch HMGET instead of serial HGET:**

```typescript
const timestamps = await redisClient.hmGet('captain_location_meta', nearbyMembers);
const staleThreshold = Date.now() - 5 * 60 * 1000;

const activeMembers: string[] = [];
const staleMembers: string[] = [];

nearbyMembers.forEach((member, i) => {
  const ts = timestamps[i];
  if (!ts || parseInt(ts, 10) < staleThreshold) {
    staleMembers.push(member);
  } else {
    activeMembers.push(member);
  }
});
```

**Fix B — Rejection circuit breaker:**

```typescript
// In rejectRide() before re-broadcasting:
const rejectionCount = await prisma.rideRejection.count({ where: { rideId } });
const MAX_BROADCAST_ROUNDS = 3;

if (rejectionCount >= MAX_BROADCAST_ROUNDS) {
  await cancelRideBySystem(rideId, 'MAX_REJECTIONS_REACHED');
  return { success: true };
}

// Exponential back-off to prevent thundering herd:
setTimeout(() => startMatchingForRide(...), 500 * rejectionCount);
```

**Fix C — Thread vehicleType through the matching pipeline:**

```typescript
// ride.service.ts
const vehicleType = data.vehicleType || 'BIKE';
await startMatchingForRide(ride.id, ..., vehicleType);

// startMatchingForRide signature update:
export const startMatchingForRide = async (
  rideId: string, ..., vehicleType: string
) => { ... }
```

---

## 4. Ride State Machine & Concurrency Control

**File:** `backend/src/services/ride.service.ts`

### 4.1 Critical Edge Cases & Failure Modes

#### A — TOCTOU in `acceptRide`: Captain Stuck in ON_RIDE

```typescript
// ride.service.ts : L232-287
const captain = await prisma.captain.findUnique({ where: { userId: captainUserId } });
// ...
const ride = await prisma.ride.findUnique({ where: { id: rideId } });
// ← GAP: another captain can accept between these reads and the update

const updatedCount = await prisma.ride.updateMany({
  where: { id: rideId, status: RideStatus.SEARCHING, version: ride.version },
  ...
});
```

**Race Condition:**
1. Captain A checks: `status === AVAILABLE` ✅
2. Captain B checks: `status === AVAILABLE` ✅ (simultaneously)
3. Captain A wins the `ride.updateMany` (version matches).
4. Captain B's `ride.updateMany` fails due to version mismatch.
5. **BUT** — both captains proceed to `prisma.captain.update({ status: ON_RIDE })`.
6. Captain B is now in `ON_RIDE` permanently with no assigned ride.

The optimistic lock protects `Ride` but **not** `Captain`. The two-entity update needs to be inside a serialisable transaction.

#### B — Non-Atomic Captain Status + Redis Cache Update

```typescript
// ride.service.ts : L283-293
await prisma.captain.update({ data: { status: CaptainStatus.ON_RIDE } });

if (redisClient.isReady) {
  await redisClient.set(`ride_assignment:${captainUserId}`, rideId, { EX: 86400 });
}
```

If the process crashes between the Postgres update and the Redis `set`, the captain is `ON_RIDE` in Postgres but has no Redis assignment cache. The `captain:location` handler checks `ride_assignment:userId` — without it, all location updates for that ride are silently dropped.

#### C — Manual Cancel Does Not Remove the BullMQ Timeout Job

When a rider manually cancels within the 2-minute window, the `cancelIfNoAssignment` BullMQ job still fires. At lines 76-83 of `rideQueue.ts`, even when `updatedCount.count === 0` (ride already CANCELLED), the code paths after the `if` block can still execute socket emits — causing a double `ride:cancelled` event to the rider.

#### D — `getRideHistory` Captain Query Uses Wrong ID

```typescript
// ride.controller.ts : L131-133
const rides = await prisma.ride.findMany({
  where: { captainId: userId }, // ❌ userId is User.id, not Captain.id!
```

`ride.captainId` stores `Captain.id` (the CUID from the `Captain` table), not `User.id`. A captain's ride history will **always return an empty array** because the filter is comparing against the wrong ID column. This is a silent production data bug.

### 4.2 Root Cause Analysis

The TOCTOU is the most dangerous flaw. Optimistic locking protects the `Ride` record but not the `Captain` record. The ride history bug is a classic ID confusion issue between the `User.id` and `Captain.id` for the same person.

### 4.3 Engineering Solutions

**Fix A — Wrap `acceptRide` in a serialisable transaction:**

```typescript
export const acceptRide = async (rideId: string, captainUserId: string) => {
  return await prisma.$transaction(async (tx) => {
    // SELECT FOR UPDATE on captain — prevents double-accept atomically
    const captain = await tx.$queryRaw<Captain[]>`
      SELECT * FROM "Captain"
      WHERE "userId" = ${captainUserId} AND status = 'AVAILABLE'
      FOR UPDATE SKIP LOCKED
    `;
    if (!captain[0]) throw new AppError('CAPTAIN_NOT_AVAILABLE', 409, 'Captain is not available');

    const updatedRide = await tx.ride.updateMany({
      where: { id: rideId, status: RideStatus.SEARCHING },
      data: { status: RideStatus.CAPTAIN_ASSIGNED, captainId: captain[0].id, version: { increment: 1 } },
    });
    if (updatedRide.count === 0) throw new AppError('CONCURRENCY_ERROR', 409, 'Ride already taken');

    await tx.captain.update({
      where: { id: captain[0].id },
      data: { status: CaptainStatus.ON_RIDE },
    });

    return tx.ride.findUnique({ where: { id: rideId }, include: { captain: { include: { user: true } } } });
  }, { isolationLevel: 'Serializable' });
};
```

**Fix B — Remove BullMQ job on manual cancel:**

```typescript
// In cancelRide(), after the DB update succeeds:
const { rideQueue } = await import('../jobs/rideQueue');
await rideQueue.remove(`cancel-timeout-${rideId}`).catch(() => {
  // Job may have already executed — safe to ignore
});
```

**Fix C — Fix captain ride history:**

```typescript
} else {
  const captainProfile = await prisma.captain.findUnique({ where: { userId } });
  if (!captainProfile) return res.status(404).json({ success: false, error: 'Captain profile not found' });

  const rides = await prisma.ride.findMany({
    where: { captainId: captainProfile.id }, // Use Captain.id, not User.id
    orderBy: { createdAt: 'desc' },
  });
}
```

---

## 5. BullMQ Job Queue & Reconciliation

**File:** `backend/src/jobs/rideQueue.ts`

### 5.1 Critical Edge Cases & Failure Modes

#### A — `setInterval` Reconciliation Is Not Distributed-Safe

```typescript
// rideQueue.ts : L121-128
setInterval(async () => {
  await rideQueue.add('reconciliation', {}, { jobId: `reconciliation-${Date.now()}` });
}, 5 * 60 * 1000);
```

`setInterval` runs in-process. In a horizontally scaled deployment with 3 pods, this fires **3 separate reconciliation jobs every 5 minutes**. The `jobId` includes `Date.now()` which differs per pod — BullMQ's deduplication provides zero protection. This is a **thundering herd on the database** at every interval boundary.

#### B — Reconciliation Logic Has an Off-By-One Bug

```typescript
// rideQueue.ts : L94
const pastTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins in future
```

The reconciliation will also match rides scheduled in the *next* 15 minutes that **already have a pending BullMQ `startMatching` job**. Reconciliation should only fire for rides where the BullMQ job was *missed*, not for rides that are legitimately queued — leading to duplicate job enqueue attempts.

#### C — Worker Has No Concurrency Limit or Backpressure

```typescript
export const rideWorker = new Worker('scheduled-rides-queue', async (job) => { ... }, { connection });
```

No `concurrency` or `limiter` option is set. The `reconciliation` job can enqueue hundreds of `startMatching` jobs in a single sweep, all of which then attempt to call `startMatchingForRide` simultaneously — hammering both Postgres and Redis.

#### D — ioredis BullMQ Connection Has No Event Handlers

```typescript
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  ...
});
```

No `error`, `connect`, or `close` event handlers. An ioredis connection failure is silently swallowed. In production, the job queue can silently die without any alerting.

### 5.2 Root Cause Analysis

The `setInterval` approach is a classic single-instance pattern that was never evolved for horizontal scale. BullMQ already provides a built-in `repeat` job that uses Redis for distributed deduplication — it was simply unused.

### 5.3 Engineering Solutions

**Fix A — Replace `setInterval` with BullMQ repeatable job:**

```typescript
export const initReconciliationJob = async () => {
  // Remove ALL existing repeatable jobs (idempotent boot):
  const repeatableJobs = await rideQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'reconciliation') await rideQueue.removeRepeatableByKey(job.key);
  }

  // Add a single distributed-safe repeatable job:
  await rideQueue.add('reconciliation', {}, {
    repeat: { every: 5 * 60 * 1000 },
    jobId: 'reconciliation-singleton', // Identical ID = BullMQ deduplicates across pods
  });
};
```

**Fix B — Guard against already-queued rides in reconciliation:**

```typescript
for (const missed of missedRides) {
  const existingJob = await rideQueue.getJob(`startMatching-${missed.id}`);
  if (!existingJob) {
    await rideQueue.add('startMatching', { rideId: missed.id }, {
      jobId: `startMatching-${missed.id}`,
    });
  }
}
```

**Fix C — Add connection telemetry & worker concurrency:**

```typescript
connection.on('error', (err) => logger.error('BullMQ Redis error', err));
connection.on('connect', () => logger.info('BullMQ Redis connected'));

export const rideWorker = new Worker('scheduled-rides-queue', processor, {
  connection,
  concurrency: 5,
  limiter: { max: 20, duration: 10_000 },
});
```

---

## 6. Authentication & Token Management

**Files:** `backend/src/middleware/auth.ts`, `backend/src/controllers/auth.controller.ts`, `frontend/app/middleware.ts`

### 6.1 Critical Edge Cases & Failure Modes

#### A — JWT Revocation Gap (Logout Does Not Invalidate Access Token)

```typescript
// auth.controller.ts : L141-155
export const logout = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshSession.deleteMany({ where: { token: refreshToken } });
  }
  // Access token remains valid for up to 15 minutes after logout
};
```

If a user's session is compromised, the attacker retains API access and WebSocket access for up to 15 minutes post-logout.

#### B — Next.js Middleware Decodes JWT Without Signature Verification

```typescript
// frontend/app/middleware.ts : L11-18
const payloadBase64 = token.split('.')[1];
const payloadDecoded = atob(payloadBase64);
const payload = JSON.parse(payloadDecoded);
role = payload.role;
```

This is Base64 **decode**, not JWT **verify**. A user could craft a fake JWT with `role: 'ADMIN'` — the middleware grants access to protected routes based on the forged role. The actual API calls would still fail (backend verifies), but frontend route protection is completely bypassed.

#### C — Refresh Token Rotation: No Reuse Detection

Token rotation is implemented (old token is deleted on refresh). However, there is no **reuse detection**. If an attacker intercepts a refresh token and uses it first, the legitimate user gets a 401, but the session theft is entirely invisible — no alerting, no account lockout.

#### D — `bcrypt` Salt Rounds = 10 (Below OWASP 2024 Standard)

```typescript
// crypto.ts : L6
const salt = await bcrypt.genSalt(10);
```

OWASP's 2024 recommendation for bcrypt is **12+ rounds**. At 10 rounds, a modern GPU (RTX 4090) can test ~100K hashes/second — relevant given passwords are stored in a cloud Postgres DB (Neon) where a breach would expose hashes crackable at scale.

### 6.2 Root Cause Analysis

The JWT revocation gap is an inherent limitation of stateless JWTs — the correct solution requires a server-side denylist. The Next.js middleware issue is a common pitfall when porting server-side auth logic to the Edge Runtime which lacks Node.js crypto APIs.

### 6.3 Engineering Solutions

**Fix A — Access token denylist via Redis:**

```typescript
// In logout handler:
const token = req.headers.authorization?.split(' ')[1];
if (token) {
  const decoded = jwt.decode(token) as any;
  const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  if (ttl > 0) {
    await redisClient.set(`denylist:${token}`, '1', { EX: ttl });
  }
}

// In requireAuth middleware:
const isDenied = await redisClient.get(`denylist:${token}`);
if (isDenied) throw new AppError('UNAUTHORIZED', 401, 'Token has been revoked');
```

**Fix B — Use `jose` for Edge-compatible JWT verification:**

```typescript
// frontend/app/middleware.ts
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);

async function getRoleFromToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role as string;
  } catch {
    return null; // Invalid signature → null role → redirect to login
  }
}
```

**Fix C — Increase bcrypt rounds:**

```typescript
// crypto.ts
const BCRYPT_ROUNDS = 12;
const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
```

---

## 7. HTTP API Layer — Rate Limiting, Validation & DoS Surface

**Files:** `backend/src/app.ts`, `backend/src/routes/ride.routes.ts`

### 7.1 Critical Edge Cases & Failure Modes

#### A — No Rate Limiting Anywhere

```typescript
// app.ts — no rate limiter middleware present
app.use(helmet());
app.use(cors({ ... }));
app.use(express.json());
// ← No express-rate-limit, no throttling
```

Critical attack vectors:
- `POST /auth/login` → brute-force credential stuffing with no lock-out
- `POST /rides` → single authenticated user can create thousands of rides/second, exhausting Postgres connections and flooding BullMQ
- `GET /rides/fare` → no throttle on fare computation

#### B — `getRideHistory` Has No Pagination

```typescript
// ride.controller.ts : L121-128
const rides = await prisma.ride.findMany({
  where: { riderId: userId },
  orderBy: { createdAt: 'desc' },
  // ← No skip, take — fetches ALL rides for this user
});
```

A long-running user with 10,000 rides causes `findMany` to return all rows in a single query, saturating the Postgres connection pool and causing OOM when serialising the response.

#### C — Fare Endpoint Accepts `NaN`/`Infinity` Coordinates

```typescript
// ride.controller.ts : L10-12
parseFloat(pickupLat as string) // parseFloat('Infinity') → Infinity, parseFloat('NaN') → NaN
```

`parseFloat('Infinity')` returns `Infinity`. Passing `Infinity` to `Math.sin` returns `NaN`. The `> 100` distance check with `NaN` evaluates to `false` — so `NaN * BIKE_RATE_PER_KM = NaN` is returned as `estimatedFare`. Prisma coerces `NaN` to `null`. A ride is created with a `null` fare stored in Postgres.

### 7.2 Engineering Solutions

**Fix A — Add rate limiting with Redis store:**

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  store: new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args) }),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts' } },
});

const rideLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  store: new RedisStore({ ... }),
});

app.use('/auth/login', authLimiter);
app.use('/rides', rideLimiter);
```

**Fix B — Pagination on history endpoint:**

```typescript
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
const skip = (page - 1) * limit;

const [rides, total] = await Promise.all([
  prisma.ride.findMany({ where: { riderId: userId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
  prisma.ride.count({ where: { riderId: userId } }),
]);
```

**Fix C — Validate finite numbers in fare service:**

```typescript
export const estimateFare = (pickupLat: number, ...) => {
  if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng) ||
      !Number.isFinite(destLat) || !Number.isFinite(destLng)) {
    throw new AppError('INVALID_COORDINATES', 400, 'Coordinates must be finite numbers');
  }
};
```

---

## 8. Database Layer — Connection Pooling & Query Efficiency

**File:** `backend/src/config/db.ts`

### 8.1 Critical Edge Cases & Failure Modes

#### A — No Connection Pool Configuration

```typescript
// db.ts
export const prisma = new PrismaClient({
  log: [{ level: 'warn', emit: 'event' }, { level: 'error', emit: 'event' }],
});
```

Prisma defaults to **10 connections**. Under surge load (20 concurrent ride requests + 5 BullMQ workers each making 2-3 queries), the pool saturates and requests queue, causing timeout errors surfacing as unreadable 500s.

#### B — Captain Ride History Fetches by Wrong ID (Silent Data Bug)

```typescript
// ride.controller.ts : L131-133
where: { captainId: userId }, // ❌ userId = User.id, captainId column = Captain.id
```

`Ride.captainId` stores `Captain.id` (the CUID), not `User.id` (the UUID). A captain's history endpoint will **always return an empty array**. This is a completely silent failure — no error is thrown.

#### C — Missing Composite Indices

The schema has single-column indices but the queries use composite filters:
- Reconciliation: `WHERE status = 'SCHEDULED' AND scheduledAt <= ?` — needs `(status, scheduledAt)`
- History: `WHERE riderId = ? ORDER BY createdAt DESC` — needs `(riderId, createdAt)`

Full table scans occur as the `Ride` table grows past tens of thousands of records.

### 8.2 Engineering Solutions

**Fix A — Explicit pool + connection timeout:**

```typescript
export const prisma = new PrismaClient({
  datasources: {
    db: { url: `${env.DATABASE_URL}?connection_limit=20&pool_timeout=10` },
  },
});
// For Neon with PgBouncer:
// url: `${env.DATABASE_URL}?pgbouncer=true&connection_limit=5`
```

**Fix B — Add composite indices:**

```prisma
// schema.prisma additions:
@@index([status, scheduledAt])
@@index([riderId, createdAt(sort: Desc)])
@@index([captainId, createdAt(sort: Desc)])
```

---

## 9. Frontend — Socket Client, State Drift & GPS Simulator

**Files:** `frontend/app/lib/socket/socket.client.ts`, `frontend/app/hooks/useCaptainSocket.ts`

### 9.1 Critical Edge Cases & Failure Modes

#### A — Socket Client Module-Level Singleton: SSR Hazard

```typescript
// socket.client.ts : L61
export const socketClient = new SocketClient();
```

This is a module-level singleton. In Next.js App Router with SSR, this module can be imported during server-side rendering. The `connect()` method reads `document.cookie` via `js-cookie` — which throws on the server (no `document`). Any server component that imports this transitively will crash.

#### B — Socket Reconnection Does Not Re-Authenticate

```typescript
// socket.client.ts : L18-24
this.socket = io(this.url, {
  auth: { token },          // Token captured at connection time
  reconnection: true,
  reconnectionAttempts: 5,
});
```

The token is captured at first `connect()` and embedded in the `io()` options. Socket.io's built-in reconnection reuses the original `auth` object. When the access token expires (15 minutes), all reconnection attempts fail authentication — the user's socket silently dies with no fallback to refresh and reconnect.

#### C — `handleReject` Does Not Call the Backend

```typescript
// IncomingRequestModal.tsx : L50-52
const handleReject = () => {
  setActiveRequest(null); // Local state only — no API call to POST /rides/:id/reject
};
```

When a captain clicks "Reject":
- No `RideRejection` record is created in Postgres
- The captain is not excluded from future re-broadcasts of the same ride
- The same `ride:new` event is re-emitted to the captain on next `startMatchingForRide`

#### D — `socket.off('ride:new')` Removes All Listeners (Not Just This One)

```typescript
// useCaptainSocket.ts : L40
socket.off('ride:new'); // ← Removes ALL 'ride:new' listeners app-wide
```

Passing no handler reference to `socket.off` removes every registered handler for that event. This is dangerous if other parts of the app register their own `ride:new` listeners — they are silently removed.

#### E — `IncomingRequestModal` Timer Does Not Reset on New Request

```typescript
const [timeLeft, setTimeLeft] = useState(15);
useEffect(() => {
  if (!activeRequest) { setTimeLeft(15); return; }
  ...
}, [activeRequest, setActiveRequest]);
```

If a captain rejects at `timeLeft = 5` and immediately receives a new request, `timeLeft` state (5) may persist from the previous render cycle before cleanup runs. The captain sees the new request with only 5 seconds to respond.

#### F — Active Ride Sidebar Has Hardcoded Static Data

```typescript
// ActiveRideSidebar.tsx : L32, L44, L50-51, L58-60
<span>52ms / SYNC</span>          // Hardcoded latency
<span id="eta-display">14</span>  // Hardcoded ETA
<span id="distance-display">8.2 km</span>  // Hardcoded distance
<span>42 KM/H VELOCITY</span>     // Hardcoded speed
<span>Optimal Flow · NH-48</span> // Hardcoded route
```

All telemetry data in the sidebar is hardcoded. The ETA, distance, speed, and route shown to the rider are fictional and unrelated to the actual ride. In production, this breaks user trust and creates a safety issue (riders navigating based on fake data).

### 9.2 Engineering Solutions

**Fix A — Guard singleton against SSR:**

```typescript
connect() {
  if (typeof window === 'undefined') return null; // SSR guard
  if (this.socket?.connected) return this.socket;
  ...
}
```

**Fix B — Refresh token before reconnect:**

```typescript
this.socket.io.on('reconnect_attempt', async () => {
  try {
    const refreshToken = Cookies.get('refreshToken');
    if (refreshToken) {
      const res = await axios.post(`${this.url}/auth/refresh`, { refreshToken });
      const { accessToken } = res.data.data;
      Cookies.set('token', accessToken, { expires: 7 });
      this.socket!.auth = { token: accessToken };
    }
  } catch {
    Cookies.remove('token'); Cookies.remove('refreshToken');
    window.location.href = '/login';
  }
});
```

**Fix C — Fix reject handler to call backend:**

```typescript
const handleReject = async () => {
  try {
    await captainService.rejectRide(activeRequest.id); // POST /rides/:id/reject
  } catch (err) {
    console.error('Failed to register rejection', err);
  } finally {
    setActiveRequest(null); // Always clear UI
  }
};
```

**Fix D — Named handler reference in cleanup:**

```typescript
const handleNewRide = (rideData: any) => { setActiveRequest({ ... }); };
socket.on('ride:new', handleNewRide);
return () => {
  socket.off('ride:new', handleNewRide); // Precise named-handler removal
};
```

**Fix E — Force timer reset using request ID as key:**

```tsx
// Parent component:
<IncomingRequestModal key={activeRequest?.id} />
// React will unmount + remount the modal for each new request ID,
// resetting all local state including timeLeft to 15.
```

---

## 10. Operational Gaps — Observability, Deployment & Resilience

### 10.1 Critical Gaps

#### A — No Distributed Tracing / Request Correlation

The `logger.ts` uses Winston but no `traceId`/`requestId` is propagated through the request lifecycle. When a ride fails mid-flow, there is no way to correlate:
- The `POST /rides` log entry
- The `startMatchingForRide` log entry
- The BullMQ job log entry
- The Socket emit log entry

Debugging production incidents is purely guess-based.

#### B — No Health Check for BullMQ or Socket Adapter in `/ready`

```typescript
// app.ts : L21-31
app.get('/ready', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;    // DB checked
  if (!redisClient.isReady) throw ...; // Redis surface-checked
  // ← BullMQ worker health NOT checked
  // ← Socket.io Redis adapter NOT checked
});
```

A Kubernetes readiness probe on `/ready` would pass even if BullMQ's connection is down, causing rides to be accepted but never matched.

#### C — Docker Compose Has No Redis Persistence

```yaml
services:
  redis:
    image: redis:7
    ports: ["6379:6379"]
    # ← No --appendonly yes, no volumes
```

On container restart, all captain GEO locations, metadata, assignment caches, and BullMQ job data are lost. All in-flight rides become zombie states in Postgres with no corresponding queue jobs.

### 10.2 Engineering Solutions

**Fix A — Add request ID middleware:**

```typescript
import { randomUUID } from 'crypto';

app.use((req, res, next) => {
  req.id = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});
```

**Fix B — Comprehensive `/ready` endpoint:**

```typescript
app.get('/ready', async (req, res) => {
  const checks = { postgres: false, redis: false, bullmq: false };

  try { await prisma.$queryRaw`SELECT 1`; checks.postgres = true; } catch {}
  try { await redisClient.ping(); checks.redis = true; } catch {}
  checks.bullmq = !rideWorker.closing;

  const allHealthy = Object.values(checks).every(Boolean);
  res.status(allHealthy ? 200 : 503).json({ status: allHealthy ? 'ready' : 'degraded', checks });
});
```

**Fix C — Docker Compose with persistence:**

```yaml
services:
  redis:
    image: redis:7
    command: redis-server --appendonly yes --appendfsync everysec
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## 11. Summary Priority Matrix

| # | Issue | Severity | Effort | File |
|---|---|---|---|---|
| 1 | `acceptRide` TOCTOU — captain stuck in ON_RIDE forever | 🔴 Critical | Medium | `ride.service.ts` |
| 2 | Captain ride history always empty (ID mismatch) | 🔴 Critical | Trivial | `ride.controller.ts` |
| 3 | `join_ride` unauthenticated — any user can eavesdrop rides | 🔴 Critical | Low | `socket.ts` |
| 4 | `handleReject` skips backend — captain gets re-notified in loop | 🔴 Critical | Trivial | `IncomingRequestModal.tsx` |
| 5 | `vehicleType` hardcoded to BIKE — AUTO/CAB permanently broken | 🔴 Critical | Trivial | `ride.service.ts` |
| 6 | Redis adapter race on boot — split-brain on multi-pod deploys | 🟠 High | Low | `socket.ts` |
| 7 | No rate limiting — brute-force login & ride flood possible | 🟠 High | Low | `app.ts` |
| 8 | Next.js middleware: JWT decoded without signature verify | 🟠 High | Low | `middleware.ts` |
| 9 | Socket reconnect doesn't refresh expired token — silent drop | 🟠 High | Medium | `socket.client.ts` |
| 10 | `startMatchingForRide` swallows errors — BullMQ job not queued | 🟠 High | Low | `ride.service.ts` |
| 11 | JWT revocation gap — attacker retains access 15min post-logout | 🟠 High | Medium | `auth.controller.ts` |
| 12 | N+1 Redis HGET in matching — 50 serial round trips per search | 🟡 Medium | Low | `matching.service.ts` |
| 13 | Reconciliation `setInterval` — 3× DB load on multi-pod deploy | 🟡 Medium | Low | `rideQueue.ts` |
| 14 | Non-atomic GEO + metadata write — invisible ghost captains | 🟡 Medium | Medium | `socket.ts` |
| 15 | BullMQ orphan job on manual cancel — double ride:cancelled event | 🟡 Medium | Low | `ride.service.ts` |
| 16 | `getRideHistory` unbounded — OOM risk on large accounts | 🟡 Medium | Low | `ride.controller.ts` |
| 17 | Fare endpoint accepts NaN/Infinity — null fare stored in DB | 🟡 Medium | Low | `fare.service.ts` |
| 18 | `socket.off('ride:new')` removes all listeners — silent breakage | 🟡 Medium | Trivial | `useCaptainSocket.ts` |
| 19 | Dual Redis clients — connection leak on shutdown | 🟡 Medium | Medium | `redis.ts` + `rideQueue.ts` |
| 20 | CORS wildcard `origin: '*'` on production WebSocket server | 🟡 Medium | Trivial | `socket.ts` |
| 21 | bcrypt rounds = 10, below OWASP 2024 minimum of 12 | 🟡 Medium | Trivial | `crypto.ts` |
| 22 | ActiveRideSidebar has hardcoded static telemetry data | 🟡 Medium | High | `ActiveRideSidebar.tsx` |
| 23 | Modal timer does not reset on new request — 5s instead of 15s | 🟢 Low | Trivial | `IncomingRequestModal.tsx` |
| 24 | Missing composite DB indices — table scans at scale | 🟢 Low | Low | `schema.prisma` |
| 25 | No distributed tracing / request correlation IDs | 🟢 Low | Medium | `app.ts` |
| 26 | Docker Compose Redis has no persistence — zombie rides on restart | 🟢 Low | Trivial | `docker-compose.yml` |
| 27 | No Prisma connection pool config — saturates at 10 connections | 🟢 Low | Trivial | `db.ts` |

---

*Analysis prepared against commit state as of September 14, 2026.*
