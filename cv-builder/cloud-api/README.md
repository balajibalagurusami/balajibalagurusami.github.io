# CV Builder Cloud Save (Cloudflare Worker + D1)

This source implements per-user drafts for the existing static GitHub Pages CV Builder.

**Deployment is NOT complete merely by committing these files.** The Cloudflare account owner must create D1, set the binding, and deploy the Worker using an authenticated Cloudflare login.

## Setup once

1. Install Node.js 20+ and authenticate Cloudflare CLI with \`npx wrangler login\`.
2. From \`cv-builder/cloud-api\`, run \`npx wrangler d1 create cv-builder-users --location apac\`. Copy the returned database UUID into the \`database_id\` field of \`wrangler.jsonc\`. Do not invent a UUID. Cloudflare may offer to update the config automatically.
3. Run \`npx wrangler d1 migrations apply cv-builder-users --remote\` and confirm.
4. Run \`npx wrangler deploy\`. Copy the generated HTTPS Worker URL, for example \`https://cv-builder-cloud-api.YOUR_SUBDOMAIN.workers.dev\`.
5. In \`cv-builder/cloud-config.js\` set \`window.CV_CLOUD_API_URL\` to the exact Worker URL (no path, no trailing slash). Commit/publish that config.
6. In the main CV Builder, open **Cloud drafts**, create an account with a mobile number and a password of at least 12 characters, then **Save as new**. On another device, log in and **Retrieve** the saved draft.

## Local development

\`\`\`sh
cd cv-builder/cloud-api
npx wrangler d1 migrations apply cv-builder-users --local
npx wrangler dev
\`\`\`

Change \`ALLOWED_ORIGINS\` in \`wrangler.jsonc\` to include the exact local frontend origin when testing locally.

## API

- POST /api/register \`{phone,password}\`
- POST /api/login \`{phone,password}\`
- GET /api/me
- POST /api/logout
- GET /api/cvs
- POST /api/cvs \`{title,cv}\`
- GET /api/cvs/:id
- PUT /api/cvs/:id \`{title,cv,revision}\` (optimistic revision check)
- DELETE /api/cvs/:id

Authenticated routes take an \`Authorization: Bearer <session>\` header. The browser stores the session only in \`sessionStorage\` on the device; avoid browser extensions or injecting unknown scripts.

## Security and limitations

- No user CV or plaintext password is committed to GitHub; D1 contains CV JSON and phone numbers. Password hashes use per-user random salt and PBKDF2-SHA256 (310,000 iterations). Server stores only SHA-256 session token hashes.
- Login/registration throttling is implemented in D1. Prefer adding Cloudflare WAF / rate limiting rules and bot protection before a public rollout.
- **Phone number is an account identifier, not SMS-verified.** Anyone can register an unclaimed number. For real identity verification, add SMS OTP via a trusted provider before opening registration to the public.
- Password recovery is not provided. Users must safeguard their password and export their JSON backup. Production needs an authenticated recovery mechanism and a documented data deletion/privacy policy.
- The GitHub Pages site is public, but D1 data is accessible only after authentication and each query is scoped to the logged-in user. Use HTTPS only. Make sure the site and API are securely maintained.
- Sessions expire after 7 days. They do not survive closing the browser tab; sign back in to retrieve work.
- Optional personal email/phone details are part of CV JSON when users choose to enter them. Get users' consent before storing their CVs remotely.
