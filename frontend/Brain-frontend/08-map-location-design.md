# 08 — Maps and Location UX

The backend stores live captain location in Redis and returns relevant latest location information through ride APIs.

## Frontend responsibilities

Rider:
- show pickup
- show destination
- show route context
- show captain marker when assigned
- update marker from realtime location

Captain:
- request browser/mobile geolocation permission
- show current location
- send location updates only when required
- stop updates when tracking is inactive

## Location permissions

Handle:
- permission granted
- permission denied
- permission prompt
- unavailable location
- stale location

Never assume geolocation is available.

## Marker updates

Do not recreate the entire map on every GPS event.

Update marker coordinates through a controlled map state/update API.

Consider interpolation/smoothing only as a presentation technique. Never modify authoritative coordinates sent by the backend.

## Provider abstraction

Keep map provider-specific code behind a small interface so the application is not permanently coupled to one map SDK.

Conceptual:
MapView
MapMarker
MapRoute
LocationProvider

Do not hardcode map-provider logic into ride business components.
