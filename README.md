# Pulse

Weekly status reporting with team dashboards and light gamification.

Stack: Express + PostgreSQL backend (`src/`), Vue 3 + Vite frontend (`frontend/`).

## Prerequisites

- Node.js >= 20.6.0 (needed for `--env-file`, which `npm run dev`/`start` use to load `.env`)
- Docker Desktop (for Postgres) — or a local Postgres 16 instance if you'd rather not use Docker

## 1. Start the database

```bash
docker compose up -d db
```

This starts Postgres 16 on `localhost:5432` with user/password/db all set to `pulse` (see `docker-compose.yml`). Data persists in the `pulse-db-data` volume across restarts.

To stop it: `docker compose down` (add `-v` to also wipe the data volume).

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and point `DATABASE_URL` at the Dockerized Postgres:

```
DATABASE_URL=postgres://pulse:pulse@localhost:5432/pulse
```

Leave `REDIS_URL` empty for local dev — sessions fall back to an in-memory store automatically.

## 3. Apply database migrations

There's no migration runner wired up yet; migrations are plain SQL applied in order with `psql`. With the `db` container running:

```bash
for f in db/migrations/*.up.sql; do
  echo "Applying $f"
  docker compose exec -T db psql -U pulse -d pulse < "$f"
done
```

(PowerShell equivalent: `Get-ChildItem db/migrations/*.up.sql | Sort-Object Name | ForEach-Object { Get-Content $_ | docker compose exec -T db psql -U pulse -d pulse }`)

To roll back, run the matching `*.down.sql` files in reverse order the same way.

### Optional: seed data

```bash
docker compose exec -T db psql -U pulse -d pulse < db/seed/profiles.sql
docker compose exec -T db psql -U pulse -d pulse < db/seed/teams.sql
```

## 4. Start the backend

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000` (see `PORT` in `.env`; loaded via Node's `--env-file=.env` flag). Magic-link auth emails are printed to the console via `ConsoleMailer` — no real mail service needed for local dev.

### Signing in

There's no seeded session — sign in through the app:

1. Go to the frontend's `/login` page and submit your email.
2. Check the **backend terminal** for a line like `[magic-link] you@example.com -> http://localhost:3000/auth/callback?token=...` — `ConsoleMailer` prints instead of sending real email.
3. Open that URL in the browser; it sets the session cookie and redirects to `/`.

## 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on Vite's default dev server (`http://localhost:5173`) and proxies `/auth`, `/me`, and `/teams` to the backend on port 3000 (see `frontend/vite.config.ts`).

## Everyday commands

| Task | Command |
|---|---|
| Backend tests | `npm test` |
| Backend typecheck | `npm run typecheck` |
| Frontend tests | `cd frontend && npm test` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| Backend build | `npm run build` |
| Frontend build | `cd frontend && npm run build` |
