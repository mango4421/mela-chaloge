# Cloudflare deployment

The Vite/React/Three.js game is static. Cloudflare Pages builds `dist/` with `npm run build:cloudflare`; only `/api/*` invokes Functions. Hashed assets and optimized media are immutable for one year. HTML revalidates, admin HTML is not cached, and private APIs always use `no-store`. Healthy public stall/config responses have a 30/15-second edge cache. Do not cache payment, webhook, admin or analytics writes.

## Runtime compatibility

`#mela-database` selects the native Firestore REST adapter under the Workers `workerd` condition and retains Firebase Admin under Node/Vercel. Google’s authentication library signs and refreshes service-account tokens. REST transactions retain read-before-write ordering, atomic commits, create/update preconditions, conflict retries and rollback. The adapter intentionally supports only operations used by this app; extend it and its tests when adding database operations. Razorpay retains its pinned SDK and uses its Axios fetch adapter with `cache: no-store` on Cloudflare.

`PAGES_WRANGLER_MAJOR_VERSION=4` is required so hosted bundling matches the validated local Wrangler runtime. The Cloudflare build omits Vercel-only analytics requests. Checkout funnel tracking remains on the existing API.

## Secrets

Configure these as encrypted **production** secrets in Pages settings; do not commit values or put them in `VITE_*` variables:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `MELA_ADMIN_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `ENABLE_STALL_CHECKOUT`

The staging deployment uses the original live service configuration, so do not run test charges there. Use separate Razorpay test keys and isolated Firestore test collections for payment lifecycle tests. Rebuild after secret changes. Do not copy live secrets into every preview branch.

## Validation

Run `npm ci`, `npm test`, `npm run build:cloudflare`, and `npx wrangler pages dev dist`. Keep local `.dev.vars` out of Git. Run the game in a browser, verify `/support` and `/admin`, confirm database reads and admin authentication, and verify forged webhooks fail. Test atomic writes and conflicts using temporary test documents, then remove them. Never equate a successful static build with healthy payment/database APIs.

## Deployment source and rollback

During migration Pages follows `codex/cloudflare-migration`; Vercel production follows `main`. Merge the migration PR and switch Pages production to `main` together when adopting the new deployment workflow, so later game changes reach Cloudflare. Vercel's current production deployment is preserved separately as rollback.

The production apex and `www` are attached to Pages with HTTPS enabled. A zone-level Single Redirect named `Redirect www to melachaloge.online` sends `https://www.melachaloge.online/*` to `https://melachaloge.online/${1}` with status 301 and query strings preserved. Pages `_redirects` does not support domain-level source patterns, so this redirect belongs in Cloudflare Rules.

For immediate DNS rollback, restore the apex A record to `76.76.21.21` with DNS-only routing and keep `www` as a CNAME to the apex. The original GoDaddy nameservers are `ns57.domaincontrol.com` and `ns58.domaincontrol.com`; restoring those also restores the original zone, subject to propagation. Do not delete the Vercel project or its custom-domain assignments while rollback is needed. No database migration or webhook URL change is needed: both platforms use the same database and public domain.

## Traffic limits

Gameplay and assets stay on the static delivery path. API calls still count against the Workers plan and Firestore/Razorpay limits; a cache hit inside a Function still invokes that Function. Check current account quotas and CPU/error rates before a Diwali campaign. The per-instance support/funnel abuse guards are not shared across isolates; use shared rate limiting if these endpoints receive sustained abuse. Benchmark representative Android hardware separately; browser viewport tests do not measure real phone performance.
