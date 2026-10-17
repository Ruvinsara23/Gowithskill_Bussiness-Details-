# GoWithSkill customer intake

A standalone mobile-friendly intake portal for a subdomain on Cloudflare. Six sections cover business/contact details, branding, story and photos, multiple tour packages, website preferences, and review/permission. Drafts save on the customer's current browser/device. Logo and photo folder links are supported; direct file uploads are not included.

## Status

Source implementation complete. No Cloudflare account deployment or DNS change has been made. The existing CRM repository is unchanged. D1 is the initial submission store; a customer reference can be supplied with `?ref=YOUR_CRM_LEAD_ID`. References are user-editable matching hints, not proof of identity. Automatic CRM sync is not implemented.

## Run locally

Requires Node.js 20+ and a recent Wrangler 4 release.

1. `npm install`
2. `npm run check`
3. `npm test`
4. `npm run dev`

Without storage and Turnstile configuration, the portal clearly displays preview mode and does not allow submission. Do not use a static-only upload for production: the Worker handles submission persistence.

## Deploy to your Cloudflare account

1. Authenticate: `npx wrangler login`.
2. Create a D1 database: `npx wrangler d1 create gowithskill-intake`.
3. Add the returned database ID to wrangler.jsonc:

```json
"d1_databases": [{"binding":"DB","database_name":"gowithskill-intake","database_id":"PASTE_RETURNED_ID"}]
```

4. Initialise it: `npx wrangler d1 execute gowithskill-intake --remote --file=schema.sql`.
5. Create a Cloudflare Turnstile widget for the actual intake hostname. Set `vars.TURNSTILE_SITE_KEY` in wrangler.jsonc. Set the secret using `npx wrangler secret put TURNSTILE_SECRET_KEY`. Never commit secrets.
6. Set a strong private export token: `npx wrangler secret put ADMIN_TOKEN`. Keep this server-side; never place it in frontend code or a customer link.
7. Run `npm run deploy`.
8. Add the selected subdomain under the Worker's Settings > Domains & Routes as a Custom Domain. Use a new hostname, not a wildcard route over your existing main site. Ensure the hostname is allowed in Turnstile and redeploy after configuration changes.
9. Test with a real customer-like brief, including two packages, browser draft restoration, price validation, and a successful submission reference. Verify the stored record in D1 before inviting customers.

This does not require moving your main website. Parent website: https://gowithskill.com/. Suggested hostname: onboarding.gowithskill.com (not registered or attached yet). Account setup and final hostname must be confirmed by the owner. The wrangler configuration intentionally has no guessed database ID or domain route.

## Access submissions

Submissions are private. There is no unauthenticated read endpoint or admin dashboard. Use D1 Studio in Cloudflare or GET `/api/submissions` with an `Authorization: Bearer <ADMIN_TOKEN>` header from a trusted server/tool. Responses contain up to 50 records, newest first; `nextBefore` can be supplied as `?before=...` to fetch older records. Store the bearer token in an environment variable; do not paste it into client-side JS. Protect exports as customer information. Rotate the token if disclosed.

Email notifications are implemented using Resend but require account configuration below. Assign a team member to monitor pending/failed notifications. Team corrections/deletions can be performed through D1 Studio; the public form provides no unauthenticated editing of submitted records.

## CRM integration next step

Add a receiving endpoint in the CRM with server authentication, input validation, deduplication, and a review queue. Send the saved submission ID and payload through a retryable server-side delivery process. Do not mark a browser-supplied reference as verified customer identity. Integrating automatic delivery is separate from this standalone intake site.

## Customer-data notes

Only draft content is stored in localStorage, and it clears after successful submission. Shared-device users can use Clear saved draft. Only selected, validated fields are persisted server-side. Tour prices and policies are supplied by the customer and require review before publication. This form collects website content; it does not charge clients or launch their websites.

## Files

- public/: browser app, shared schema and responsive styling.
- src/worker.js: same-origin submission API, Turnstile verification and private D1 storage/export.
- schema.sql: database schema.
- tests/intake.test.js: validation and submission tests.

Official references: https://developers.cloudflare.com/workers/static-assets/ ; https://developers.cloudflare.com/d1/ ; https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## Verification performed

