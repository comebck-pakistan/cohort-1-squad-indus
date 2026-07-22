# Clerk + Google sign-in (optional)

Sweet Tooth supports **native email/password** login with no Clerk keys. Add Clerk only if you want **Sign in with Google** (or other Clerk social providers) for the baker dashboard.

Production frontend: `https://cohort-1-squad-indus-sweet-tooth.vercel.app`  
Production API: `https://cohort-1-squad-indus-api-server-z3b.vercel.app`

---

## 1. Create a Clerk application

1. Sign in at [clerk.com](https://clerk.com) → **Create application**.
2. Name it e.g. **Sweet Tooth** (any name is fine).
3. Skip optional steps or enable **Google** when prompted (you can add it later under **User & authentication → Social connections**).

---

## 2. Add your production domain

In Clerk Dashboard → **Configure → Domains**:

| Setting | Value |
|--------|--------|
| **Frontend API / Allowed origins** | `https://cohort-1-squad-indus-sweet-tooth.vercel.app` |
| **Home URL** (if asked) | `https://cohort-1-squad-indus-sweet-tooth.vercel.app` |

For local dev, Clerk also allows `http://localhost:5173` on the **Development** instance (`pk_test_…`).

---

## 3. Enable Google

**User & authentication → Social connections → Google** → Enable.

Use Clerk’s shared OAuth credentials for a quick demo, or add your own Google Cloud OAuth client for production.

---

## 4. Copy API keys

**Configure → API keys**:

| Key | Example prefix | Where it goes |
|-----|----------------|---------------|
| Publishable key | `pk_live_…` (prod) or `pk_test_…` (dev) | Vercel **frontend** + Vercel **API** |
| Secret key | `sk_live_…` or `sk_test_…` | Vercel **API only** (never in the frontend) |

---

## 5. Push keys to Vercel (one command)

From the repo root, copy `.clerk-keys.local.example` → `.clerk-keys.local`, fill in your keys, then:

```powershell
.\scripts\sync-clerk-vercel.ps1
```

This script:

- Sets `VITE_CLERK_PUBLISHABLE_KEY` on the **frontend** Vercel project
- Sets `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `AUTH_MODE=clerk` on the **API** project
- Sets `FRONTEND_URL` on the API (for CORS / redirects)
- Triggers production redeploys for both projects

**Manual alternative** (Vercel dashboard → Project → Settings → Environment Variables):

| Project | Variable | Value |
|---------|----------|--------|
| `cohort-1-squad-indus-sweet-tooth` | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
| `cohort-1-squad-indus-api-server-z3ba` | `CLERK_PUBLISHABLE_KEY` | same `pk_live_…` |
| `cohort-1-squad-indus-api-server-z3ba` | `CLERK_SECRET_KEY` | `sk_live_…` |
| `cohort-1-squad-indus-api-server-z3ba` | `AUTH_MODE` | `clerk` |
| `cohort-1-squad-indus-api-server-z3ba` | `FRONTEND_URL` | `https://cohort-1-squad-indus-sweet-tooth.vercel.app` |

Redeploy **both** projects after saving env vars.

---

## 6. How auth behaves after setup

| Mode | Native email/password | Google (Clerk) |
|------|----------------------|----------------|
| No Clerk keys | ✅ Works | Hidden |
| Clerk keys + `AUTH_MODE=clerk` | ✅ Still works (hybrid) | ✅ Sign in / Sign up on login page |
| `AUTH_MODE=clerk-only` | ❌ Disabled | ✅ Required |
| `AUTH_MODE=legacy` | ✅ Only native | Clerk middleware ignored for dashboard API |

**New Google users** complete bakery details at `/dashboard/onboarding` after first sign-in.

---

## 7. Verify

1. Open [Baker login](https://cohort-1-squad-indus-sweet-tooth.vercel.app/dashboard/login).
2. You should see **Sign in with Google** (Clerk widget) below the email form.
3. After Google sign-in, finish onboarding if prompted, then land on the dashboard.

If Clerk shows a domain error, double-check the production URL is listed in Clerk **Domains** and that you used a **live** key (`pk_live_`) for the Vercel production domain.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login stuck on “Signing in…” | Usually a bad/mismatched `pk_test` on production — use `pk_live_` or add the Vercel URL to Clerk dev allowed origins |
| Google button missing | `VITE_CLERK_PUBLISHABLE_KEY` not set on frontend, or frontend not redeployed after env change |
| 403 `BAKER_ONBOARDING_REQUIRED` | Normal for new Clerk users — complete `/dashboard/onboarding` |
| API 401 on dashboard | Ensure API has matching `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` and was redeployed |
