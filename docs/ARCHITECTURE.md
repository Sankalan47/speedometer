# Architecture

## Block Diagram

```mermaid
flowchart LR
    subgraph Docker["Docker Network (self-hosted / VPS)"]
        SIM[Simulator\nNode.js]
        PG[(PostgreSQL 15)]
        BE[Backend\nExpress + Node.js\n:3001]
    end

    subgraph Netlify["Netlify CDN"]
        FE[Frontend\nReact + Vite]
    end

    SIM -- INSERT every 1s --> PG
    PG -- pg_notify via trigger --> BE
    BE -- SSE fan-out --> FE
    FE -- "EventSource /api/stream\n(direct HTTPS)" --> BE
    FE -- "REST /api/readings\n(direct HTTPS)" --> BE
```

## Sequence: Speed Update

```
Simulator       PostgreSQL        Backend           Browser (Netlify)
    |                |                |                 |
    |-- INSERT ----→ |                |                 |
    |                |-- NOTIFY ----→ |                 |
    |                |                |-- SSE write --→ |
    |                |                |  (speed_update) |
    |                |                |                 |-- animate gauge
```

## Design Decisions

### Why pg_notify instead of polling?
PostgreSQL's built-in LISTEN/NOTIFY is zero-latency and zero-overhead. There is no polling loop anywhere in the system — the event propagates from INSERT to browser render in < 10 ms on a local network.

### Why a dedicated pg.Client for LISTEN?
pg.Pool recycles connections. A recycled connection silently loses its LISTEN registration. The listener uses a standalone client with exponential backoff reconnection so LISTEN survives any transient DB restart.

### Why SSE instead of WebSocket?
SSE is unidirectional (server → client), which matches this use-case exactly. It works over plain HTTP/1.1, is trivially proxied by nginx, and has built-in browser reconnection semantics. WebSockets would add complexity with no benefit here.

### Why canvas for the gauge?
DOM-based SVG gauges with many animated elements can drop frames. A single `<canvas>` element with a requestAnimationFrame loop gives full control over render timing and GPU compositing, resulting in smooth 60 fps animation.

### Why Recharts for the chart?
Recharts is React-native (no d3 import overhead) and handles the rolling window of 60 readings with `isAnimationActive={false}` for performance — we animate the gauge, not the chart.

### Why is the frontend separate from Docker?
The frontend is a static build (HTML + JS + CSS) with no server-side logic. Serving it from Netlify's CDN provides global edge caching and automatic deploys on every push, with zero infrastructure overhead. The Docker stack only needs to run stateful compute (Postgres + Node.js).

The one constraint is that SSE cannot be routed through Netlify (10 s serverless function timeout). The browser therefore connects directly to the backend over HTTPS, requiring a public backend URL and the correct `CORS_ORIGIN` env var set on the backend.

### Why layered architecture instead of MVC?
MVC assumes a view layer rendered by the server. This backend is a pure API (no views), so the pattern used is **Layered Architecture with the Repository pattern**:

```
routes/        → declare paths only, import controller functions
controllers/   → own req/res logic, call services or repositories
services/      → business logic (SSE fan-out, pg LISTEN lifecycle)
repositories/  → all SQL isolated here; accepts optional pool for testability
db/            → pg Pool singleton + dedicated LISTEN client
constants.ts   → single source for all env-backed defaults
```

`notificationService` exports `startNotificationService()` rather than calling
`createListener()` on module load — so the module can be imported in tests without
opening a live DB connection. `server.ts` calls it explicitly during startup, making
the wiring visible and auditable.

This makes each layer independently testable and prevents SQL from leaking into route or controller files.

## Deployment Topology

```
┌─────────────────────────────────────┐
│         VPS / Cloud Host            │
│  docker-compose up                  │
│                                     │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ postgres │  │     backend      │ │
│  │  :5432   │  │      :3001       │◀┼── HTTPS (public, behind reverse proxy)
│  └──────────┘  └──────────────────┘ │
│  ┌──────────┐                       │
│  │simulator │                       │
│  └──────────┘                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│           Netlify CDN               │
│  npm run build (Vite)               │
│  Static files + SPA fallback        │
│  VITE_API_URL → backend :3001       │
└─────────────────────────────────────┘
```
