# Payment Design

## 1. Principle

Ride state and payment state are independent.

Example:

```text
Ride: COMPLETED
Payment: PENDING
```

is valid.

## 2. Flow

```text
Captain completes ride
        |
        v
Ride -> COMPLETED
        |
        v
Create payment -> PENDING
        |
        v
Payment provider
        |
        v
Provider webhook
        |
        v
Verify signature
        |
        v
Update payment -> SUCCESS / FAILED
```

## 3. Idempotency

Payment creation should accept an idempotency key.

Webhook processing should be idempotent using:
- provider payment ID unique constraint;
- event ID where provider supports it;
- transactionally updating payment state.

## 4. Security

Never trust amount/status supplied by the client for final payment.

The server calculates the payable amount from the ride.

Webhook endpoint:
- verifies provider signature;
- validates event;
- performs idempotent DB update.

## 5. MVP simplification

A post-ride payment flow is acceptable for the learning project.

A production card flow may preauthorize/tokenize the payment method before the ride. That is a later enhancement.
