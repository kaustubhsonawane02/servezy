# Servezy — Zero-Commission QR Restaurant OS

Servezy lets restaurants replace waiters with QR-code ordering. Customers scan
a table QR, browse a live menu, and pay via UPI. Restaurants get real-time
Kitchen, Billing, and Owner panels. Flat monthly fee. Zero commission.

## The Problem
- Aggregators (Zomato/Swiggy) take 18–25% commission per order.
- Owners cannot update menus in real time.
- Restaurants waste manpower on order-taking.

## The Solution
| Feature | Description |
|---|---|
| Branded QR Menus | Per-table QR codes with restaurant logo; our ad at the bottom |
| Live Menu Control | Owners add/edit/delete items instantly from any device |
| 3 Staff Panels | Kitchen Display (KDS), Billing/Tables, Owner Dashboard |
| AI Menu Import | Photo of physical menu → digitized items in minutes |
| Zero Commission | Flat subscription: ₹999/mo, ₹4,499/6mo, ₹5,999/yr |
| UPI Payments | Direct UPI intent — money goes straight to the restaurant |

## User Surfaces
1. **Customer PWA** (`/menu/[slug]/[table]`) — scan → order → pay. Must load <2s on 3G.
2. **Staff Expo App** — Kitchen Display + Billing panels (tablet-optimized).
3. **Owner Web Panel** — menu CRUD, QR PDF export, revenue, subscription.
4. **SuperAdmin Panel** — tenant management, subscriptions, MRR (platform owner only).

## Tech Stack
- **Backend:** Node.js, Express, TypeScript (strict), Socket.io, Mongoose, Redis
- **Customer PWA:** Next.js, Tailwind CSS, Zustand (Vercel)
- **Staff App:** Expo (React Native), NativeWind, expo-router, socket.io-client
- **Database:** MongoDB (multi-tenant, shared schema)
- **Payments:** UPI Intent (orders) · Razorpay (subscriptions)
- **AI:** OpenAI GPT-4o Vision (menu digitization)
- **Infra:** AWS/DigitalOcean, Cloudflare WAF

## Monorepo Layout
server/     → Express API + Socket.io
customer/   → Next.js PWA (diner-facing)
staff/      → Expo app (KDS + Billing)
owner/      → Next.js panel (owner + SuperAdmin)

## Key Documentation
| Doc | Purpose |
|---|---|
| docs/01-implementation-plan.md | Phases, order of work, definition of done |
| docs/02-database-schema.md | Exact Mongoose models & indexes |
| docs/03-api-spec.md | Every endpoint, request/response shape |
| docs/04-ui-design-system.md | Colors, typography, components — the UI rulebook |
| docs/05-panel-specs.md | Screen-by-screen spec for all 4 panels |
| docs/06-deployment.md | Environments, CI, infrastructure |

## Core Engineering Rules (Non-Negotiable)
1. **Multi-tenancy:** every query scoped by `restaurantId`. Zero cross-tenant leaks.
2. **Validation:** all inputs via Zod. Never persist raw `req.body`.
3. **Prices server-side:** client sends menuItemId + qty only.
4. **Auth:** bcrypt passwords, JWT in HTTP-only cookies (web) / SecureStore (native).
5. **Real-time:** Socket.io rooms `kitchen_{restaurantId}` — never broadcast globally.
6. **Subscription guard:** expired tenants get 402 on ordering APIs.

## Status
`v0.1.0 — Phase 1 in progress` (see docs/01-implementation-plan.md)
