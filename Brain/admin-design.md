# Admin Design

## 1. MVP dashboard

Admin should be able to see:
- total riders
- total captains
- online captains
- active rides
- completed rides
- cancelled rides
- revenue/payment totals

## 2. Data source

Use PostgreSQL for durable reporting queries.

Use Redis for transient values such as current online/heartbeat state.

Do not build a separate analytics warehouse for MVP.

## 3. API

```text
GET /admin/users
GET /admin/captains
GET /admin/rides
GET /admin/stats
```

All require admin authorization.

## 4. Pagination

All list endpoints must use pagination.

Avoid returning the entire table.

Example:
```text
?page=1&limit=20
```

## 5. Filters

Admin rides can filter by:
- status
- date range
- rider
- captain
- payment status
