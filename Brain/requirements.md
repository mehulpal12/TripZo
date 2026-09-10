# Requirements

## 1. Product goal

Build a ride-hailing web application where riders can request or schedule rides, captains can accept and operate rides, and admins can monitor the platform.

## 2. Actors

### Rider
- Register and log in.
- Set pickup and destination.
- Get an estimated fare.
- Book an immediate ride.
- Schedule a future ride.
- See ride status.
- Track assigned captain in real time.
- Cancel a ride when allowed.
- Complete payment.
- Rate the completed ride.
- View ride history.

### Captain
- Register/login or be provisioned by admin.
- Go online/offline.
- Maintain vehicle information.
- Receive ride requests.
- Accept/reject requests.
- Navigate toward rider.
- Mark arrived.
- Start ride.
- Complete ride.
- Send live location while active.
- View ride history and earnings.

### Admin
- View riders.
- View captains.
- View rides.
- View platform statistics.
- Inspect cancelled/completed rides.
- Manage captain status when necessary.

## 3. Functional requirements

### Authentication
- Registration.
- Login.
- Access-token authentication.
- Refresh-token flow.
- Logout/revocation.
- Role-based authorization.
- Resource-level authorization.

### Fare
Fare estimate should be calculated before booking.

Minimum model:
`fare = base_fare + distance_component + time_component`

The fare calculation must live behind a service interface so pricing can evolve.

### Immediate ride
1. Rider requests ride.
2. Backend validates request.
3. Backend calculates/stores fare estimate.
4. Ride is persisted.
5. Ride enters `SEARCHING`.
6. Matching finds eligible nearby captains.
7. Captains receive requests.
8. One captain atomically wins.
9. Rider receives assignment through Socket.IO.
10. Captain approaches rider.
11. Captain marks arrived.
12. Captain starts ride.
13. Captain completes ride.
14. Final fare is calculated.
15. Payment is created/processed.
16. Rider can rate captain.

### Scheduled ride
1. Rider chooses future pickup time.
2. Ride is persisted as `SCHEDULED`.
3. Background job is created.
4. Before pickup time, job moves ride to `SEARCHING`.
5. Normal matching flow begins.
6. Remaining flow is the same as an immediate ride.

### Cancellation
Cancellation must preserve the ride record.

Store:
- cancellation actor
- cancellation timestamp
- cancellation reason

Cancellation must be conditional on the current ride state.

### Real-time tracking
Captain location:
`Captain GPS -> Socket.IO -> Node.js -> Redis latest location -> Socket.IO room -> Rider`

Do not write every GPS event to PostgreSQL.

Periodically persist a durable last-known location only if needed.

### Payment
Payment has its own lifecycle and must not be encoded into the ride state.

Payment states:
- `PENDING`
- `SUCCESS`
- `FAILED`
- `REFUNDED`

Webhook processing must be idempotent.

### Rating
Ratings are separate records.

A rider can submit at most one rating for a ride.

## 4. Non-functional requirements

- PostgreSQL transactions for critical state transitions.
- Atomic captain assignment.
- Idempotent payment webhook.
- Request validation.
- Authentication and authorization.
- Rate limiting.
- Structured logging.
- Centralized error handling.
- Environment-based configuration.
- Automated tests.
- Database migrations.
- Health check endpoint.
- Graceful shutdown.

## 5. Out of scope for MVP

- Surge pricing.
- Multi-stop rides.
- Ride pooling.
- Corporate accounts.
- Complex promotions.
- Wallet system.
- Advanced fraud detection.
- ML-based matching.
- Full analytics warehouse.
- Microservice decomposition.

## 6. Acceptance criteria

The MVP is complete when:
- rider can register/login and request a ride;
- captain can go online and accept a ride;
- two captains cannot both win the same ride;
- rider receives real-time captain assignment/location;
- ride follows the documented state machine;
- scheduled rides execute through a background job;
- payment state is independently tracked;
- cancellation and rating rules are enforced;
- protected resources cannot be accessed by unauthorized users;
- tests cover critical race/state/payment paths.
