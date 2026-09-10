# Event Contracts

## Server events

### ride:captain_assigned

```json
{
  "rideId": "uuid",
  "captain": {
    "id": "uuid",
    "name": "Captain",
    "vehicleType": "BIKE"
  }
}
```

### captain:location

```json
{
  "rideId": "uuid",
  "lat": 28.61,
  "lng": 77.20,
  "timestamp": 1725950000000
}
```

### ride:started

```json
{
  "rideId": "uuid",
  "startedAt": "2026-09-10T10:00:00Z"
}
```

### ride:completed

```json
{
  "rideId": "uuid",
  "completedAt": "2026-09-10T10:30:00Z",
  "finalFare": 185
}
```

## Client events

### captain:location

Captain sends current location.

Server must validate:
- authentication
- role
- active ride ownership
- coordinate bounds
- timestamp
- frequency

## Contract rule

Event payloads are versionable contracts. Avoid casually renaming event fields after clients depend on them.
