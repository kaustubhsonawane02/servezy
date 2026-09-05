# Servezy Design System — "Warm Hospitality"

Design personality: premium restaurant software. Calm, warm, confident. NOT a generic
SaaS dashboard, NOT colorful gradients, NOT rounded-everything toy UI.

## Brand
Name: Servezy. Voice: professional, warm, revenue-focused ("Save ₹15,000/mo in
staff costs" not "Digital menu solution").

## Color Tokens (Tailwind config)
--brand:        #EA580C (orange-600)  — primary actions, brand mark
--brand-dark:   #C2410C               — hover states
--ink:          #1C1917 (stone-900)   — headings, body text (NOT pure black)
--ink-soft:     #78716C (stone-500)   — secondary text
--surface:      #FAFAF9 (stone-50)    — app background (NOT white, NOT gray-100)
--card:         #FFFFFF               — cards, ONLY with border + subtle shadow
--line:         #E7E5E4 (stone-200)   — borders, dividers
--success:      #16A34A · --danger: #DC2626 · --warn: #D97706

KDS status (high contrast, glanceable from 3m):
placed = #FACC15 yellow/black text · preparing = #2563EB white text ·
ready = #16A34A white text

FORBIDDEN: default blue-500 as primary · purple/violet gradients · neon colors ·
more than one accent color per screen · emoji as icons.

## Typography
Web: Geist or Inter (self-hosted). App: SF/Roboto system stack.
Headings: font-semibold, tracking-tight, stone-900. NEVER font-black, never uppercase
headings except KDS labels.
Scale: display 32/40 · h1 24/32 · h2 20/28 · body 16/24 · secondary 14/20 ·
micro 12/16. KDS order cards: table number 40px bold, items 22px.
Tabular numbers (font-variant-numeric) for ALL money values.

## Spacing & Shape
4/8px scale only: p-4 cards, gap-3 lists, gap-6 sections, px-6 page gutters.
Radius: rounded-lg (cards/buttons), rounded-full (badges, avatars). Nothing bigger.
Shadows: shadow-sm resting, shadow-md on hover/lift. No shadow-xl glow.
Borders: 1px --line on all cards. Cards are flat + bordered, not floating blobs.

## Components (Shadcn config)
Buttons: h-10, px-4, font-medium, rounded-lg. Primary = brand bg; Secondary =
white + border; Destructive only for true deletes. Every button: hover, active,
disabled, loading (spinner + label) states.
Inputs: h-10, label above, error text below in danger, never red borders alone —
always text. Validate on blur, clear error on change.
Tables: sticky header, zebra off, hover row highlight, right-aligned money columns.
Empty states: one line of text + one action button. No illustrations, no "nothing
here yet ✨".
Loading: skeletons matching final layout shape. Never full-page spinners.
Toasts: bottom-right (web), top (app), auto-dismiss 4s, max one per action.

## Motion
Duration 150ms, ease-out. Hover lift: -translate-y-0.5. Page transitions: none
(instant). KDS card status change: 200ms color crossfade only. No confetti, no
bounce, no spring physics.

## The Craft Checklist (every screen must pass)
□ Aligned to an 8px grid — no almost-aligned elements
□ All money in ₹ with tabular figures, right-aligned
□ Icon + label on primary actions (icon-only only for universally known: trash, edit)
□ Date/time formatted "Today, 7:42 PM" not ISO strings
□ Tablet screens usable with wet/greasy fingers: min 48px touch targets
□ Works one-handed on a 5" Android (customer PWA: cart reachable by thumb)
