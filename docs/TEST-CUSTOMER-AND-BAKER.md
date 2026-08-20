# Test as customer + onboard bakers

Live app: https://cohort-1-squad-indus-sweet-tooth.vercel.app  
Monorepo (API+UI): https://cohort-1-squad-indus.vercel.app

## As a customer (no login)

1. Open [demo menu](https://cohort-1-squad-indus-sweet-tooth.vercel.app/menu/1) (Sana's Sweet Studio).
2. Chat with the assistant: pick a real cake (e.g. **Fudgy Brownies**), area (Gulberg), your name, WhatsApp, then say **yes**.
3. Order appears on the baker dashboard under **Orders**.

WhatsApp auto-reply is optional for this test — **web menu chat is the live customer path**.

## Onboard a new baker

1. [Create free account](https://cohort-1-squad-indus-sweet-tooth.vercel.app/dashboard/register)
2. New bakeries get a **starter menu** (cake + brownies) so you can share the link immediately.
3. Copy your menu link from Settings / Overview (`/menu/{yourBakerId}`).
4. Open that link in a private window and place a test order as a customer.
5. Confirm the order on **Orders**; use **Inbox** if the customer asks for a human.

## Demo baker logins

| Email | Password | Plan |
|-------|----------|------|
| sana@studio.com | SanaSweet2026! | Bakery Plus |
| fatima@cakery.com | FatimaCake2026! | Kitchen Standard |
| amna@bakes.com | AmnaBakes2026! | Launch Free |

Login: https://cohort-1-squad-indus-sweet-tooth.vercel.app/dashboard/login

## Admin

- Portal: `/admin`
- Refresh demos: **Create / refresh demo bakeries** after signing in as admin.
