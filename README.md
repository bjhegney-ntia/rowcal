# Minutehand

Google Sheets add-on: rows → Calendar events with a preview first. Apps Script, no servers.

- `src/` — the Apps Script project (`clasp push` target). `Lib.js` is pure logic shared with tests.
- `test/lib.test.js` — `node test/lib.test.js`
- `docs/` — landing, privacy and terms pages, served by GitHub Pages
- `LISTING.md` — Marketplace copy and screenshot plan

## Deploy (one-time setup, needs Brian's Google login)
1. `npx @google/clasp login` (opens a browser once)
2. `npx @google/clasp create --type sheets --title "Minutehand" --rootDir src` (creates a bound test sheet + script)
3. `npx @google/clasp push` then open the sheet → Extensions → Minutehand → Open Minutehand
4. Script properties (Apps Script editor → Project settings): `STRIPE_RESTRICTED_KEY` (read-only on Customers and Subscriptions), `UPGRADE_URL` (Stripe payment link)
5. Marketplace: Cloud project → OAuth consent (brand verification; sensitive scopes only, no CASA) → Marketplace SDK → listing → submit
