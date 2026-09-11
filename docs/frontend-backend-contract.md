# Frontend-Backend Contract

This document serves as the definitive contract between the TRIPZO frontend and backend, verified during Phase F0.

## 1. Authentication Flow
- **`POST /auth/register`** 
  - Body: `email`, `password`, `role` (RIDER|CAPTAIN), `name` (optional), `phone` (optional)
  - Returns: `{ user, tokens: { access, refresh } }`
- **`POST /auth/login`** 
  - Body: `email`, `password`
  - Returns: `{ user, tokens: { access, refresh } }`
- **`POST /auth/refresh`** 
  - Body: `refreshToken`
  - Returns: `{ tokens: { access, refresh } }`
- **`POST /auth/logout`** 
  - Authorization: Bearer token

## 2. Ride API (Requires Auth)
- **`GET /rides/fare`** 
  - Query: `pickupLat`, `pickupLng`, `destinationLat`, `destinationLng`, `vehicleType`
  - Returns: `{ estimatedFare, distance, duration }`
- **`POST /rides/`** (Create Immediate Ride)
  - Body: `pickup: {lat, lng}`, `destination: {lat, lng}`, `vehicleType`
  - Returns: `Ride`
- **`POST /rides/schedule`** (Schedule Ride)
  - Body: `pickup`, `destination`, `vehicleType`, `scheduledAt` (ISO DateTime)
  - Returns: `Ride`
- **`GET /rides/`** 
  - Returns: `Ride[]` (History)
- **`GET /rides/:rideId`** 
  - Returns: `Ride`
- **`POST /rides/:rideId/cancel`**
  - Body: `reason` (optional)
  - Returns: `Ride`
- **Captain Actions:**
  - `POST /rides/:rideId/accept`
  - `POST /rides/:rideId/reject`
  - `POST /rides/:rideId/arrived`
  - `POST /rides/:rideId/start`
  - `POST /rides/:rideId/complete`

## 3. Captain API (Requires CAPTAIN Role)
- **`POST /captains/online`**
  - Returns: `Captain` (status changed to AVAILABLE)
- **`POST /captains/offline`**
  - Returns: `Captain` (status changed to OFFLINE)
- **`GET /captains/rides`**
  - Returns: `Ride[]` (Captain's ride history)

## 4. Realtime Socket.IO Events
- **Connection & Auth:**
  - Connect with handshake `auth: { token }` or headers `Authorization: Bearer <token>`
- **Rooms (Auto-joined based on role):**
  - `captain:{userId}`
  - `rider:{userId}`
  - `ride:{rideId}` (Join manually via `emit('join_ride', rideId)`)
- **Events:**
  - `emit('captain:location', { rideId?, lat, lng, timestamp? })`
  - `on('captain:location', { lat, lng, timestamp })` (Broadcast to `ride:{rideId}` room)

## 5. Models & State Machines
- **RideStatus:** `SCHEDULED` -> `SEARCHING` -> `CAPTAIN_ASSIGNED` -> `CAPTAIN_ARRIVING` -> `CAPTAIN_ARRIVED` -> `IN_PROGRESS` -> `COMPLETED` | `CANCELLED`
- **CaptainStatus:** `OFFLINE` | `AVAILABLE` | `ON_RIDE`
- **Role:** `RIDER` | `ADMIN` | `CAPTAIN`
