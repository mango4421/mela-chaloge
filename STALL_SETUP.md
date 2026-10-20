# Self-service stalls

The builder replaces email enquiries. Pricing is fixed server-side at ₹151 basic and ₹251 featured. Drafts stay in local storage until checkout. Each placement lasts seven days with no automatic renewal.

## Current state

Razorpay Standard Checkout is connected in **live mode**, at ₹151 basic / ₹251 featured for seven days. Signed live webhooks and per-order automatic capture are configured. A live order was created at ₹151 with zero amount paid; no real-money transaction was performed during setup. A browser test payment passed order creation, checkout and server signature/capture verification. Test-mode records live in `mela_stall_tests` and never appear in the public mela. Live stores use `mela_stalls`.

Firebase project: `mela-chaloge`, Standard Firestore, Mumbai (`asia-south1`), Spark free plan. Production rules deny browser reads/writes; the server uses Firebase Admin SDK.

Owner portal: https://melachaloge.online/admin. Its password is supplied privately in the local `outputs/mela-admin-access.json` file, outside the repository. Login uses an eight-hour HttpOnly session. Remove store hides a listing and prevents payment callbacks from restoring it; it does not issue a refund. Keep the password private.

## Server-only Vercel configuration

Add these as sensitive environment variables using Vercel's dashboard. Never paste secrets into chat, source files, VITE_ variables, browser scripts or this document:

- FIREBASE_SERVICE_ACCOUNT_JSON: JSON service-account credential for this project; prefer a dedicated service account with Firestore access only. Keep this credential server-only.
- RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET: first test mode, later activated live mode.
- RAZORPAY_WEBHOOK_SECRET: independent webhook signing secret.
Placement lasts 7 days after verified capture, without automatic renewal. Duration and support/refund request contact are shown before payment. The server filters expired listings and never extends expiry when a webhook repeats.
- MELA_ADMIN_SECRET: a random owner password of at least 32 characters.
- ENABLE_STALL_CHECKOUT=true: live mode is configured with its webhook secret. Redeploy after changes.

Razorpay webhook: `https://melachaloge.online/api/stalls?action=webhook`. Subscribe to order.paid, payment.captured, refund.processed, payment.dispute.created and payment.dispute.lost. Enable automatic payment capture. Keep webhook processing enabled during checkout pauses.

## Data and publication

`mela_stalls` stores immutable content, hashed checkout token, order ID, captured payment ID and status. Only the server can publish, after signature verification and a Razorpay API check of order, amount, currency, captured status and refunds. Webhooks independently publish even if the browser closes. Duplicate checkout attempts reuse their existing order.

Refund/dispute events suppress the listing, and a later capture retry cannot republish it. To remove an abusive listing, sign in to `/admin` and choose Remove store. Payment discourages spam; it does not certify that a brand is legitimate.

Eight fixed, non-overlapping 3D locations replace demo food booths. Owners choose an available spot. Featured brands get directory priority and extra golden lighting; all brands are available through the directory, and each direct `/?stall=UUID` link includes that stall. Games and rides remain free. No guaranteed traffic, sales, physical goods or physical booth are sold.

Rate-limit documents contain hashed IP/hour identifiers, not raw IPs. Enable Firestore TTL on `mela_stall_rate_limits.expiresAt`, or periodically clear expired rate-limit documents. Never delete payment records as part of that cleanup.

## Testing and live activation

Install with `npm ci`. Copy `.env.example` to `.env` and fill server credentials locally. `.env` is ignored by Git. Run `vercel dev` for frontend plus serverless API routes; Vite alone does not serve payment endpoints.

Open Add your stall, customize, preview, accept the placement terms, then click Test payment. In Razorpay test checkout choose Netbanking and a test bank. Expect “Test payment verified”, with no public listing. Check Test payments in `/admin`; removal can be tested there without touching live stores.

