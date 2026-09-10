# Development Checklist

## Foundation
- [ ] Repository structure
- [ ] Environment validation
- [ ] PostgreSQL connection
- [ ] Redis connection
- [ ] Migration system
- [ ] Error middleware
- [ ] Validation
- [ ] Logging
- [ ] Health endpoints

## Auth
- [ ] Register
- [ ] Login
- [ ] JWT
- [ ] Refresh session
- [ ] Logout
- [ ] Roles
- [ ] Resource authorization

## Ride
- [ ] Fare estimate
- [ ] Create ride
- [ ] Get ride
- [ ] Ride history
- [ ] Cancellation
- [ ] State machine

## Captain
- [ ] Online
- [ ] Offline
- [ ] Accept
- [ ] Reject
- [ ] Arrived
- [ ] Start
- [ ] Complete

## Matching
- [ ] Redis GEO
- [ ] Availability
- [ ] Nearby search
- [ ] Atomic first-accept
- [ ] Retry
- [ ] No-captain outcome

## Real time
- [ ] Socket authentication
- [ ] Ride rooms
- [ ] Assignment event
- [ ] Location event
- [ ] Reconnect sync
- [ ] Stale event protection

## Scheduled
- [ ] Delayed job
- [ ] Matching-window transition
- [ ] Idempotency
- [ ] Reconciliation

## Payment
- [ ] Payment table
- [ ] Provider abstraction
- [ ] Create payment
- [ ] Webhook
- [ ] Signature verification
- [ ] Idempotency

## Quality
- [ ] Unit tests
- [ ] Integration tests
- [ ] Concurrency test
- [ ] E2E test
- [ ] Security review
- [ ] Docker
- [ ] Deployment config
