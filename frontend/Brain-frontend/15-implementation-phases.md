# 15 — Frontend Implementation Phases

## Phase F0 — Backend contract audit

Before writing UI:
- inspect all existing backend routes
- inspect schemas/types
- inspect auth
- inspect ride state machine
- inspect Socket.IO events
- inspect scheduled ride behavior
- document verified contracts

Deliverable: `docs/frontend-backend-contract.md`

# TRIPZO — PHASE F1

## Premium Frontend Foundation — Next.js + TypeScript

## 1. Mission

Build the TRIPZO frontend foundation using:

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* shadcn/ui
* Radix UI
* Framer Motion
* GSAP
* Lenis
* React Spring
* Lucide React
* React Icons
* Swiper
* Three.js / React Three Fiber
* particle effects
* premium CSS effects
* custom cursor
* interactive UI
* scroll-driven animations

The objective is to make TRIPZO feel like a **multi-million-dollar mobility technology company**, not a school/college project or generic CRUD dashboard.

The frontend must feel:

**premium + fast + cinematic + trustworthy + interactive + modern + highly usable**

---

# 2. VERY IMPORTANT — Google Stitch MCP

Google Stitch MCP is available in this project.

Use Stitch as the primary source for:

* visual design
* page layouts
* component composition
* spacing
* typography hierarchy
* visual hierarchy
* responsive layouts
* navigation
* cards
* dashboards
* booking interfaces
* rider screens
* captain screens
* landing/entry experiences

## Stitch workflow

Before implementing a major page:

1. Inspect the existing TRIPZO requirements.
2. Determine what the page must accomplish.
3. Use Google Stitch MCP to generate/design the visual layout.
4. Review the generated layout.
5. Implement the approved visual structure in Next.js.
6. Convert repeated elements into reusable components.
7. Add TRIPZO-specific interactions and backend integration.

Do NOT blindly accept generated Stitch code.

Stitch is the **design/layout generation system**.

Next.js is the **production implementation system**.

---

# 3. DO NOT CREATE ARCHITECTURE DOCUMENT FILES

Do NOT create a large documentation hierarchy such as:

```text
docs/frontend-architecture.md
docs/frontend-state-management.md
docs/frontend-animation-system.md
docs/frontend-security.md
...
```

F1 should primarily create the actual frontend.

Only create documentation when it is genuinely required for implementation or handoff.

The repository should remain clean.

---

# 4. DO NOT USE TANSTACK QUERY

Do NOT install:

```text
@tanstack/react-query
@tanstack/query-core
```

Do not use TanStack Query anywhere.

For server/API state use:

* React state where appropriate
* custom hooks
* a lightweight API service layer
* controlled context where genuinely necessary
* SWR only if there is a demonstrated need

Do not introduce another server-state library merely to replace TanStack Query.

For this project, start with:

**custom API service + React hooks + Context only where necessary.**

Keep the state architecture simple.

---

# 5. Core Stack

## Framework

```text
Next.js
TypeScript
React
Next.js App Router
```

Use modern Next.js conventions.

Prefer Server Components by default.

Use `"use client"` only when browser interactivity is required.

---

# 6. Styling

Install/configure:

```text
Tailwind CSS
tailwind-merge
clsx
class-variance-authority
```

Use CSS variables for TRIPZO design tokens.

Do not hardcode the same values throughout components.

---

# 7. Component System

Use:

```text
shadcn/ui
Radix UI
Lucide React
```

shadcn should provide the accessible component foundation.

Use components such as:

* Button
* Input
* Textarea
* Select
* Dialog
* Sheet
* Dropdown
* Tooltip
* Popover
* Tabs
* Card
* Badge
* Avatar
* Separator
* Skeleton
* Progress
* Alert
* Toast
* Command
* ScrollArea



as a second UI system.

TRIPZO should have **one primary component language**.

That language is:

**Tailwind + shadcn/ui + Radix**

---

# 8. Animation Stack

TRIPZO can use multiple animation technologies, but each must have a specific responsibility.

## Framer Motion

Primary React animation library.

Use for:

* component entrance
* exit animations
* modal transitions
* drawers
* dropdowns
* cards
* buttons
* page transitions
* layout animations
* micro-interactions
* animated status changes

---

# 9. GSAP

Use GSAP for advanced animation.

Examples:

* cinematic hero
* complex timelines
* scroll-driven storytelling
* advanced parallax
* pinned sections
* complex choreography
* interactive landing sections

