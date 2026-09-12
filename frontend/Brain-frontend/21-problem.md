# TRIPZO — Full Codebase Audit & Root-Cause Analysis

## Objective

The main flow of my TRIPZO application is currently not working correctly.

Before making ANY code changes, you must read and understand the **entire codebase** and perform a complete technical audit.

Do not assume that the existing implementation is correct.

Your first responsibility is to identify **all problems, broken flows, architectural issues, synchronization issues, and potential bugs** across the application.

---

# 1. Read the Entire Codebase First

Start by inspecting the complete project structure.

Understand:

- Frontend architecture
- Backend architecture
- Database schema
- Prisma models and relations
- API routes/controllers
- Services
- Middleware
- Authentication/authorization
- Redis implementation
- Redis GEO operations
- Socket.IO implementation
- Socket.IO events
- BullMQ/jobs
- Ride state management
- Rider flow
- Captain flow
- Scheduled ride flow
- Error handling
- Validation
- Environment/configuration
- Database transactions
- Logging

Do not modify code during this phase.

Create a mental model of how the complete application currently works.

---

# 2. Understand the Main TRIPZO Flow

Trace the complete ride lifecycle:

Rider:

Login
→ Search for ride
→ Request ride
→ Wait for captain
→ Receive captain request/confirmation
→ See captain details
→ Track captain location
→ Start ride
→ Track ride
→ Complete/cancel ride

Captain:

Login
→ Go online
→ Location becomes available
→ Become discoverable
→ Receive rider request
→ View request
→ Accept/Reject
→ Rider receives confirmation
→ Navigate to pickup
→ Arrive at pickup
→ Start ride
→ Complete/Cancel ride
→ Go available again

Trace every step through:

Frontend
→ API
→ Controller
→ Service
→ Database
→ Redis
→ Socket.IO
→ Frontend

Identify where the actual implementation differs from the intended flow.

---

# 3. Socket.IO Audit

Perform a complete Socket.IO audit.

Check:

- Socket connection lifecycle
- Authentication
- User/captain socket identification
- Rooms
- Joining/leaving rooms
- Event names
- Event payloads
- Event listeners
- Event emitters
- Duplicate listeners
- Missing listeners
- Missing emitters
- Incorrect room targeting
- Socket disconnections
- Reconnection
- Multiple browser tabs
- Stale socket connections
- Event ordering
- Race conditions
- Duplicate events
- Events emitted before a client is ready
- Events emitted to the wrong user
- Rider/captain synchronization
- Real-time ride status updates
- Real-time location updates

For every Socket.IO problem, identify:

- File
- Function
- Event
- Current behavior
- Expected behavior
- Root cause
- Severity
- Recommended fix

---

# 4. Redis Audit

Perform a complete Redis audit.

Check:

- Redis connection
- Connection lifecycle
- GEOADD
- GEOSEARCH/GEO queries
- GET/SET
- EXPIRE/TTL
- DEL
- Pub/Sub
- Redis key naming
- Data structure
- Serialization/deserialization
- Stale captain locations
- Offline captain cleanup
- Captain availability
- Location updates
- Distance calculations
- Redis/PostgreSQL synchronization
- Race conditions
- Duplicate data
- Missing expiration
- Incorrect keys
- Incorrect GEO coordinates
- Redis failure handling
- Reconnection handling

Determine exactly:

- What data belongs in Redis
- What data belongs in PostgreSQL
- Whether Redis is being used correctly as ephemeral state
- Whether PostgreSQL remains the source of truth for durable ride state

Identify every Redis-related problem.

---

# 5. Database & Prisma Audit

Inspect:

- Prisma schema
- Ride model
- Rider/User model
- Captain model
- Vehicle model
- Ride status
- Relations
- Indexes
- Constraints
- Transactions
- Race conditions
- Duplicate ride acceptance
- Incorrect updates
- Missing records
- Incorrect status transitions

Verify that ride state transitions are consistent.

For example:

REQUESTED
→ SEARCHING
→ ACCEPTED
→ ARRIVING
→ ARRIVED
→ IN_PROGRESS
→ COMPLETED

Also check cancellation states and scheduled rides.

Identify cases where two captains could accept the same ride.

---

# 6. API Audit

Inspect every API involved in:

- Rider search
- Ride creation
- Captain availability
- Captain location
- Ride acceptance
- Ride rejection
- Ride cancellation
- Ride start
- Ride completion
- Captain status
- Rider status

Check:

- Request validation
- Authentication
- Authorization
- HTTP status codes
- Response structure
- Error handling
- Database operations
- Redis operations
- Socket events triggered by APIs
- Duplicate requests
- Idempotency
- Race conditions

Trace each API from frontend request to final response.

---

# 7. Rider-Captain Matching Audit

This is one of the most important parts.

Understand exactly how the current system finds captains.

Expected architecture:

Rider requests ride
→ Find available nearby captains using Redis GEO
→ Create/maintain ride request
→ Notify suitable captains through Socket.IO
→ Captain sees request
→ Captain accepts/rejects
→ Backend atomically validates acceptance
→ Ride becomes accepted
→ Rider receives captain confirmation through Socket.IO
→ Captain receives ride confirmation
→ Both dashboards synchronize

Check whether the current implementation actually follows this flow.

Find:

- Incorrect matching logic
- Redis search problems
- Wrong radius
- Incorrect availability filtering
- Captains receiving incorrect requests
- Captains not receiving requests
- Riders not receiving captain confirmation
- Duplicate requests
- Multiple captains accepting
- Requests disappearing
- Requests remaining stale
- Incorrect ride status

---

# 8. Frontend State Management Audit

Inspect Rider and Captain dashboards.

