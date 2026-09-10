# Captain Matching

## 1. Goal

Find nearby captains who are eligible for a ride.

## 2. Redis GEO

Use a Redis GEO set:

```text
captain_locations
```

Update:

```text
GEOADD captain_locations <lng> <lat> <captainId>
```

Search:

```text
GEOSEARCH captain_locations
```

with a radius around the pickup point.

## 3. Eligibility

For MVP:
- captain is `AVAILABLE`;
- captain vehicle type matches request;
- captain location is fresh;
- captain is not already assigned to an active ride.

Do not trust Redis alone for final assignment.

## 4. Matching flow

```text
Ride -> SEARCHING
       |
       v
Redis GEO nearby search
       |
       v
Filter eligible captains
       |
       v
Send request to selected captains
       |
       v
Captain presses Accept
       |
       v
PostgreSQL conditional UPDATE
       |
   +---+---+
   |       |
 winner   loser
   |       |
 assigned  conflict
```

For a learning MVP, notify a small batch of nearby captains rather than implementing a complex marketplace algorithm.

## 5. First accept wins

Use:

```sql
UPDATE rides
SET captain_id = $1,
    status = 'CAPTAIN_ASSIGNED',
    assigned_at = NOW(),
    version = version + 1
WHERE id = $2
  AND status = 'SEARCHING'
  AND captain_id IS NULL;
```

If affected rows = 1:
- captain won.

If affected rows = 0:
- another captain already won or ride is no longer searchable.

## 6. Captain availability

Recommended durable status:

```text
OFFLINE
AVAILABLE
ON_RIDE
```

After successful assignment:
- captain becomes `ON_RIDE`;
- remove/disable captain from available matching pool.

When ride completes/cancels:
- captain can become `AVAILABLE` again if still online.

The exact DB/Redis synchronization mechanism must prevent a captain from being assigned to two active rides.

## 7. Matching retries

If no captain accepts:
- retry with a larger radius or later batch;
- eventually mark ride as unable to match and notify rider.

Do not create infinite retry loops.

## 8. Future improvements

Possible later additions:
- ETA instead of straight-line distance;
- captain acceptance rate;
- fairness;
- surge pricing;
- destination compatibility;
- batching;
- dedicated matching service.
