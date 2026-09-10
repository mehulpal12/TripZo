# Architecture

## 1. Architecture style

Use a modular monolith.

Do not start with microservices. Modules are separated by responsibility so they can be extracted later if scale requires it.

## 2. High-level flow

```text
React Rider/Captain/Admin Apps
             |
          HTTPS
             |
        Express API
             |
   +---------+----------+
   |         |          |
 Auth      Rides      Payments
   |         |          |
   +---------+----------+
             |
      PostgreSQL
             |
      Redis / BullMQ
             |
        Socket.IO
             |
     Rider / Captain
```

## 3. Responsibility split

### PostgreSQL
Durable business data:
- users
- captains
- vehicles
- rides
- payments
- ratings
- refresh sessions
- audit records

### Redis
Ephemeral/high-throughput state:
- captain latest locations
- available captain index
- temporary locks/coordination
- rate limiting
- BullMQ queues
- Socket.IO adapter when horizontally scaling

### Node/Express
Business logic and API orchestration.

### Socket.IO
Real-time events and location updates.

### BullMQ
Scheduled jobs and asynchronous work.

## 4. Backend module structure

```text
backend/
  src/
    config/
    db/
    redis/
    middleware/
    errors/
    utils/
    modules/
      auth/
      users/
      captains/
      rides/
      matching/
      payments/
      ratings/
      admin/
    websocket/
    jobs/
    app.js
    server.js
```

Each module should contain:
```text
controller
service
repository
validation
routes
```

Do not put business rules directly inside route handlers.

## 5. Critical consistency rule

PostgreSQL determines whether a business transition actually succeeded.

Redis can accelerate discovery and delivery, but Redis must not become the authoritative ride state.

Example:
- Redis says captain A is nearby.
- PostgreSQL decides whether captain A actually won the ride.

## 6. Scaling path

MVP:
- 1 Node instance
- PostgreSQL
- Redis

Later:
- multiple Node instances
- Socket.IO Redis adapter
- separate worker processes
- read replicas
- dedicated matching service if needed

Do not implement later-stage infrastructure until MVP behavior is correct.