The automated suite (`npm test`) covers invalid signatures, amounts, plans, unauthorized admin access, session expiry, publication expiry, fireworks placement and the bike game. `npm run build` builds both the mela and private admin page.

For real payments, replace test keys with activated live keys, set the independent webhook secret, enable automatic capture and register the webhook/events above. Redeploy and perform your controlled live launch check. Rotate credentials that were pasted into chat before live launch. Never put KEY_SECRET in a frontend-prefixed variable.

Endpoints use the existing framework equivalents: POST `/api/stalls?action=order`, POST `/api/stalls?action=verify`, GET `/api/stalls?action=config`, and the webhook above. Order amounts are fixed by the selected plan, in INR paise. Minimum 100 paise; invalid or tampered amounts fail validation. Authentication failures return 401; signature mismatches and missing fields return 400.

## Files in this update

- `api/stalls.js`, `server/razorpay.js`, `server/stall-payments.js`, `src/StallBuilder.jsx`: checkout and verification.
- `admin.html`, `api/admin.js`, `server/admin.js`, `src/AdminPortal.jsx`, `src/admin.css`, `vite.config.js`: private store management.
- `src/well.js`, `src/WellHUD.jsx`, `src/world.js`, `src/engine.js`, `src/main.jsx`, `src/game.css`: spectator/playable Maut ka Kuan and fireworks show.
- `src/MelaRadio.jsx`: requested YouTube soundtrack, looping track and controls; bhajans stop during the well activity. YouTube availability/autoplay rules still apply.
- `.env.example`, `.gitignore`, package files and focused tests: configuration, SDK and verification.

Known MVP limits: drafts and recovery tokens belong to the original device; no later self-service content editing yet. If creating an order times out after provider acceptance but before persistence, reconcile its Razorpay receipt before permitting another order. The public partner list is fetched on each visit and has a four-second fallback to the free mela; add cached pagination when the paid partner list grows.

## Backdrops, contact links and chosen locations

Owners can upload JPG/PNG/WebP (up to 8 MB input, resized to max 1024px and 200,000 characters of JPEG data) or supply a public HTTPS image link. Uploaded images are stored inside the private stall draft and published stall record; no public storage bucket is required. External image hosts must allow browser image embedding/CORS; failed 3D loads retain the default stall artwork.

Instagram, shop, contact page, WhatsApp with country code, and contact email are optional, with at least one contact required. All entered contacts are public after publication. Markup, unsafe URL protocols, malformed email and invalid phone numbers are rejected server-side.

`stallSlots` defines eight fixed locations. Location documents in `mela_slots` are claimed atomically with the checkout draft; `mela_slot_tests` isolates test reservations. Checkout holds a spot for 20 minutes, and the modal times out after 15 minutes. Verified live capture extends the same reservation to the original seven-day expiry. Admin removal, refunds and disputes release the matching reservation. Expired holds are reclaimable. The renderer also refuses duplicate locations as a second guard.

A very late captured payment whose location was already reassigned is marked `placement_review` for owner resolution and never overlaps a different store. The buyer is told not to pay again and to contact support. No automatic refund is issued by this exception path.

Added `src/stall-backdrop.js`, `server/stall-slots.js` and reservation/contact/backdrop tests. A real Firestore concurrent-transaction check confirmed that only one of two simultaneous reservations succeeds.

## Local payment-free testing

The local adapter in `scripts/local-preview.mjs` (`npm run build`, then `npm run dev:preview`) advertises a Preview without payment button. It validates the same stall data and keeps demos in process memory; demo visits use `/?preview=UUID` and spawn next to the chosen store. They never write a paid flag, payment record, live listing or location reservation. Restarting this local adapter clears its demos. The production API does not implement the preview action. Live credentials were enabled with owner approval and are stored only in ignored local settings and sensitive production variables.

Order recovery now leases active creation work for two minutes. Old failed drafts reconcile Razorpay orders by receipt before retrying, so a missing provider response does not blindly create another order. Definitive authentication failures reset the lease and show the actual error.