Do not use GSAP for every button.

Do not duplicate simple Framer Motion animations with GSAP.

---

# 10. Lenis

Install and configure Lenis.

Create one global smooth-scroll system.

Requirements:

* one Lenis instance
* correct Next.js client lifecycle
* cleanup
* no duplicate animation loops
* smooth desktop scrolling
* usable touch scrolling
* reduced-motion support

Integrate GSAP ScrollTrigger with Lenis if ScrollTrigger is used.

---

# 11. React Spring

Use React Spring only for physics-based interactions.

Examples:

* draggable cards
* elastic UI
* spring-based cursor effects
* physically responsive interactions

Do not use React Spring for ordinary fades/slides.

---

# 12. Three.js

Install:

```text
three
@react-three/fiber
@react-three/drei
```

Three.js must be **lazy-loaded**.

Do not put a Three.js canvas on every page.

Potential premium uses:

* TRIPZO hero
* 3D vehicle visualization
* abstract mobility visualization
* interactive globe/map visual
* premium onboarding
* special marketing/brand section

The core ride-booking experience must work without Three.js.

---

# 13. Particle System

Use a performant particle solution.

Possible usage:

* hero
* premium landing section
* success animation
* empty states
* onboarding
* special brand moments

Particles must:

* be subtle
* be GPU-conscious
* respect reduced motion
* be disabled on low-performance devices when appropriate
* never interfere with booking actions

---

# 14. Glitch Effects

Glitch effects may be used for:

* TRIPZO branding
* hero title
* loading/error moments
* special hover states
* futuristic promotional sections

Do NOT use glitch effects everywhere.

The application should feel sophisticated, not noisy.

---

# 15. Custom Cursor

Create a custom cursor system for desktop.

Cursor states:

```text
default
hover
link
button
drag
text
disabled
```

Requirements:

* desktop/pointer devices only
* disabled on touch
* disabled/reduced under prefers-reduced-motion
* never block interaction
* use transform-based movement
* avoid excessive cursor trails
* accessible fallback to normal cursor

Potential interaction:

```text
Button hover
      ↓
cursor expands
      ↓
subtle magnetic movement
      ↓
small glow
```

Keep it subtle.

---

# 16. Magnetic Interactions

Create reusable magnetic interaction capability.

Potential targets:

* primary CTA
* navigation CTA
* hero button
* special cards

Do not make every element magnetic.

---

# 17. Spotlight Effects

Implement reusable spotlight effects.

Example:

```text
mouse
  ↓
radial spotlight
  ↓
card follows pointer position
```

Use CSS variables for pointer coordinates where possible.

Avoid React state updates on every mouse movement when CSS can handle the effect.

---

# 18. Scroll-Driven Animation

Implement premium scroll interactions using:

* GSAP ScrollTrigger where advanced
* Framer Motion where simple
* CSS scroll-driven animations where appropriate

Potential effects:

* hero reveal
* image parallax
* section reveal
* horizontal storytelling
* pinned feature section
* progressive route visualization

Do not make normal dashboard pages excessively animated.

---

# 19. Swiper

Use Swiper only where a carousel genuinely improves UX.

Potential usage:

* onboarding
* feature cards
* vehicle categories
* promotional content
* mobile content carousel

Do not use Swiper where normal CSS flex/grid is sufficient.

---

# 20. Icon System

Primary:

```text
Lucide React
```

Secondary:

```text
React Icons
```

Use React Icons only when Lucide doesn't contain a suitable icon.

Do not mix random icon styles.

---

# 21. Premium Design Direction

TRIPZO must NOT look like:

```text
❌ generic admin dashboard
❌ Bootstrap template
❌ student project
❌ basic Tailwind landing page
❌ over-rounded SaaS dashboard
❌ excessive glassmorphism
❌ random neon gradients
❌ excessive shadows
❌ meaningless animations
```

Instead aim for:

```text
✓ premium mobility technology
✓ sophisticated typography
✓ strong spacing
✓ cinematic transitions
✓ restrained visual effects
✓ excellent mobile UX
✓ clear CTA hierarchy
✓ intelligent micro-interactions
✓ high-quality loading states
✓ polished empty states
✓ sophisticated data visualization
✓ excellent responsiveness
```

---

# 22. TRIPZO Brand Language

The visual language should communicate:

**Move. Connect. Arrive.**

TRIPZO is a mobility product.

Visual concepts can include:

