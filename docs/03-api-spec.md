# Servezy API Specification

Base: /api/v1 · Auth: JWT (HTTP-only cookie on web, Authorization: Bearer on native)
Response envelope: { success: true, data } | { success: false, error: string, details?: any }

## Auth
POST   /auth/register            → create restaurant (14-day trial)      [public]
POST   /auth/login               → owner/staff login (email+pw or email+pin) [public, rate-limited]
POST   /auth/logout              → clear cookie
GET    /auth/me                  → current staff + restaurant + subscription status

## Public (customer, tenant via :tenantSlug)
GET    /menu/:tenantSlug                    → categories + items (inStock only)
POST   /menu/:tenantSlug/orders             → place order [rate-limited, 402 if expired]
GET    /menu/:tenantSlug/orders/:id/track   → order status polling fallback

## Menu Management [owner|manager]
POST/PUT/DELETE /menu/categories(/:id)      → tenant-scoped CRUD
POST/PUT/DELETE /menu/items(/:id)           → tenant-scoped CRUD
PATCH  /menu/items/:id/stock                → toggle inStock → emits menu_updated

## AI Import [owner|manager]
POST   /menu-import            → upload photo → job created (status: pending)
GET    /menu-import/:jobId     → poll status + extractedItems
POST   /menu-import/:jobId/approve → { items: [...] } → bulk create

## Orders [kitchen|billing|manager|owner]
GET    /:tenantSlug/orders/active        → bootstrap list for KDS/billing
PATCH  /orders/:id/status                → { status } → emits order_status_changed
POST   /orders/:id/bill                  → generate bill (tax/discount) [billing+]
PATCH  /orders/:id/payment               → { paymentStatus } [billing+]
POST   /orders                           → waiter-punched order (source: 'waiter')

## Subscription [owner]
GET    /subscription                     → current plan/status/expiry
POST   /subscription/checkout            → Razorpay order → { orderId, key }
POST   /subscription/webhook             → Razorpay webhook (signature-verified) [public]

## SuperAdmin [role=superadmin]
GET    /admin/tenants                    → all restaurants + subscription status
PATCH  /admin/tenants/:id/status         → suspend/reactivate
GET    /admin/revenue                    → MRR, payments history

## Socket.io
Auth: handshake.auth.token (JWT) — server verifies, derives restaurantId.
Client → 'join_panel' { panel: 'kitchen' | 'billing' | 'owner' } → joins
         kitchen_{id} / billing_{id} / owner_{id} per role.
Server → 'new_order' | 'order_status_changed' | 'menu_updated' — scoped to room only.
