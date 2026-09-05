# Servezy Implementation Plan

## Guiding Principles
1. One phase = one shippable, testable increment. Never move on with broken foundations.
2. Phase 1–3 = backend truth. Phase 4–6 = surfaces. Phase 7 = platform/launch.
3. Every phase ends with: types compile, endpoints tested in Postman/Thunder, edge cases handled.
4. v1 scope is frozen (see "Out of v1" at bottom). New ideas go to BACKLOG.md, not the code.

---

## PHASE 0 — Project Scaffolding (Day 1)
Deliverables:
- Monorepo folders: server/, customer/, staff/, owner/
- server/: Express + TS strict, ESLint, Prettier, path aliases (@/), env validation via zod
- Central error handler, 404 handler, /health endpoint, request logger (morgan)
- MongoDB connection with retry logic
Done when: `npm run dev` starts a clean server; /health returns { status: 'ok' }.

## PHASE 1 — Tenants, Auth, Subscriptions (Days 2–5)
Deliverables:
- All 8 Mongoose models from docs/02-database-schema.md + compound indexes
- Restaurant signup: creates trial account (14 days), owner StaffUser, bcrypt hash
- Login → JWT (restaurantId, roleLevel, staffId) in HTTP-only cookie + Bearer fallback
- Middlewares: requireAuth, requireRole, resolveTenant (JWT or slug), subscriptionGuard
- RBAC: owner=4, manager=3, billing=2, kitchen=1
- Daily cron: flip expired subscriptions to status='expired'
- Razorpay subscription endpoints: create-order, verify-webhook (signature check)
- Registration/login rate limited
Done when: full auth flow works; expired tenant gets 402 from subscriptionGuard.

## PHASE 2 — Menu Engine + AI Import (Days 6–9)
Deliverables:
- Category CRUD + MenuItem CRUD (tenant-scoped, Zod, owner/manager only)
- inStock toggle endpoint — must emit socket event 'menu_updated' to restaurant room
- Public menu endpoint: GET /api/menu/:tenantSlug (active items only, no auth)
- AI import: POST /api/menu-import (multer upload → AiImportJob) → GPT-4o Vision
  extraction → owner reviews → approve bulk-creates items
Done when: menu CRUD tested; one real menu photo digitizes correctly end-to-end.

## PHASE 3 — Order Engine + Real-Time (Days 10–13)
Deliverables:
- Socket.io server: JWT handshake auth, join kitchen_{restaurantId} + owner_{restaurantId}
- POST /api/:tenantSlug/orders — rate limited, Zod, server-side pricing,
  subscription-guarded, emits new_order
- PATCH /api/orders/:id/status — tenant-scoped, emits order_status_changed
- GET /api/:tenantSlug/orders/active — KDS bootstrap on reconnect
- Bill generation: POST /api/orders/:id/bill (tax + discount calc)
Done when: two restaurants run simultaneously and no data crosses tenants (write a test).

## PHASE 4 — Customer PWA (Days 14–19)
Deliverables (follow docs/04 + 05):
- /menu/[slug]/[table]: menu browse, category tabs, item detail sheet, cart drawer
- Zustand cart persisted to sessionStorage
- Upsell row ("Goes well with") on add-to-cart
- Checkout → POST order → UPI intent (mobile deep-link / desktop QR)
- Live order-status tracker (socket) with the 4-step progress UI
- Performance budget: LCP < 2s on 3G, skeletons everywhere, lazy images
Done when: Lighthouse mobile ≥ 90 on a mid-range Android profile.

## PHASE 5 — Owner Web Panel (Days 20–26)
Deliverables:
- Auth + layout with sidebar; dashboard: today's revenue, orders, live status
- Menu manager: category groups, item rows with stock toggle + inline edit modal
- AI import flow: upload → review extracted items → approve
- QR studio: pick tables → branded PDF (logo top, per-table QR, Servezy ad bottom)
- Subscription page: plans, Razorpay checkout, current status
Done when: owner can go signup → menu → QR PDF → receive a live order with zero help.

## PHASE 6 — Staff Expo App (Days 27–34)
Deliverables:
- PIN login (kitchen/billing staff), JWT in SecureStore
- KDS: tablet grid, tap-to-advance, age timer (red > 10min), offline queue + resync
- Billing: table map, running orders, waiter-punch order, bill PDF, confirm-payment
- Socket reconnect logic + missed-order catchup via GET /orders/active
- Push notification on new order (v1.5 acceptable)
Done when: KDS survives airplane-mode toggle without losing orders.

## PHASE 7 — SuperAdmin + Launch Hardening (Days 35–40)
Deliverables:
- SuperAdmin panel: tenants table (plan/status/expiry), MRR, suspend/reactivate
- Redis-backed rate limiting, Cloudflare WAF rules, helmet, CORS allowlist
- Backups: MongoDB Atlas daily snapshots
- Pilot checklist: 10 restaurants onboarded, 3G test on cheap Android, load test
Done when: a full simulated day (50 orders) runs with zero errors in logs.

---

## Out of v1 (Do NOT build yet)
WhatsApp campaigns · loyalty/repeat-customer engine · analytics dashboards ·
multi-outlet chains · inventory · discounts engine (only flat discount on bill) ·
kitchen printer integration.

## Risk Register
| Risk | Mitigation |
|------|
| Kitchen WiFi drops during rush | Phase 6 offline queue — test aggressively |
| UPI paid but not confirmed | Billing panel "confirm payment" flow in v1; Razorpay PG v2 |
| AI misreads Indian menus (₹, thali combos) | Test 50 real photos in Phase 2; owner review step mandatory |
| Owner abandons during menu entry | AI import is the onboarding path, not manual entry |