* movement
* route lines
* location
* navigation
* velocity
* maps
* connection
* urban mobility
* real-time systems

Use these concepts subtly in the visual design.

---

# 23. Application Layout

Create the main application shell.

Conceptually:

```text
┌─────────────────────────────────────────────┐
│                  NAVBAR                     │
├─────────────────────────────────────────────┤
│                                             │
│                PAGE CONTENT                 │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│              MOBILE NAVIGATION              │
└─────────────────────────────────────────────┘
```

Desktop and mobile layouts should be different where appropriate.

Do not simply shrink desktop UI.

---

# 24. Initial Route Structure

Establish:

```text
/
├── login
├── register
│
├── rider
│   ├── page
│   ├── book
│   ├── rides
│   ├── rides/[rideId]
│   ├── scheduled
│   ├── scheduled/new
│   └── profile
│
└── captain
    ├── page
    ├── rides
    ├── rides/[rideId]
    └── profile
```

The exact route structure may be adjusted according to the backend contract and Stitch layouts.

---

# 25. Base Components

Create reusable TRIPZO UI components.

At minimum:

```text
Button
Input
SearchInput
LocationInput
Card
Badge
Modal
Drawer
Toast
Alert
Skeleton
Spinner
EmptyState
ErrorState
PageLoader
Avatar
StatusBadge
StatusTimeline
RideCard
CaptainCard
LocationCard
```

---

# 26. Animation Components

Create reusable:

```text
Reveal
FadeIn
SlideUp
ScaleIn
Stagger
Magnetic
Spotlight
Parallax
TextReveal
PageTransition
AnimatedButton
CustomCursor
```

Only create abstractions that are actually reused.

Avoid building an enormous animation framework before there is real usage.

---

# 27. API Layer

Create:

```text
src/lib/api/
```

with:

```text
client
errors
auth
rides
captain
scheduled-rides
```

The UI must never directly call:

```text
fetch()
axios()
```

inside random components.

All backend communication goes through the API layer.

---

# 28. API Client

The API client must handle:

* base URL
* headers
* authentication
* JSON serialization
* timeout
* AbortController
* response parsing
* error normalization

The actual API contract must be obtained by inspecting the existing TRIPZO backend.

Never invent endpoint names.

---

# 29. Error Normalization

Create one frontend error representation.

Example:

```ts
type AppError = {
  message: string;
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
  retryable?: boolean;
};
```

Backend errors must be transformed into this structure.

Never show:

```text
Prisma error
SQL error
stack trace
internal server error details
```

to users.

---

# 30. Error Boundary

Implement:

```text
ErrorBoundary
```

and Next.js route-level error handling.

The UI should provide:

* clear explanation
* retry
* navigation back
* graceful fallback

A crashed component should not make the entire application unusable when isolation is possible.

---

# 31. Loading System

Create:

```text
Skeleton
PageLoader
SectionLoader
ButtonLoader
MapLoader
```

Use skeletons for content.

Use spinners only for short actions.

Avoid full-page loading screens for tiny API operations.

---

# 32. Responsive Design

Support:

```text
mobile
tablet
desktop
large desktop
```

Primary ride interactions must be optimized for mobile.

Touch targets must be comfortable.

Maps and ride controls must remain usable with one hand where possible.

---

# 33. Mobile Navigation

Create a premium bottom navigation system.

Potential rider navigation:

```text
Home
Rides
Schedule
Profile
```

Captain navigation may differ.

Use active-state animation.

Avoid excessive icons/text.

---

# 34. Dark Mode

Build theme infrastructure.

Possible:

```text
dark
light
system
```

TRIPZO should have a strong default theme.

Theme transitions should be smooth but not excessive.

---

# 35. Design Tokens

Create CSS variables for:

```text
colors
background
surface
foreground
muted
primary
secondary
accent
success
warning
danger
border
radius
spacing
shadow
motion
```

Components should consume these tokens.

---

# 36. Typography

Use a premium modern font through Next.js font optimization.

Establish:

```text
display
heading
subheading
body
label
caption
```

Do not use excessive font weights.

Typography should create hierarchy before animation does.

---

# 37. Background System

Build reusable backgrounds:

```text
GradientBackground
GridBackground
NoiseBackground
GlowBackground
ParticleBackground
SpotlightBackground
```

Do not put every effect on the same page.

For example:

```text
Hero:
gradient + subtle particles + spotlight

Dashboard:
clean background + subtle grid

Ride tracking:
minimal background

Success:
subtle glow
```

