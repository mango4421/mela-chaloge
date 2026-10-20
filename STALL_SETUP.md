# Self-service stalls

The builder replaces email enquiries. Pricing is fixed server-side at ₹200 basic and ₹500 featured. Drafts stay in local storage until checkout. Each placement lasts seven days with no automatic renewal.

## Current state

Razorpay Standard Checkout is connected in **test mode**. A browser test payment passed order creation, checkout and server signature/capture verification. No real money is collected. Test records live in `mela_stall_tests` and never appear in the public mela. Live stores use `mela_stalls`.

Firebase project: `mela-chaloge`, Standard Firestore, Mumbai (`asia-south1`), Spark free plan. Production rules deny browser reads/writes; the server uses Firebase Admin SDK.

Owner portal: https://melachaloge.online/admin. Its password is supplied privately in the local `outputs/mela-admin-access.json` file, outside the repository. Login uses an eight-hour HttpOnly session. Remove store hides a listing and prevents payment callbacks from restoring it; it does not issue a refund. Keep the password private.

## Server-only Vercel configuration

Add these as sensitive environment variables using Vercel's dashboard. Never paste secrets into chat, source files, VITE_ variables, browser scripts or this document:

- FIREBASE_SERVICE_ACCOUNT_JSON: JSON service-account credential for this project; prefer a dedicated service account with Firestore access only. Keep this credential server-only.
- RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET: first test mode, later activated live mode.
- RAZORPAY_WEBHOOK_SECRET: independent webhook signing secret.
Placement lasts 7 days after verified capture, without automatic renewal. Duration and support/refund request contact are shown before payment. The server filters expired listings and never extends expiry when a webhook repeats.
- MELA_ADMIN_SECRET: a random owner password of at least 32 characters.
- ENABLE_STALL_CHECKOUT=true: test mode is configured; live mode also requires the webhook secret. Redeploy after changes.

Razorpay webhook: `https://melachaloge.online/api/stalls?action=webhook`. Subscribe to order.paid, payment.captured, refund.processed, payment.dispute.created and payment.dispute.lost. Enable automatic payment capture. Keep webhook processing enabled during checkout pauses.

## Data and publication

`mela_stalls` stores immutable content, hashed checkout token, order ID, captured payment ID and status. Only the server can publish, after signature verification and a Razorpay API check of order, amount, currency, captured status and refunds. Webhooks independently publish even if the browser closes. Duplicate checkout attempts reuse their existing order.

Refund/dispute events suppress the listing, and a later capture retry cannot republish it. To remove an abusive listing, sign in to `/admin` and choose Remove store. Payment discourages spam; it does not certify that a brand is legitimate.

Eight rotating 3D slots replace demo food booths. Featured brands get priority and extra golden lighting; all brands are available through the directory, and each direct `/?stall=UUID` link includes that stall. Games and rides remain free. No guaranteed traffic, sales, physical goods or physical booth are sold.

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
