# See docs/baileys-whatsapp-demo.md and docs/baileys-bridge.md

Use [Baileys](https://github.com/whiskeysockets/Baileys) for **demo day** when Meta Cloud API is not ready.

**Quick start (bridge worker):** see [baileys-bridge.md](./baileys-bridge.md)

```bash
cp .env.baileys.example .env.baileys
pnpm baileys:bridge
# then set BAILEYS_BRIDGE_URL on Vercel to the worker URL
```