Check:

- API state
- Socket state
- Loading state
- Error state
- Empty state
- Ride state
- Captain state
- Location state
- Reconnection state
- Component lifecycle
- useEffect dependencies
- Socket listener cleanup
- Duplicate subscriptions
- Stale state
- Race conditions
- UI synchronization

Make sure the frontend does not rely on unnecessary polling or manual refreshes when Socket.IO should handle updates.

---

# 9. Location Tracking Audit

Trace:

Captain GPS
→ Frontend
→ Socket/API
→ Backend
→ Redis GEO
→ Rider

Check:

- Location update frequency
- Accuracy
- Latitude/longitude order
- Redis GEO storage
- Stale locations
- Captain offline behavior
- Rider receiving updates
- Socket event frequency
- Performance
- Reconnection behavior

Ensure location updates do not unnecessarily overload Redis, Socket.IO, or the browser.

---

# 10. Ride State Machine Audit

Identify every place where ride status is changed.

Create a state-transition map.

For every transition determine:

- Who can trigger it?
- Which API/event triggers it?
- Database update
- Redis update
- Socket event
- Frontend update
- Valid previous states
- Invalid transitions

Find any possibility of:

- Invalid state transitions
- State desynchronization
- Client manipulating server state
- Missing server validation
- Race conditions

The backend must be authoritative for ride state.

---

# 11. Error & Edge Case Audit

Test/inspect scenarios such as:

- Rider disconnects
- Captain disconnects
- Internet temporarily disappears
- Socket reconnects
- Redis becomes unavailable
- PostgreSQL becomes unavailable
- Captain goes offline during matching
- Captain rejects request
- Captain accepts after timeout
- Two captains accept simultaneously
- Rider cancels before acceptance
- Rider cancels after acceptance
- Captain cancels
- Browser refresh
- Multiple tabs
- Duplicate API requests
- Duplicate Socket.IO events
- Stale Redis data
- Server restart
- Redis restart
- Socket reconnect after server restart

Identify what currently happens and whether it is correct.

---

# 12. Performance Audit

Check for:

- Excessive Redis queries
- Excessive Socket.IO events
- Excessive database queries
- N+1 queries
- Unnecessary API calls
- Polling that should be replaced with sockets
- Duplicate queries
- Missing indexes
- Large payloads
- Memory leaks
- Socket listener leaks
- Redis key leaks

Recommend optimizations only where they are actually justified.

---

# 13. Security Audit

Check:

- JWT validation
- Captain authorization
- Rider authorization
- Socket authentication
- Room authorization
- IDOR vulnerabilities
- Input validation
- Zod validation
- Trusting client-provided ride status
- Trusting client-provided captain availability
- Trusting client-provided location
- Rate limiting
- Unauthorized ride acceptance
- Unauthorized ride modification

Do not trust the frontend for critical business logic.

---

# 14. Produce an Audit Report BEFORE Fixing Anything

After reading the codebase, DO NOT immediately modify files.

First provide a structured report containing:

## A. Critical Problems

Issues that currently break the main application flow.

For each:

- Problem
- Exact file
- Function/component
- Root cause
- Impact
- Severity
- Recommended solution

## B. Socket.IO Problems

List every Socket.IO issue.

## C. Redis Problems

List every Redis issue.

## D. Database/Prisma Problems

List every database issue.

## E. API Problems

List every API issue.

## F. Frontend Problems

List every Rider/Captain dashboard issue.

## G. Architecture Problems

Identify incorrect architectural decisions or synchronization problems.

## H. Race Conditions

List every possible concurrency/race-condition problem.

## I. Performance Problems

List important performance bottlenecks.

## J. Security Problems

List important security issues.

---

# 15. Create a Priority Matrix

Categorize every discovered issue:

P0 — Application completely broken
P1 — Main ride flow broken
P2 — Important functionality broken
P3 — Performance/reliability issue
P4 — Minor UI/code-quality issue

Do not treat cosmetic issues as more important than ride-flow failures.

---

# 16. Create the Correct Architecture

After identifying the problems, describe the corrected architecture.

Show the complete flow:

Rider
→ Backend
→ PostgreSQL
→ Redis
→ Socket.IO
→ Captain

and:

Captain
→ Backend
→ PostgreSQL
→ Redis
→ Socket.IO
→ Rider

Clearly define:

- PostgreSQL responsibilities
- Redis responsibilities
- Socket.IO responsibilities
- BullMQ responsibilities
- Backend responsibilities
- Frontend responsibilities

---

# 17. Important Rules

1. **Do not start modifying code before completing the audit.**
2. Read the existing implementation instead of assuming how it works.
3. Do not rewrite the entire application unnecessarily.
4. Preserve working functionality.
5. PostgreSQL must remain the durable source of truth.
6. Redis should primarily handle ephemeral real-time/location state.
7. Socket.IO should handle real-time communication.
8. Backend must remain authoritative for ride state.
9. Critical operations must be concurrency-safe.
10. Do not solve synchronization problems with arbitrary delays or setTimeout hacks.
11. Do not add polling when Socket.IO is appropriate.
12. Do not silently change existing APIs unless required.
13. Reuse existing architecture where possible.
14. Explain the root cause before proposing a fix.
15. If something is already implemented correctly, do not change it just for the sake of changing it.

---

# Final Output — Phase 1

Your FIRST response after analyzing the repository must contain ONLY:

1. Current architecture understanding
2. Complete main-flow trace
3. Problems discovered
4. Root causes
5. Priority/severity
6. Corrected architecture proposal
7. Step-by-step fix plan
8. Testing strategy

**Do NOT modify code yet.**

Wait for approval before beginning the implementation/fix phase.