---

# 38. Performance Requirements

Premium UI must still be fast.

Implement:

* dynamic imports
* lazy loading
* code splitting
* image optimization
* font optimization
* GPU-friendly transforms
* avoid layout thrashing
* avoid unnecessary re-renders
* lazy Three.js
* lazy particles
* avoid unnecessary GSAP initialization
* avoid multiple requestAnimationFrame loops

Heavy effects must not block the initial render.

---

# 39. Reduced Motion

Respect:

```css
prefers-reduced-motion
```

When enabled:

* disable custom cursor
* reduce parallax
* reduce particles
* simplify page transitions
* disable unnecessary animation
* reduce spring physics

Functionality must remain unchanged.

---

# 40. Accessibility

Implement:

* keyboard navigation
* focus states
* semantic HTML
* accessible forms
* accessible dialogs
* aria labels
* aria-live where appropriate
* screen-reader support
* reduced motion
* contrast
* touch-friendly controls

Premium design must also be accessible design.

---

# 41. Frontend Environment

Use Next.js public environment variables only for browser-safe values.

Example:

```env
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_SOCKET_URL=
NEXT_PUBLIC_MAP_PROVIDER=
NEXT_PUBLIC_MAP_PUBLIC_KEY=
```

Never expose:

```text
DATABASE_URL
JWT_SECRET
provider_secret
private_api_key
```

---

# 42. Development Tooling

Configure:

```text
TypeScript strict mode
ESLint
Prettier
path aliases
environment validation
```

Package scripts:

```text
dev
build
start
lint
typecheck
format
format:check
test
test:watch
```

---

# 43. Testing Foundation

F1 should establish the testing environment.

Use:

```text
Vitest
React Testing Library
Playwright
```

Do not attempt to write the entire application's E2E suite in F1.

Create the infrastructure so F2+ can add tests.

---

# 44. No Fake Backend

The frontend must eventually integrate with the real TRIPZO backend.

Do not create fake production APIs.

Mocks are acceptable only for:

* unit tests
* component isolation
* Storybook-like visual development
* temporary design exploration

Once the backend contract is available, replace temporary mocks.

---

# 45. Google Stitch Implementation Loop

For every important page:

```text
Requirements
     ↓
Google Stitch
     ↓
Visual layout
     ↓
Review
     ↓
Next.js implementation
     ↓
Reusable components
     ↓
Animation
     ↓
Responsive refinement
     ↓
Accessibility
     ↓
Performance
```

Do not allow generated Stitch markup to become an unmaintainable component.

Extract reusable patterns.

---

# 46. Suggested Stitch Design Targets

Prioritize Stitch designs for:

### Rider

1. Rider Home
2. Booking screen
3. Searching screen
4. Captain assigned screen
5. Active ride screen
6. Ride completed screen
7. Ride history
8. Scheduled rides
9. Profile

### Captain

1. Captain dashboard
2. Offline state
3. Online state
4. Incoming ride request
5. Accepted ride
6. Arrived state
7. Active ride
8. Completed ride
9. Captain history
10. Profile

---

# 47. Visual Quality Standard

Before accepting a page ask:

### Typography

Does the typography feel intentional?

### Spacing

Does every section have breathing room?

### Hierarchy

Can the user immediately understand the primary action?

### Motion

Does animation communicate something?

### Interaction

Does the interface respond naturally?

### Responsiveness

Does it feel designed rather than merely resized?

### Accessibility

Can the page be used without a mouse?

### Performance

Does the page remain smooth?

### Brand

Does this feel unmistakably like TRIPZO?

---

# 48. Dependency Installation

Install only the dependencies needed for the above system.

The intended capability set includes:

```text
next
react
react-dom
typescript

tailwindcss
tailwind-merge
clsx
class-variance-authority

framer-motion
gsap
lenis
@react-spring/web

three
@react-three/fiber
@react-three/drei

swiper

lucide-react
react-icons

zod
react-hook-form

vitest
@testing-library/react
@testing-library/jest-dom
playwright
```

For particles, choose one maintained solution after evaluating bundle size and Next.js compatibility.

Do NOT install TanStack Query.

Do NOT install Mantine.

Do NOT install another complete component framework.

---

# 49. F1 Final Deliverable

The final F1 repository should contain the actual working Next.js frontend.

Example:

