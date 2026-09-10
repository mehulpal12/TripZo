# Ride-Hailing Platform — Project Specification

A production-oriented learning project for a Rapido/Uber-like ride-hailing platform built with:

- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL
- Cache / ephemeral state / queues: Redis
- Real-time communication: Socket.IO
- Background jobs: BullMQ
- Authentication: JWT
- Maps/routing: provider abstraction
- Payments: provider abstraction

## Source of truth

Use the documents in this repository as the implementation contract:

1. `requirements.md`
2. `architecture.md`
3. `database-design.md`
4. `ride-state-machine.md`
5. `api-design.md`
6. `realtime-design.md`
7. `matching-design.md`
8. `scheduled-rides.md`
9. `payment-design.md`
10. `auth-security.md`
11. `admin-design.md`
12. `testing-strategy.md`
13. `error-handling.md`
14. `observability.md`
15. `deployment.md`
16. `implementation-plan.md`
17. `antigravity-prompt.md`

## Important architectural rule

PostgreSQL is the durable source of truth.

Redis is used for fast/temporary state such as:
- captain availability
- latest captain location
- rate limiting
- BullMQ queues
- short-lived coordination data

Socket.IO is used to deliver real-time updates.

Do not introduce microservices unless a document explicitly requires them. Start with a modular monolith.
