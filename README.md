# TripZo - Production-Grade Ride-Hailing Platform

A full-stack, real-time ride-hailing platform built to mirror production systems like Rapido and Uber. TripZo connects Riders and Captains (drivers) with real-time geospatial matching, live location streaming, atomic ride state assignment, and scheduled rides.

---

## Highlights & Features

- **Geospatial Driver Matching**: Fast driver discovery within pickup radius powered by **Redis GEO** (`GEOADD`, `GEORADIUS`).
- **Atomic Ride Assignment**: Eliminates race conditions when multiple captains accept the same ride via database-level concurrency checks and Optimistic Concurrency Control.
- **Live Location Streaming**: Captain GPS coordinates streamed over **Socket.IO** rooms directly to riders with zero database write amplification.
- **Scheduled Rides**: Delayed bookings queued up to 7 days in advance and dispatched via **BullMQ** workers.
- **Independent State Machines**: Clear separation between ride states (`SEARCHING`, `ASSIGNED`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) and payment states (`PENDING`, `SUCCESS`, `FAILED`).
- **Modern UI**: Full-featured Rider and Captain web applications built with **Next.js (App Router)**, **Tailwind CSS**, and **Zustand**.

---

## Technology Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Zustand
- **Backend API**: Node.js, Express.js, TypeScript, Zod Validation
- **Database & ORM**: NeonDB (Serverless PostgreSQL), Prisma ORM
- **Cache & Real-Time**: Redis (Redis GEO for driver indexing, Socket.IO Redis adapter)
- **Task Queue**: BullMQ (Scheduled ride dispatching & worker management)
- **Testing**: Vitest, Jest, Supertest, Playwright E2E

---

## Project Architecture

```
   +-------------------------------------------------------------------+
   |                            CLIENT APPS                            |
   |   Rider App (Next.js)      Captain App (Next.js)     Admin Web    |
   +-------------------------------------------------------------------+
                  | HTTP (REST)                  | WebSockets (Socket.IO)
                  v                              v
   +-------------------------------------------------------------------+
   |                    NODE.JS + EXPRESS BACKEND                      |
   |  - Auth & Security (JWT, bcrypt)  - Ride State Machine            |
   |  - Matching Engine                - Scheduled Queue Worker        |
   +-------------------------------------------------------------------+
            |                                           |
            v                                           v
   +--------------------+                     +--------------------+
   |   PostgreSQL /     |                     |       REDIS        |
   |      NEON DB       |                     |  - Geospatial GEO  |
   | (Durable Truth:    |                     |  - Ephemeral GPS   |
   |  Users, Rides,     |                     |  - BullMQ Queue    |
   |  Payments, Ledger) |                     |  - Socket Adapter  |
   +--------------------+                     +--------------------+
```

---



## Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (or local PostgreSQL and Redis)

### 2. Start Infrastructure
```bash
docker-compose up -d
```

### 3. Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend/app
npm install
npm run dev
```

Visit the frontend at `http://localhost:3000` and the backend API at `http://localhost:4000`.
