# 🧁 Sweet Tooth — AI-Powered Home-Baker Commerce Platform

**Sweet Tooth** (*Meethi Khushiyan, Ghar Se Aap Tak*) is an all-in-one AI commerce, customer retention, and automated order management platform built specifically for home-based bakeries and micro-food businesses.

---

## ✨ Key Features & Architecture

### 1. 🔐 Baker authentication
* **Native credentials** (email/phone + password) work without Clerk.
* **Clerk SSO** is optional — only enabled when `VITE_CLERK_PUBLISHABLE_KEY` / API Clerk secrets are set for the deployment domain. See **[docs/CLERK_SETUP.md](docs/CLERK_SETUP.md)** for Google sign-in on Vercel.
* **Per-baker data isolation** for catalog, customers, and orders.

### 2. 📱 Omnichannel Meta (Instagram & WhatsApp)
* Webhooks: `/api/webhooks/whatsapp`, `/api/webhooks/instagram`.
* **WhatsApp Embedded Signup** + **Instagram Meta connect** in Agent Hub (requires Meta app env vars).
* Tokens are encrypted per bakery (`TOKEN_ENCRYPTION_KEY`).

### 3. 🔍 OCR payment slip review (advisory)
* Bakers paste a receipt image URL on Payments and run **Check receipt**.
* OCR matches amount/recipient signals for **manual review only** — it never auto-marks paid.

### 4. 🧠 Smart AI assistant & RAG memory
* Rule-based replies first; RAG fallback for catalog/policy questions.
* Conversation memory + knowledge reindex after catalog/policy changes.

### 5. 📊 Analytics & outreach
* Revenue/order charts and retention stats.
* WhatsApp broadcasts send through the bakery’s connected Meta number (not a mock gateway).

### Ordering model
* Menus can hand off to WhatsApp/Instagram, or use the web assistant.
* **Guest web checkout** is available (`/cart`) with server-side price verification.
* Buyers can look up order status by WhatsApp number on `/orders`.

---

## 🛠️ Project Structure (Monorepo)

```
Sweet-Tooth/
├── artifacts/
│   ├── api-server/         # Express.js API server (OCR, Meta Webhooks, RAG Engine)
│   └── sweet-tooth/        # React + Vite Frontend (Baker Dashboard & Marketplace)
├── lib/
│   ├── api-client-react/   # Generated React Query API hooks
│   ├── api-spec/           # OpenAPI 3.0 specification
│   ├── api-zod/            # Generated Zod validation schemas
│   └── db/                 # Drizzle ORM database schemas (Supabase PostgreSQL)
├── package.json
└── vercel.json             # Vercel serverless deployment config
```

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites & Environment Variables
API: copy `artifacts/api-server/.env.example` → `.env` (or set on Vercel).
Frontend: copy `artifacts/sweet-tooth/.env.example` and set at least `VITE_API_URL`.

Meta connect also needs on the API: `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `TOKEN_ENCRYPTION_KEY`.
OCR hosts: `RECEIPT_IMAGE_HOSTS`.

**Optional Google sign-in:** follow [docs/CLERK_SETUP.md](docs/CLERK_SETUP.md), then run `.\scripts\sync-clerk-vercel.ps1`.

### 2. Install Dependencies & Build
```bash
pnpm install
pnpm --filter @workspace/api-server run build
```

### 3. Run Development Servers
```bash
# Terminal 1: API Server
pnpm --filter @workspace/api-server run dev

# Terminal 2: Frontend Client
pnpm --filter @workspace/sweet-tooth run dev
```

* **Frontend Marketplace**: `http://localhost:20458/`
* **API Health Check**: `http://localhost:8080/api/healthz`
