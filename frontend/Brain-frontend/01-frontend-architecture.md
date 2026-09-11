# 01 — Frontend Architecture

## Goal

Create a maintainable frontend that mirrors the backend domain boundaries without coupling UI components directly to HTTP or Socket.IO implementation details.

## Recommended stack

- React + TypeScript
- Vite
- React Router
- TanStack Query for server state
- Zustand for small client/UI/session coordination state where necessary
- Axios or fetch wrapper for HTTP
- Socket.IO client for realtime events
- Zod for frontend boundary validation where useful
- Tailwind CSS or an equivalent utility/component styling system
- React Hook Form for complex forms
- Vitest + React Testing Library
- Playwright for E2E

Do not add libraries merely because they are popular. Every dependency must have a concrete responsibility.

## Layering

src/
  app/
    router/
    providers/
    config/
  pages/
  features/
    auth/
    rider/
    captain/
    rides/
    scheduling/
    realtime/
  components/
    ui/
    layout/
    maps/
    feedback/
  services/
    api/
    socket/
  hooks/
  stores/
  lib/
  types/
  schemas/
  utils/
  styles/
  test/

### Dependency rule

UI -> feature hooks -> service/query layer -> API/socket client.

Do not allow:
- Components calling axios/fetch directly
- Components creating Socket.IO connections
- Components containing ride-state transition logic
- Duplicated API URLs
- Duplicated auth header logic
- Server state stored unnecessarily in global Zustand state

## Server state vs client state

Use TanStack Query for:
- current user
- ride details
- ride history
- captain profile/status
- scheduled rides
- data fetched from API

Use local/component state for:
- form input
- modal open/close
- temporary UI selections

Use Zustand only for genuinely cross-cutting client state such as:
- authenticated session bootstrap status
- active realtime connection metadata
- transient app-level UI state

Never use a global store as a replacement for the server cache.

## Route protection

Separate:
- public routes
- authenticated rider routes
- authenticated captain routes
- role-aware routes

A user must not be able to reach captain pages simply by manually entering a URL.

## Mobile-first

The product is fundamentally mobile-oriented even if the development UI is viewed on desktop. Every critical ride action must remain usable on narrow screens.
