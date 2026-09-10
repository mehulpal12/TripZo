# Real-Time / WebSocket Design

Use Socket.IO.

## 1. Connection

Authenticated clients connect to Socket.IO.

The server determines the user identity from authentication credentials.

## 2. Ride room

When a ride becomes relevant, clients join:

```text
ride:{rideId}
```

## 3. Captain location

Captain app sends:

```js
socket.emit("captain:location", {
  rideId,
  lat,
  lng,
  timestamp
});
```

Server:
1. authenticates captain;
2. verifies captain is assigned to the ride;
3. validates coordinates;
4. rejects excessively frequent events;
5. writes latest location to Redis GEO;
6. optionally stores a short-lived latest-location record;
7. broadcasts to the ride room.

Broadcast:

```js
io.to(`ride:${rideId}`).emit("captain:location", {
  lat,
  lng,
  timestamp
});
```

## 4. Events

Server -> clients:

- `ride:captain_assigned`
- `ride:captain_arriving`
- `ride:captain_arrived`
- `ride:started`
- `ride:completed`
- `ride:cancelled`
- `payment:success`
- `captain:location`

## 5. Reconnection

Do not replay every stale GPS event.

On reconnect:
1. authenticate;
2. rejoin relevant ride room;
3. fetch current ride state from API;
4. fetch latest captain location from Redis;
5. resume live events.

PostgreSQL remains the authoritative ride state.

## 6. Location freshness

Store timestamp with each latest location.

Reject older events:

```text
incoming.timestamp <= stored.timestamp
```

if the stored event is newer.

Use a Redis TTL/heartbeat policy to avoid treating disconnected captains as available forever.

## 7. Horizontal scaling

When multiple Node instances are introduced, use the Socket.IO Redis adapter so room events can reach clients connected to different instances.
