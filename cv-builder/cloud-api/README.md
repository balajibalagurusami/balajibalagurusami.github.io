# CV Builder at https://aecbim.work, with Cloudflare Worker + D1

This is **one Cloudflare Worker deployment** that serves the existing static CV Builder at the root of `aecbim.work` **and** handles the API for phone/password accounts and cloud CV drafts. The frontend remains maintained in `cv-builder/index.html` on GitHub. It is not a new WILP site.

**Important:** The repository is prepared, but Cloudflare dashboard settings, D1 migrations, and actual deployment require access to the owner's Cloudflare account. Editing GitHub alone does NOT change live DNS or deploy the Worker.

## Layout

- Website source: `cv-builder/index.html`, `cv-builder/cloud-client.js`, `cv-builder/cloud-config.js`
- Worker API code: `cv-builder/cloud-api/src/index.js`
- D1 migration: `cv-builder/cloud-api/migrations/0001_init.sql`
- Deploy config: `cv-builder/cloud-api/wrangler.jsonc`
- `cv-builder/.assetsignore` prevents Worker server code from being published as web files.

The Wrangler `assets.directory` is `../`, relative to `cloud-api/wrangler.jsonc`, so `cv-builder/index.html` is served at **`https://aecbim.work/`**, not `/cv-builder/`. A single Worker handles both the static files and `/api/*`. No copying the site's HTML into another repository is required.

## Cloudflare dashboard deployment (no local files)

1. **Do not edit or detach** `wilp.aecbim.work` or `wilptest.aecbim.work`. They are independent hostnames.
2. In Cloudflare, go to **D1 SQL database** and open your existing **`cv-builder-users`** database. Make sure the UUID in `wrangler.jsonc` matches this database.
3. In the database **Console**, run the content of [migrations/0001_init.sql](./migrations/0001_init.sql) to create the `users`, `sessions`, `cvs` and `login_limits` tables. It uses `CREATE TABLE IF NOT EXISTS`, so it can be rerun safely. This is the dashboard alternative to `npx wrangler d1 migrations apply cv-builder-users --remote`.
4. In **Workers & Pages**, deploy or connect the Worker named **`cv-builder-cloud-api`** to the GitHub repository `balajibalagurusami/balajibalagurusami.github.io`, branch `main`, root directory **`cv-builder/cloud-api`**. Use **no build command** and deployment command **`npx wrangler deploy`**. Use an existing Worker of this exact name if one was previously created; do not create a second identical one.
5. The Wrangler config requests **`aecbim.work` as its Custom Domain**, without touching WILP. If deployment reports a domain conflict, inspect the *root/apex* DNS and Worker/Pages custom-domain mapping in Cloudflare before replacing any records. Do not delete any `wilp` or `wilptest` DNS records or routes. Existing apex CNAMEs may need an intentional cutover.
6. Verify `https://aecbim.work/` renders the CV Builder and `https://aecbim.work/health` returns `{"ok":true,"service":"cv-cloud-api"}`. Then register in **Cloud drafts**, save a CV, sign out, sign back in, and retrieve it.
7. Optional: configure a Cloudflare **Redirect Rule** for `www.aecbim.work` -> `https://aecbim.work` (not a redirect for `wilp`). Do not add a second full website at `www`.

## Security

- For an account, enter a phone number in E.164 format (or a 10-digit India number) and a password of 12-128 characters.
- Phone numbers are **not SMS-verified**. Do not advertise registration as phone-number ownership verification. Before a broad public launch, add SMS OTP verification, recovery, privacy and deletion policies, WAF rate limits, and proper consent.
- Passwords are stored as individually salted PBKDF2-SHA256 hashes; sessions store a hash of bearer tokens.
- CV JSON and personal data are stored **only in the Cloudflare D1 account**, not in GitHub.
- Existing GitHub Pages URL `https://balajibalagurusami.github.io/cv-builder/` remains available, but its Cloud drafts panel stays inactive unless separately configured.
- Sessions are stored only in tab-scoped `sessionStorage` and expire after seven days.
- `ALLOWED_ORIGINS` includes the root domain and current GitHub Pages origin. Server-side origin checks are supplementary; the API still requires authenticated bearer tokens for every account-specific operation.
