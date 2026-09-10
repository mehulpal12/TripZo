# Scheduled Rides

## 1. Data

Scheduled rides use:

```text
status = SCHEDULED
scheduled_at = requested pickup time
```

## 2. Queue

Use BullMQ with Redis.

When the ride is created:
- persist ride first;
- enqueue a delayed job.

For a learning project, start matching shortly before pickup, e.g. 10–15 minutes before `scheduled_at`.

## 3. Worker

At the matching time:

```sql
UPDATE rides
SET status = 'SEARCHING',
    updated_at = NOW()
WHERE id = $1
  AND status = 'SCHEDULED'
RETURNING *;
```

If no row is returned, the job has already been handled/cancelled.

## 4. Reliability

The job must be safe to execute more than once.

Database state transition provides idempotency.

## 5. Cancellation

A cancelled scheduled ride must not enter `SEARCHING`.

## 6. Recovery

If the worker restarts:
- BullMQ retains jobs;
- database state prevents duplicate state transitions.

A periodic reconciliation job can later find scheduled rides that should have entered matching but have no corresponding active job.
