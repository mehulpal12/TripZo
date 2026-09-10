# API Design

Base path:
`/api/v1`

## Authentication

### POST /auth/register
Create a rider/captain account.

### POST /auth/login
Return access token and refresh mechanism.

### POST /auth/refresh
Rotate/refresh authentication.

### POST /auth/logout
Revoke refresh session.

## Rider

### GET /rides/fare
Query parameters:
- pickupLat
- pickupLng
- destinationLat
- destinationLng
- vehicleType

Returns estimated distance, duration and fare.

### POST /rides
Create immediate ride.

Request:
```json
{
  "pickup": {"lat": 28.61, "lng": 77.20},
  "destination": {"lat": 28.63, "lng": 77.22},
  "vehicleType": "BIKE"
}
```

### POST /rides/schedule
Create scheduled ride.

```json
{
  "pickup": {"lat": 28.61, "lng": 77.20},
  "destination": {"lat": 28.63, "lng": 77.22},
  "vehicleType": "BIKE",
  "scheduledAt": "2026-09-11T10:00:00+05:30"
}
```

### GET /rides/:rideId
Get ride details after authorization.

### GET /rides
Get rider's ride history.

### POST /rides/:rideId/cancel
Cancel if current state allows it.

### POST /rides/:rideId/rating
Create rating after completion.

## Captain

### POST /captains/online
Set captain available.

### POST /captains/offline
Set captain offline.

### GET /captains/rides
Captain ride history/current rides.

### POST /rides/:rideId/accept
Attempt atomic assignment.

### POST /rides/:rideId/reject
Reject a request.

### POST /rides/:rideId/arrived
Mark pickup arrival.

### POST /rides/:rideId/start
Start ride.

### POST /rides/:rideId/complete
Complete ride and initiate payment workflow.

## Payments

### POST /payments
Create payment attempt.

### GET /payments/:paymentId
Get payment status.

### POST /payments/webhook
Receive provider webhook.

Webhook must not rely on authenticated user JWT.

Verify the provider signature instead.

## Admin

### GET /admin/users
Paginated users.

### GET /admin/captains
Paginated captains.

### GET /admin/rides
Paginated rides with filters.

### GET /admin/stats
Operational dashboard statistics.

## Common response shape

Success:
```json
{
  "success": true,
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "RIDE_NOT_FOUND",
    "message": "Ride not found"
  }
}
```

## HTTP semantics

- `400` invalid request
- `401` unauthenticated
- `403` unauthorized
- `404` resource not found
- `409` business conflict/state conflict
- `422` semantically invalid input
- `429` rate limited
- `500` unexpected server error

## Authorization

`GET /rides/:rideId` must verify:
- rider owns ride, OR
- captain is assigned to ride, OR
- admin has permission.

Never accept `riderId` or `captainId` from the request body as proof of identity.
