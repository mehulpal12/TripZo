# Antigravity Implementation Prompt

You are the senior software engineer implementing this ride-hailing project.

Read these files before writing code:

/Brain - 
- `requirements.md`
- `architecture.md`
- `database-design.md`
- `ride-state-machine.md`
- `api-design.md`
- `realtime-design.md`
- `matching-design.md`
- `scheduled-rides.md`
- `payment-design.md`
- `auth-security.md`
- `testing-strategy.md`
- `implementation-plan.md`

## Your job

Implement the project incrementally according to the documents.

### Rules

1. Do not redesign the architecture unless you find a concrete contradiction or implementation blocker.
2. Do not introduce microservices.
3. PostgreSQL is the durable source of truth.
4. Redis is for ephemeral/high-throughput state and queues.
5. Socket.IO is for real-time communication.
6. BullMQ is for background/scheduled jobs.
7. Never implement ride assignment using a read-then-write race.
8. Use atomic conditional PostgreSQL updates for critical ride transitions.
9. Never allow the client to choose another user's identity.
10. Validate every API input.
11. Enforce both role authorization and resource authorization.
12. Keep payment state separate from ride state.
13. Do not write every GPS event to PostgreSQL.
14. Do not replay stale GPS history after reconnect; synchronize the latest state.
15. Make payment webhook processing idempotent.
16. Add tests for every critical business rule.
17. Use migrations rather than manually changing production tables.
18. Keep secrets out of source control.

## Working method

Before each implementation phase:

1. Inspect the current repository.
2. Compare existing code with the specification.
3. Identify what is already implemented.
4. State the exact files you will create/change.
5. Implement one coherent phase.
6. Run tests/type checks/lint.
7. Fix failures.
8. Summarize what changed and what remains.

Do not rewrite unrelated working code.
You are the senior software architect and implementation lead for this project.

Your first job is NOT to write application code.

I have provided a complete set of project documentation in this repository. You must deeply study, understand, cross-reference, and use these documents as the project's long-term source of truth.

## 1. READ THE ENTIRE DOCUMENTATION

Read every `.md` file related to this project, including:

* README.md
* requirements.md
* architecture.md
* database-design.md
* ride-state-machine.md
* api-design.md
* realtime-design.md
* matching-design.md
* scheduled-rides.md
* payment-design.md
* auth-security.md
* admin-design.md
* testing-strategy.md
* error-handling.md
* observability.md
* deployment.md
* implementation-plan.md
* project-structure.md
* event-contracts.md
* config-and-env.md
* decisions.md
* development-checklist.md
* antigravity-prompt.md

If these files are inside another directory such as `docs/`, locate them there.

Do not read only the filenames or summaries.

Read the actual contents carefully.

## 2. BUILD A COMPLETE MENTAL MODEL

After reading the documentation, understand the relationship between:

Requirements
→ Architecture
→ Database
→ Ride State Machine
→ APIs
→ Redis
→ Matching
→ WebSockets
→ Scheduled Jobs
→ Payments
→ Authentication
→ Testing
→ Deployment

Pay special attention to:

* PostgreSQL as the durable source of truth
* Redis as ephemeral/high-throughput state
* Redis GEO for nearby captain discovery
* Socket.IO for real-time communication
* BullMQ for scheduled/background jobs
* atomic captain assignment
* ride-state transitions
* payment lifecycle being separate from ride lifecycle
* authentication and resource authorization
* idempotency
* concurrency/race conditions
* reconnect behavior
* cancellation rules

Do not silently change these architectural decisions.

If you discover contradictions between documents, DO NOT immediately choose one.

Record the contradiction and explain:

* which documents conflict;
* what the conflict is;
* why it matters;
* your recommended resolution.

## 3. INSPECT THE ACTUAL CODEBASE

After understanding the documentation, inspect the existing repository.

Determine:

* current project structure
* frontend stack
* backend stack
* database setup
* Redis setup
* existing APIs
* existing authentication
* existing components
* existing tests
* existing configuration
* existing Docker setup
* existing incomplete features

Do not modify code yet.

## 4. CREATE THE MASTER IMPLEMENTATION ROADMAP

Create:

`implementation-roadmap.md`

This must be the project's detailed implementation plan.

Structure it like:

# Implementation Roadmap

## Phase 0 — Project Understanding

## Phase 1 — Foundation

## Phase 2 — Authentication

## Phase 3 — Database

## Phase 4 — Ride Core

## Phase 5 — Captain System

## Phase 6 — Matching

## Phase 7 — Real-Time Tracking

## Phase 8 — Scheduled Rides

## Phase 9 — Payments

## Phase 10 — Ratings

## Phase 11 — Admin

## Phase 12 — Testing

## Phase 13 — Security Hardening

## Phase 14 — Observability

## Phase 15 — Deployment

## Phase 16 — Full System Verification

You may change the phase ordering if the existing repository requires it, but explain why.

For EVERY phase include:

### Goal

What this phase achieves.

### Prerequisites

What must already work.

### Documentation

Which `.md` files must be read before implementing this phase.

### Tasks

A detailed numbered list.

Example:

