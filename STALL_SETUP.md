# Self-service stalls

The builder replaces email enquiries. Pricing is fixed server-side at ₹200 basic and ₹500 featured. Drafts stay in local storage until checkout. No customer data is sent while checkout is disabled.

## Current launch gate

Checkout is deliberately disabled until Razorpay activation, Firebase server credentials, end-to-end test payments are complete. Do not set ENABLE_STALL_CHECKOUT on production before completing this checklist.

Firebase project: `mela-chaloge`, Standard Firestore, Mumbai (`asia-south1`), Spark free plan. Production rules deny browser reads/writes; Vercel uses the Admin SDK. Do not enable test-mode rules.

## Server-only Vercel configuration

Add these as sensitive environment variables using Vercel's dashboard. Never paste secrets into chat, source files, VITE_ variables, browser scripts or this document:

- FIREBASE_SERVICE_ACCOUNT_JSON: JSON service-account credential for this project; prefer a dedicated service account with Firestore access only. Creating/exporting a private key needs the user's action-time confirmation.
- RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET: first test mode, later activated live mode.
- RAZORPAY_WEBHOOK_SECRET: independent webhook signing secret.
Placement lasts 7 days after verified capture, without automatic renewal. Duration and support/refund request contact are shown before payment. The server filters expired listings and never extends expiry when a webhook repeats.
- ENABLE_STALL_CHECKOUT=true: only after the test flow passes, then redeploy.

Razorpay webhook: `https://melachaloge.online/api/stalls?action=webhook`. Subscribe to order.paid, payment.captured, refund.processed, payment.dispute.created and payment.dispute.lost. Enable automatic payment capture. Keep webhook processing enabled during checkout pauses.

## Data and publication

`mela_stalls` stores immutable content, hashed checkout token, order ID, captured payment ID and status. Only the server can publish, after signature verification and a Razorpay API check of order, amount, currency, captured status and refunds. Webhooks independently publish even if the browser closes. Duplicate checkout attempts reuse their existing order.

Refund/dispute events suppress the listing, and a later capture retry cannot republish it. To remove an abusive listing, set `suppressed: true` and `status: removed` together in Firestore. Payment discourages spam; it does not certify that a brand is legitimate.

Eight rotating 3D slots replace demo food booths. Featured brands get priority and extra golden lighting; all brands are available through the directory, and each direct `/?stall=UUID` link includes that stall. Games and rides remain free. No guaranteed traffic, sales, physical goods or physical booth are sold.

Rate-limit documents contain hashed IP/hour identifiers, not raw IPs. Enable Firestore TTL on `mela_stall_rate_limits.expiresAt`, or periodically clear expired rate-limit documents. Never delete payment records as part of that cleanup.

## Required activation test

With Razorpay test keys and a dedicated test Firebase project, verify successful capture publishes once; failed/abandoned/authorized-only payments stay unpublished; browser close still publishes via webhook; duplicate webhook is harmless; wrong signature/amount/plan never publishes; refund/dispute hides the stall; direct link displays the correct highlighted booth. Do not use real money for verification.

Known MVP limits: drafts and recovery tokens belong to the original device; no later self-service content editing yet. If creating an order times out after provider acceptance but before persistence, reconcile its Razorpay receipt before permitting another order. The public partner list is fetched on each visit and has a four-second fallback to the free mela; add cached pagination when the paid partner list grows.