```text
frontend/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   ├── globals.css
│   ├── login/
│   ├── register/
│   ├── rider/
│   └── captain/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── animation/
│   ├── interaction/
│   ├── ride/
│   └── feedback/
│
├── features/
│   ├── auth/
│   ├── rider/
│   ├── captain/
│   ├── rides/
│   └── scheduled-rides/
│
├── lib/
│   ├── api/
│   ├── animation/
│   ├── socket/
│   ├── utils/
│   └── errors/
│
├── hooks/
├── providers/
├── schemas/
├── types/
├── stores/
├── public/
│
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── components.json
└── README.md
```

---

# 50. F1 Definition of Done

F1 is complete when:

## Next.js

* [ ] Next.js configured
* [ ] TypeScript configured
* [ ] App Router configured
* [ ] strict TypeScript
* [ ] layouts configured
* [ ] routing foundation complete

## UI

* [ ] Tailwind configured
* [ ] shadcn configured
* [ ] Radix configured
* [ ] design tokens configured
* [ ] typography configured
* [ ] base components configured

## Animation

* [ ] Framer Motion configured
* [ ] GSAP configured
* [ ] Lenis configured
* [ ] React Spring configured
* [ ] scroll animation foundation configured
* [ ] custom cursor configured
* [ ] magnetic interaction configured
* [ ] spotlight configured
* [ ] reduced-motion support configured

## 3D

* [ ] Three.js installed
* [ ] React Three Fiber installed
* [ ] Drei installed
* [ ] 3D capability isolated
* [ ] heavy 3D components lazy-loaded

## API

* [ ] API client exists
* [ ] error normalization exists
* [ ] environment configuration exists
* [ ] no random fetch calls inside UI

## UX

* [ ] responsive foundation
* [ ] mobile navigation
* [ ] loading states
* [ ] error states
* [ ] empty states
* [ ] accessible components

## Performance

* [ ] production build succeeds
* [ ] no console errors
* [ ] no duplicate animation loops
* [ ] no duplicate Lenis instances
* [ ] heavy dependencies lazy-loaded
* [ ] no unnecessary client components

## Google Stitch

* [ ] Stitch used for primary visual layout exploration
* [ ] layouts reviewed before implementation
* [ ] generated designs converted into reusable Next.js components
* [ ] Stitch output does not become uncontrolled duplicated code

---

# 51. Critical Rule

Do NOT confuse:

**"modern frontend"**

with:

**"maximum number of dependencies and effects."**

The target is:

```text
                    TRIPZO
                      │
              Premium Visual Design
                      │
       ┌──────────────┼──────────────┐
       │              │              │
     Design          Motion       Interaction
       │              │              │
    Stitch        Framer Motion     Cursor
    Tailwind      GSAP              Magnetic
    shadcn        Lenis             Spotlight
    Radix         Spring            Parallax
       │              │              │
       └──────────────┼──────────────┘
                      │
                Next.js + TS
                      │
                 API Layer
                      │
              TRIPZO Backend
```

The frontend should feel **expensive, deliberate and exceptionally smooth**, while remaining fast enough for a real ride-hailing application.

Do not begin Phase F2 until the F1 foundation is stable.

and do not create component again and again use the ready made components from shadcn and other library create a seprate folder of components in root of frontend folder. and if not ready made components are available then create a new component.

## Phase F2 — Authentication

- login
- register
- refresh
- logout
- session bootstrap
- protected routes
- role routing

## Phase F3 — Rider core

- rider home
- booking
- fare estimate
- immediate ride creation
- ride status page
- cancellation
- ride history
- ride detail

## Phase F4 — Captain core

- captain dashboard
- online/offline
- incoming ride request
- accept/reject
- arrived
- start
- complete
- history

## Phase F5 — Realtime

- Socket.IO client
- authentication
- ride subscriptions
- captain location
- rider live tracking
- reconnect/reconciliation
- stale connection UI

## Phase F6 — Scheduled rides

- scheduling form
- scheduled ride list
- detail page
- countdown/status
- transition into active matching

## Phase F7 — Hardening

- responsive review
- accessibility
- loading/error/empty/offline states
- unit/component/integration tests
- E2E critical path
- performance review
- security review
- production build

## Gate before Phase 8 Payments

Do not start payment implementation until:
- core ride flow works end-to-end
- auth is stable
- realtime is stable
- scheduled rides work
- cancellation behavior is verified
- frontend tests cover critical flows
- backend/frontend contracts are documented
- no known P0/P1 frontend bugs remain
