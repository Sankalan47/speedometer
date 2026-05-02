# Speedometer

A real-time speedometer web app powered by PostgreSQL LISTEN/NOTIFY and Server-Sent Events.  
**No polling anywhere** — every speed update travels from database INSERT to browser canvas in under 10 ms.

---

## Architecture overview

```
[Simulator] ──INSERT──▶ [PostgreSQL 15]
                              │ pg_notify (trigger)
                              ▼
                        [Backend / Express]
                              │ SSE fan-out
                              ▼
              ┌───────────────────────────────┐
              │  Browser (Netlify CDN / local) │
              │  React + Canvas gauge          │
              └───────────────────────────────┘
```

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Database  | PostgreSQL 15                                 |
| Backend   | Node.js 20 + Express + TypeScript             |
| Frontend  | React 18 + Vite + TypeScript                  |
| Styling   | Tailwind CSS 3                                |
| Charting  | Recharts                                      |
| CI/CD     | Docker Compose (backend) + Netlify (frontend) |

---

## Quick start — full stack with Docker

This runs **postgres + backend + simulator**. The frontend is served locally via Vite.

```bash
# 1. Clone and enter the project
cd speedometer

# 2. Create your env file
cp .env.example .env          # edit passwords / CORS_ORIGIN if needed

# 3. Start the backend stack
docker-compose up --build

# 4. In a separate terminal — start the frontend dev server
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Running the backend locally (without Docker)

Requires a local PostgreSQL instance with the schema from `backend/src/db/init.sql` applied.

```bash
cd backend
cp .env.example .env          # set DB_HOST=localhost + your credentials
npm install
npm run dev                   # ts-node-dev with hot reload
```

Run the simulator in a second terminal:

```bash
cd backend
npx ts-node-dev --respawn src/simulator.ts
```

---

## Deploying the frontend to Netlify

The `netlify.toml` in `frontend/` configures the build automatically.

1. Push the repository to GitHub / GitLab.
2. In Netlify: **Add new site → Import an existing project**.
3. Set **Base directory** to `frontend` (already set in `netlify.toml`).
4. Add an environment variable in **Site configuration → Environment variables**:

   | Variable       | Value                                   |
   |----------------|-----------------------------------------|
   | `VITE_API_URL` | `https://your-backend-host.example.com` |

5. On the **backend** (Docker / VPS), set:

   | Variable      | Value                               |
   |---------------|-------------------------------------|
   | `CORS_ORIGIN` | `https://your-site.netlify.app`     |

> **SSE note:** Netlify serverless rewrites have a 10 s timeout — they cannot relay SSE streams. The frontend connects directly to the backend URL via `VITE_API_URL`. Make sure the backend port (3001 by default) is publicly reachable with HTTPS (use a reverse proxy such as Caddy or nginx + Let's Encrypt).

---

## Environment variables

### Root `.env` (docker-compose)

| Variable                | Default       | Description                                       |
|-------------------------|---------------|---------------------------------------------------|
| `POSTGRES_USER`         | `speeduser`   | PostgreSQL username                               |
| `POSTGRES_PASSWORD`     | `speedpass`   | PostgreSQL password                               |
| `POSTGRES_DB`           | `speedometer` | PostgreSQL database name                          |
| `NODE_ENV`              | `production`  | Node environment                                  |
| `PORT`                  | `3001`        | Backend HTTP port                                 |
| `DB_HOST`               | `postgres`    | DB hostname (docker service name)                 |
| `DB_PORT`               | `5432`        | DB port                                           |
| `DB_USER`               | `speeduser`   | DB user (must match `POSTGRES_USER`)              |
| `DB_PASSWORD`           | `speedpass`   | DB password                                       |
| `DB_NAME`               | `speedometer` | DB name                                           |
| `HISTORY_ON_CONNECT`    | `10`          | Readings sent to a new SSE client on connect      |
| `HEARTBEAT_INTERVAL_MS` | `30000`       | SSE keep-alive interval (ms)                      |
| `SENSOR_INTERVAL_MS`    | `1000`        | Simulator insert interval (ms)                    |
| `PRUNE_KEEP_ROWS`       | `10000`       | Max rows kept after pruning                       |
| `CORS_ORIGIN`           | `*`           | Allowed CORS origin (set to Netlify URL in prod)  |
| `SENSOR_ID`             | `sensor-1`    | Sensor identifier written to each row             |

### Frontend `.env` (Vite)

| Variable        | Default                 | Description                                          |
|-----------------|-------------------------|------------------------------------------------------|
| `VITE_API_URL`  | `http://localhost:3001` | Backend base URL used by Vite proxy and EventSource  |

---

## Services (Docker)

| Service     | Port  | Description                      |
|-------------|-------|----------------------------------|
| `backend`   | 3001  | Express API + SSE endpoint       |
| `simulator` | —     | Inserts speed readings every 1 s |
| `postgres`  | 5432  | Database (internal, not exposed) |

The frontend is **not** in docker-compose — run it with `npm run dev` locally or deploy to Netlify.

---

## Backend layer structure

```
routes/        → declare URL paths only, import controller functions
controllers/   → handle req/res, call services or repositories
services/      → business logic (SSE fan-out, pg LISTEN lifecycle)
repositories/  → all SQL isolated here; accepts optional pool for testability
db/            → pg Pool singleton + dedicated LISTEN client
constants.ts   → single source for all env-backed defaults
```

---

## Running tests

```bash
# Backend (Jest)
cd backend && npm test

# Frontend (Vitest)
cd frontend && npm test
```
