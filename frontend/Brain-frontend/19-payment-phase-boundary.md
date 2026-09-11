# 19 — Payment Phase Boundary

Payments are Phase 8 and are intentionally not implemented during the frontend-first phase.

## What frontend may prepare

- generic success/error feedback components
- reusable confirmation dialogs
- ride summary component
- clean API/service architecture
- extension points for future payment status
- types that do not assume a payment provider

## What frontend must NOT implement yet

- payment provider SDK integration
- payment creation
- payment authorization
- webhook handling
- card/payment credential collection
- payment success/failure business rules
- refund logic

## Important domain rule

Ride lifecycle and payment lifecycle are separate.

A ride may be:
COMPLETED

while payment may independently be:
PENDING / SUCCESS / FAILED / REFUNDED

Do not couple payment state to ride state in frontend components.
