# Recommended Project Structure

```text
ride-hailing/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── config/
│   │       ├── db/
│   │       ├── redis/
│   │       ├── middleware/
│   │       ├── errors/
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── users/
│   │       │   ├── captains/
│   │       │   ├── rides/
│   │       │   ├── matching/
│   │       │   ├── payments/
│   │       │   ├── ratings/
│   │       │   └── admin/
│   │       ├── websocket/
│   │       ├── jobs/
│   │       ├── app.ts
│   │       └── server.ts
│   └── web/
│       └── src/
│           ├── api/
│           ├── auth/
│           ├── components/
│           ├── pages/
│           ├── hooks/
│           ├── map/
│           ├── rider/
│           ├── captain/
│           └── admin/
├── packages/
│   └── shared/
├── migrations/
├── tests/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

Keep shared contracts/types in `packages/shared` only when the project actually benefits from it.
