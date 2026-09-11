# 14 — Frontend Environment Configuration

Create `.env.example`.

Expected public configuration should be limited to values safe for browser exposure, for example:

VITE_API_BASE_URL=
VITE_SOCKET_URL=
VITE_MAP_PROVIDER=
VITE_MAP_PUBLIC_KEY=

Rules:
- only VITE_* values reach the browser in Vite
- never put secrets in VITE_ variables
- validate required configuration at startup
- separate development/test/production configuration
- centralize configuration access in `src/app/config`
- do not read `import.meta.env` throughout components