- JavaScript syntax checks passed.
- Thirteen tests passed: nine validation/API tests and four DOM interaction tests.
- Wrangler 4.151.1 deployment dry run passed.
- Local preview returned HTTP 200.
- Browser automation unavailable: visual and interactive browser QA remains to be done.
- Cloudflare authentication check: not logged in. No live deployment, database, Turnstile widget, or DNS changes were created.

A dependency-free visual preview is available with node preview.mjs. It intentionally disables submissions. Use npm run dev for the Worker runtime.


## Parent-site redesign — 17 October 2026

The portal now uses gowithskill.com's design tokens: paper #FAFAF8, ink #0B0B0C, electric blue #2B4BF2, Inter and Space Grotesk. Business and branding options use selectable cards, optional fields have explicit badges and expandable sections, package names update live, pricing and enquiry inbox fields appear when relevant, and required-field completion is shown separately from step progress. Image links include Google Drive upload and restricted Viewer-sharing instructions. Images can be supplied later. Logo and photos are links, not direct uploads. Four DOM interaction tests cover these changes. Visual browser QA remains unavailable.


## Simplified package intake and PDFs

The Tour packages step now accepts optional free-form notes (30,000 characters), one optional PDF (2 MB maximum), or details by email at contact@gowithskill.com. Structured per-package fields are no longer required.

To enable PDFs, create a PRIVATE R2 bucket: `npx wrangler r2 bucket create gowithskill-intake-uploads`. Add this top-level binding in wrangler.jsonc: `"r2_buckets": [{"binding":"UPLOADS","bucket_name":"gowithskill-intake-uploads"}]`. Redeploy. Do not enable public bucket access. Submitted records include the stored file key, which the team can retrieve through the Cloudflare R2 dashboard. PDF bytes are not included in the public read API.

Selected PDFs stay in memory until final submission; only their filename is saved with browser drafts. After refreshing, the customer must reattach or remove the file. The form explicitly prompts for this. If storage is not configured, submission with a PDF returns an error rather than claiming upload success. Review attachments as untrusted customer documents before opening. Existing drafts with structured package data are retained but no longer displayed as separate package cards.


## Email notifications to contact@gowithskill.com

1. Create/sign in to a Resend account and verify a sending domain you control. Follow its DNS verification instructions. Do not change existing MX records for your business inbox.
2. Add a verified sender to wrangler.jsonc vars, for example EMAIL_FROM = "GoWithSkill <briefs@YOUR_VERIFIED_SENDING_DOMAIN>". This is a sender example, not an address that has been verified by this project.
3. Run npx wrangler secret put RESEND_API_KEY and supply a sending API key privately. Never put it in public JavaScript or chat.
4. For PDFs, set a strong random secret via npx wrangler secret put FILE_LINK_SECRET. PDF links expire after seven days. Keep the R2 bucket private; the Worker authorises each download using the signed link.
5. Apply schema.sql to the existing D1 database again. Its new table and insert trigger are safe to add without recreating submissions. They queue every NEW brief in the same transaction as the submission. Existing submissions are not automatically emailed.
6. Deploy after configuring the email sender and secrets. Submit a real test brief and confirm it reaches contact@gowithskill.com, with the customer address in Reply-To. No real emails have been sent by local tests.

Emails contain labelled form values and a private, expiring PDF link when applicable. The recipient is fixed server-side, not customer-controlled. The database remains the saved record. Provider acceptance is tracked as accepted, not confirmed inbox delivery. Delivery/bounce webhooks are not configured.

The email_notifications table stores pending/sending/accepted/failed, attempt counts and a provider ID. Pending and failed notifications can be retried by an administrator: POST /api/notifications/retry with Authorization: Bearer ADMIN_TOKEN. It processes at most ten records per call, up to five attempts per record. No automatic schedule has been installed. Missing email configuration leaves notifications pending. To investigate uncertain sends, inspect the provider logs before resetting a sending record; a request may have reached the provider even if the database update failed. The provider idempotency key reduces duplicate sends within its retention window.

The PDF download link is a bearer capability: anyone holding it can download that attachment until expiry. Do not forward it outside the project team. To revoke it early, remove the object or rotate FILE_LINK_SECRET (rotation invalidates all outstanding links). Resend receives the email content; review its service terms and data handling before enabling production.

Official send API: https://resend.com/docs/api-reference/emails/send-email
