# 02 — Proposed Frontend Folder Structure

frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router/
│   │   ├── providers/
│   │   └── config/
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── maps/
│   │   ├── ride/
│   │   └── feedback/
│   ├── features/
│   │   ├── auth/
│   │   ├── rider/
│   │   ├── captain/
│   │   ├── rides/
│   │   ├── scheduled-rides/
│   │   └── realtime/
│   ├── hooks/
│   ├── lib/
│   │   ├── api/
│   │   ├── socket/
│   │   ├── storage/
│   │   └── errors/
│   ├── pages/
│   │   ├── auth/
│   │   ├── rider/
│   │   ├── captain/
│   │   └── errors/
│   ├── schemas/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   └── test/
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── README.md
└── playwright.config.ts

Naming:
- feature-specific logic stays inside its feature
- reusable UI stays in components/ui
- API contracts stay in services/lib/api/types/schemas
- no giant App.tsx
