# Deployment & Environments

## Environments
local → .env (never committed) · staging → staging.servezy.in · prod → api.servezy.in

## Backend
Host: Railway or DigitalOcean Droplet (Docker) · MongoDB: Atlas M10 (backups on)
Redis: Upstash (rate limiting) · Logs: pino → Logtail
Env vars (see .env.example): DATABASE_URL, JWT_SECRET (64-char), RAZORPAY_KEY_ID/SECRET,
RAZORPAY_WEBHOOK_SECRET, OPENAI_API_KEY, REDIS_URL, CLIENT_URLS (comma list),
CLOUDINARY_URL, NODE_ENV

## Frontends
customer + owner: Vercel (prod from main, previews per PR)
staff app: EAS Build → Play Store internal track first; EAS Update for OTA fixes

## Edge
Cloudflare: proxy on, WAF managed rules, bot fight mode, rate-limit rule on /api/*/orders,
cache static assets, cache HTML for /menu/* with short TTL.

## CI (GitHub Actions)
PR: lint + tsc + test on server · lint on frontends
main → deploy server (Railway) + Vercel + EAS Update (staff)

## Ops Runbook
- Health: GET /health (server) — UptimeRobot every 1 min
- Backups: Atlas daily snapshots, test restore monthly
- Incident: subscriptionGuard falsely blocking tenants → manual status flip via
  SuperAdmin panel, then investigate
- Socket scale-out: enable @socket.io/redis-adapter when >1 server instance
