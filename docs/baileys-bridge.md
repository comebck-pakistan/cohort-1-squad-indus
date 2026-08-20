# Baileys WhatsApp Web bridge (always-on worker)

This is the piece Vercel cannot host: a long-lived WhatsApp Web socket via [Baileys](https://github.com/whiskeysockets/Baileys).

## Architecture

```
Phone WhatsApp  ←→  Baileys worker (Docker/Railway)  ←→  same Postgres
                         ↑
              BAILEYS_BRIDGE_URL
                         ↑
Browser Agent Hub  →  Vercel API (proxies start/status/QR)
```

## 1. Run the bridge (pick one)

### A) Docker (local)

```bash
cp .env.baileys.example .env.baileys
# edit DATABASE_URL + JWT_SECRET (same as Vercel)

docker compose -f docker-compose.baileys.yml up --build
```

Bridge listens on `http://localhost:8088`. Health: `GET /api/baileys/health`.

### B) Railway

1. New project → Deploy from this GitHub repo.
2. Railway will use `railway.toml` + `Dockerfile.baileys`.
3. Set env: `DATABASE_URL`, `JWT_SECRET`, `BAILEYS_ENABLED=1`, `BAILEYS_BAKER_ID=1`, `BAILEYS_WORKER=1`.
4. Copy the public HTTPS URL.

### C) pnpm local (no Docker)

```bash
# in artifacts/api-server/.env or shell
BAILEYS_ENABLED=1
BAILEYS_WORKER=1
BAILEYS_BAKER_ID=1

pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

## 2. Point Vercel at the bridge

On **every** Vercel project that serves `/api` (monorepo + api-server-z3b + sweet-tooth if applicable):

```bash
BAILEYS_BRIDGE_URL=https://YOUR-RAILWAY-OR-TUNNEL-HOST
# optional:
BAILEYS_BRIDGE_SECRET=same-as-worker
```

Do **not** set `BAILEYS_BRIDGE_URL` on the worker itself.

## 3. Link WhatsApp

1. Login as baker `#BAILEYS_BAKER_ID` (default 1 / Sana).
2. Agent Hub → WhatsApp → **Show QR / Start**.
3. Phone → Linked devices → scan.
4. Enable WhatsApp agent toggle.
5. Message the linked number → order lands on dashboard.

## Public demo from a laptop

```bash
# terminal 1
docker compose -f docker-compose.baileys.yml up --build

# terminal 2 (example)
cloudflared tunnel --url http://localhost:8088
# set that https URL as BAILEYS_BRIDGE_URL on Vercel
```
