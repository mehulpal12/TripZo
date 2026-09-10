# Database Design

PostgreSQL is the durable source of truth.

## 1. Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('RIDER', 'CAPTAIN', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 2. Captains

```sql
CREATE TABLE captains (
  id UUID PRIMARY KEY REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE'
    CHECK (status IN ('OFFLINE', 'AVAILABLE', 'ON_RIDE')),
  vehicle_type VARCHAR(30) NOT NULL,
  vehicle_number VARCHAR(30) NOT NULL UNIQUE,
  rating NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 3. Rides

```sql
CREATE TABLE rides (
  id UUID PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES users(id),
  captain_id UUID REFERENCES captains(id),

  pickup_lat NUMERIC(9,6) NOT NULL,
  pickup_lng NUMERIC(9,6) NOT NULL,
  destination_lat NUMERIC(9,6) NOT NULL,
  destination_lng NUMERIC(9,6) NOT NULL,

  estimated_distance_m INTEGER,
  estimated_duration_s INTEGER,
  estimated_fare NUMERIC(12,2),
  final_fare NUMERIC(12,2),

  status VARCHAR(30) NOT NULL,
  scheduled_at TIMESTAMPTZ,

  cancelled_by VARCHAR(20),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,

  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  version INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Recommended ride statuses:
- `SCHEDULED`
- `SEARCHING`
- `CAPTAIN_ASSIGNED`
- `CAPTAIN_ARRIVING`
- `CAPTAIN_ARRIVED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

Payment is not a ride status.

## 4. Payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  ride_id UUID NOT NULL UNIQUE REFERENCES rides(id),
  rider_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL,
  provider VARCHAR(40),
  provider_payment_id VARCHAR(255) UNIQUE,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 5. Ratings

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id),
  rater_id UUID NOT NULL REFERENCES users(id),
  ratee_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ride_id, rater_id)
);
```

## 6. Refresh sessions

```sql
CREATE TABLE refresh_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 7. Indexes

```sql
CREATE INDEX idx_rides_rider_id ON rides(rider_id);
CREATE INDEX idx_rides_captain_id ON rides(captain_id);
CREATE INDEX idx_rides_status ON rides(status);

CREATE INDEX idx_scheduled_rides
ON rides(scheduled_at)
WHERE status = 'SCHEDULED';

CREATE INDEX idx_payments_rider_id ON payments(rider_id);
CREATE INDEX idx_ratings_ratee_id ON ratings(ratee_id);
```

Do not use a normal `(lat,lng)` B-tree index as the proximity-search solution. Redis GEO handles MVP nearby-captain lookup. If PostgreSQL itself must perform geospatial search, evaluate PostGIS.

## 8. Transaction rule

Critical transitions must be atomic.

Captain acceptance example:

```sql
UPDATE rides
SET captain_id = $1,
    status = 'CAPTAIN_ASSIGNED',
    assigned_at = NOW(),
    version = version + 1,
    updated_at = NOW()
WHERE id = $2
  AND status = 'SEARCHING'
  AND captain_id IS NULL;
```

Success means exactly one row was updated.