```text
1. Create migration
2. Create model/repository
3. Create service
4. Create controller
5. Create routes
6. Add validation
7. Add authorization
8. Add tests
9. Update documentation
```

### Files to create

Exact expected files.

### Files to modify

Exact expected files.

### Database changes

If applicable.

### API changes

If applicable.

### WebSocket changes

If applicable.

### Redis changes

If applicable.

### Background-job changes

If applicable.

### Tests

Exactly what must be tested.

### Acceptance criteria

Clear conditions that prove the phase is complete.

### Dependencies

What later phases depend on this phase.

## 5. CREATE A LIVING PROGRESS TRACKER

Create:

`progress-tracker.md`

This file must become the project's permanent progress record.

Use this format:

# Project Progress Tracker

## Overall Progress

* [ ] Phase 0 — Project Understanding
* [ ] Phase 1 — Foundation
* [ ] Phase 2 — Authentication
* [ ] Phase 3 — Database
* [ ] Phase 4 — Ride Core
* [ ] Phase 5 — Captain System
* [ ] Phase 6 — Matching
* [ ] Phase 7 — Real-Time Tracking
* [ ] Phase 8 — Scheduled Rides
* [ ] Phase 9 — Payments
* [ ] Phase 10 — Ratings
* [ ] Phase 11 — Admin
* [ ] Phase 12 — Testing
* [ ] Phase 13 — Security Hardening
* [ ] Phase 14 — Observability
* [ ] Phase 15 — Deployment
* [ ] Phase 16 — Full System Verification

Then create a detailed section for EVERY phase.

Example:

## Phase 1 — Foundation

Status: NOT STARTED

### Tasks

* [ ] Initialize backend
* [ ] Initialize frontend
* [ ] Configure environment
* [ ] Configure PostgreSQL
* [ ] Configure Redis
* [ ] Configure migrations
* [ ] Configure validation
* [ ] Configure error handling
* [ ] Configure logging
* [ ] Add health endpoint
* [ ] Add readiness endpoint
* [ ] Add graceful shutdown
* [ ] Add tests

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

Repeat this structure for every phase.

## 6. TRACK SMALL TASKS, NOT JUST PHASES

The progress tracker must be granular.

Do NOT only write:

```text
[x] Authentication
```

Instead write:

```text
[x] Users migration
[x] Password hashing
[x] Registration API
[x] Login API
[x] Access token
[ ] Refresh token rotation
[ ] Logout
[ ] Role middleware
[ ] Resource authorization
[ ] Authentication tests
```

This allows me to see exactly how much work is complete.

## 7. CREATE A PROJECT KNOWLEDGE INDEX

Also create:

`project-knowledge.md`

This should explain where important decisions live.

For example:

```text
Ride lifecycle → ride-state-machine.md
Database → database-design.md
API contracts → api-design.md
Real-time → realtime-design.md
Matching → matching-design.md
Scheduled rides → scheduled-rides.md
Payments → payment-design.md
Security → auth-security.md
Testing → testing-strategy.md
Architecture → architecture.md
Implementation order → implementation-roadmap.md
Current progress → progress-tracker.md
```

Also include a concise architecture summary and the most important invariants.

## 8. DOCUMENTATION MUST BECOME SELF-MAINTAINING

From this point forward, whenever you implement a task:

1. Read the relevant specification files.
2. Read `implementation-roadmap.md`.
3. Read `progress-tracker.md`.
4. Inspect the current code.
5. Implement only the intended task.
6. Run tests/type checks/lint.
7. Fix failures.
8. Update `progress-tracker.md`.
9. Update `implementation-roadmap.md` if the implementation plan legitimately changed.
10. Update relevant architecture/design documentation if an approved architectural decision changed.
11. Record important decisions in `decisions.md`.

Never mark a task complete merely because code was written.

A task is complete only when its acceptance criteria pass.

## 9. DO NOT LOSE CONTEXT

Treat these repository files as persistent project memory.

At the beginning of every future implementation session:

1. Read `project-knowledge.md`.
2. Read `progress-tracker.md`.
3. Read the relevant section of `implementation-roadmap.md`.
4. Read the domain-specific design documents relevant to the task.
5. Inspect the actual current code.

Do not assume that a previous conversation contains the required context.

The repository documentation is the persistent source of project context.

## 10. DO NOT IMPLEMENT YET

For this task, only:

1. Read and understand all documentation.
2. Inspect the repository.
3. Identify contradictions/problems.
4. Create `implementation-roadmap.md`.
5. Create `progress-tracker.md`.
6. Create `project-knowledge.md`.
7. Update `README.md` with links to these documents if appropriate.

Do NOT implement application features yet.

At the end, give me:

### A. Architecture Understanding

Explain the complete system flow in simple terms.

### B. Critical Invariants

List the rules that must never be violated.

### C. Problems Found

List contradictions, missing requirements, or technical risks.

### D. Roadmap

Summarize the implementation phases.

### E. Current Progress

Summarize what is already implemented versus missing.

### F. Next Task

Tell me the exact first implementation task.

Do not proceed to implementation until this analysis and documentation setup is complete.


