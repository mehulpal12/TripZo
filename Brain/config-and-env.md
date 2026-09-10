# Configuration and Environment

Required configuration should be loaded once at application startup and validated.

Example `.env`:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ride_hailing

REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=15m

REFRESH_TOKEN_EXPIRES_IN=30d

CORS_ORIGIN=http://localhost:5173

PAYMENT_PROVIDER=mock
PAYMENT_WEBHOOK_SECRET=change-me

MAP_PROVIDER=mock
MAP_API_KEY=change-me
```

Do not use real secrets in source control.

Prefer failing fast if required production configuration is missing.
