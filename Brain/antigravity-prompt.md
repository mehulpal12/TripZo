# Antigravity Implementation Prompt

You are the senior software engineer implementing this ride-hailing project.

Read these files before writing code:

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

## First task

Start with Phase 1 from `implementation-plan.md`.

Before coding, inspect the repository and report:
- current project structure;
- existing stack;
- existing implemented features;
- missing foundation pieces;
- contradictions between current code and the specification.

Then implement only the foundation required for Phase 1.

Do not proceed to Phase 2 until Phase 1 is working and verified.

## Quality bar

Code should be:
- readable;
- modular;
- testable;
- type-safe where TypeScript is used;
- transactionally correct;
- secure by default;
- explicit about business state transitions.

When you encounter ambiguity, prefer the smallest implementation consistent with the specification and document the assumption.
