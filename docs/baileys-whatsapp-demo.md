# Baileys WhatsApp demo (unofficial)

Use [Baileys](https://github.com/whiskeysockets/Baileys) for **demo day** when Meta Cloud API is not ready.

## Important: Vercel cannot host the WhatsApp socket

Baileys keeps a **live WhatsApp Web connection**. Vercel Hobby/serverless functions sleep and die between requests, so the socket cannot live *inside* Vercel.

What **does** work with Vercel:

1. Deploy Sweet Tooth UI + API to **Vercel** (Agent Hub shows the Baileys panel).
2. Run the same API as an **always-on worker** (Railway / Fly / your laptop) with `BAILEYS_ENABLED=1`.
3. On Vercel set `BAILEYS_BRIDGE_URL` to that worker. Agent Hub QR/start calls go through Vercel → worker.

For **fully native Vercel WhatsApp** (no second host), use **Meta Embedded Signup** instead of Baileys.

## Always-on worker (Railway example)

1. New Railway service from this repo.
2. Start command:

```bash
pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run start
```

3. Env on Railway (same `DATABASE_URL` as Vercel):

```bash
BAILEYS_ENABLED=1
BAILEYS_BAKER_ID=1
PORT=8080
```

4. Env on Vercel:

```bash
BAILEYS_BRIDGE_URL=https://YOUR-RAILWAY-HOST
```

5. Agent Hub → WhatsApp → **Show QR / Start** → scan on phone → enable agent → message the number.

## Local-only (no Railway)

```bash
BAILEYS_ENABLED=1
BAILEYS_BAKER_ID=1
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Point the frontend at `http://localhost:8080` while testing.
