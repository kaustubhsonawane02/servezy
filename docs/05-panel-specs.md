# Panel Specs

## A. Customer PWA — /menu/[slug]/[table]
Header: restaurant logo + name (sticky, compact on scroll). Table badge top-right.
1. Menu: sticky category tab bar (horizontal scroll) → item cards (image left 96px,
   name, ₹ price, veg dot, + button). Out-of-stock: grayscale + "Sold out" chip.
2. Item sheet (bottom): full desc, qty stepper, special-instructions input, add button.
3. Cart drawer: line items, qty edit, upsell row ("Goes well with"), subtotal, CTA.
4. Checkout: table number (prefilled), name optional → Place Order.
5. Payment: mobile → "Pay ₹X via UPI" deep-link; desktop → QR. Below: "Pay cash at table".
6. Tracker: 4-step progress (Placed → Preparing → Ready → Served), live via socket.
Perf: menu page is server-rendered; <2s LCP on 3G; images lazy + 200px thumbs.

## B. Kitchen Display (Expo, tablet landscape)
Top bar: restaurant name, clock, connection dot (green/red).
Body: 2–3 column grid of order cards. Card = colored header strip by status
(yellow/blue/green), huge table number, item list 22px, age timer (red >10min),
one giant action button ("Start Cooking" / "Mark Ready").
Order sources: QR (no icon), waiter (icon). Offline: banner + queued locally.
Landscape locked. Screen never sleeps (expo-keep-awake).

## C. Billing Panel (Expo, tablet)
Tabs: Tables | Bills.
Tables tab: grid of table tiles — free (outline) / active orders (brand) / bill due (warn).
Tap → order detail: items, running total, "Punch Order" (waiter mode), "Generate Bill".
Bill screen: subtotal, GST %, discount input (manager+), total → share PDF/WhatsApp →
"Confirm Payment" (UPI received / Cash) → table freed.

## D. Owner Web Panel — /owner
Layout: 240px sidebar (Dashboard, Menu, AI Import, QR Codes, Subscription, Settings),
top bar with restaurant switcher (v2) + profile.
Dashboard: 4 stat cards (Today's Revenue, Orders, Avg Order Value, Active Tables) +
live order feed (socket) + 7-day revenue sparkline.
Menu: category accordion → item rows (thumb, name, price, veg dot, stock toggle,
edit/delete). Stock toggle instantly greys item on customer menu (socket).
AI Import: dropzone → processing state → review table (editable rows, veg toggles,
category assign) → Approve All.
QR Codes: table count selector → preview card (logo, name, table QR, Servezy footer ad)
→ Download PDF.
Subscription: plan cards (₹999/₹4,499/₹5,999 with "Save 50%" on yearly), current
status banner, Razorpay checkout.

## E. SuperAdmin — /admin [superadmin only]
Tenants table: name, plan, status badge, expiry, orders 30d, actions (suspend/
reactivate/extend trial). Revenue page: MRR, churn, payment history. Minimal, utilitarian.
