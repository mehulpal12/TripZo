# Observability

## 1. Logging

Use structured JSON logs.

Every request should have a request/correlation ID.

Important events:
- ride created
- captain assigned
- ride started
- ride completed
- cancellation
- payment success/failure
- scheduled job failure

## 2. Metrics

MVP metrics:
- request latency
- HTTP error count
- active rides
- matching success rate
- average assignment time
- payment failure rate
- WebSocket connections
- location events/sec
- BullMQ failed jobs

## 3. Health endpoints

```text
GET /health
GET /ready
```

`/health` means process is alive.

`/ready` verifies required dependencies are usable.

## 4. Alerts later

Consider alerts for:
- high payment failure rate
- queue backlog
- database connection exhaustion
- Redis failure
- matching failure spike
