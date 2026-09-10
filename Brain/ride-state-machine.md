# Ride State Machine

## 1. Core ride states

```text
SCHEDULED
    |
    | matching window reached
    v
SEARCHING
    |
    | captain accepts
    v
CAPTAIN_ASSIGNED
    |
    v
CAPTAIN_ARRIVING
    |
    | captain reaches pickup
    v
CAPTAIN_ARRIVED
    |
    | captain starts ride
    v
IN_PROGRESS
    |
    | captain completes
    v
COMPLETED
```

Cancellation may occur from appropriate pre-completion states:

```text
SCHEDULED --------> CANCELLED
SEARCHING --------> CANCELLED
CAPTAIN_ASSIGNED -> CANCELLED
CAPTAIN_ARRIVING -> CANCELLED
CAPTAIN_ARRIVED --> CANCELLED
```

Define the exact cancellation policy in code and tests.

## 2. State transition table

| Current | Event | Next |
|---|---|---|
| SCHEDULED | matching window | SEARCHING |
| SEARCHING | captain accepts | CAPTAIN_ASSIGNED |
| CAPTAIN_ASSIGNED | captain begins approach | CAPTAIN_ARRIVING |
| CAPTAIN_ARRIVING | captain arrives | CAPTAIN_ARRIVED |
| CAPTAIN_ARRIVED | captain starts | IN_PROGRESS |
| IN_PROGRESS | captain completes | COMPLETED |
| SCHEDULED | rider/captain/admin cancellation | CANCELLED |
| SEARCHING | rider cancellation | CANCELLED |
| CAPTAIN_ASSIGNED | allowed cancellation | CANCELLED |
| CAPTAIN_ARRIVING | allowed cancellation | CANCELLED |
| CAPTAIN_ARRIVED | allowed cancellation | CANCELLED |

## 3. Payment lifecycle

Payment is separate:

```text
PENDING -> SUCCESS
PENDING -> FAILED
SUCCESS -> REFUNDED
```

Ride completion does not mean payment success.

## 4. Rating lifecycle

A rating exists independently after the ride is completed.

Constraint:
`UNIQUE(ride_id, rater_id)`

## 5. State-transition implementation

Never trust a client-provided arbitrary next state.

The server should expose intent endpoints such as:

- `/accept`
- `/arrived`
- `/start`
- `/complete`
- `/cancel`

The service determines whether the requested transition is legal.

## 6. Race-condition rule

Never:

```text
SELECT ride
if SEARCHING:
  UPDATE ride
```

as two independent decisions.

Use one conditional SQL update or a transaction with proper locking.

## 7. State history

For an MVP, current state columns are sufficient.

If audit/history becomes important, add:

```text
ride_status_history
- id
- ride_id
- from_status
- to_status
- actor_id
- created_at
```
