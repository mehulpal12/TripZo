# Testing Strategy

## 1. Unit tests

Test:
- fare calculation
- state transition validation
- authorization rules
- payment state transitions
- coordinate validation
- cancellation rules

## 2. Integration tests

Use a test PostgreSQL/Redis environment.

Cover:
- register/login
- create ride
- captain acceptance
- state transitions
- cancellation
- payment webhook
- rating uniqueness

## 3. Critical concurrency test

Start two acceptance attempts for the same ride.

Expected:
- exactly one succeeds;
- exactly one gets a conflict;
- database contains only one captain assignment.

## 4. Real-time tests

Verify:
- authenticated captain can emit location;
- unauthorized captain cannot update another captain's ride;
- rider receives location;
- stale timestamps are ignored;
- reconnect restores current ride state.

## 5. Scheduled ride tests

Verify:
- job changes `SCHEDULED` to `SEARCHING`;
- duplicate job execution does not repeat transition;
- cancelled ride remains cancelled.

## 6. Payment tests

Verify:
- valid webhook succeeds;
- invalid signature is rejected;
- duplicate webhook does not duplicate payment;
- client cannot change final amount.

## 7. End-to-end happy path

```text
Register rider
 -> login
 -> fare estimate
 -> create ride
 -> captain online
 -> captain accepts
 -> captain location
 -> captain arrives
 -> start
 -> complete
 -> payment success
 -> rating
```
