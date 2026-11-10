# Rowcal — Marketplace listing (draft, working name)

**Title (max 50):** Rowcal: Sheets to Calendar Sync, Preview First

**Short description (max 100):** Turn rows into calendar events. See every change before it happens. No duplicates, ever.

**Detailed description:**

Rowcal turns a Google Sheet into Google Calendar events, and back. Unlike most sync add-ons, it shows you exactly what will happen before it touches your calendar.

**Preview before anything changes.** Press Preview and see "8 to create, 1 to update, 0 to delete" with the rows listed. Press Sync only when it looks right.

**No duplicates.** Rowcal remembers which row made which event. Run it again and again: edited rows update their event, unchanged rows are left alone, and deleted rows can remove their event.

**Times land where you typed them.** Many spreadsheets carry a hidden time zone that is wrong, which is why other tools put events three hours off. Rowcal reads your times in your calendar's own time zone and tells you which zone it is using.

**Works with real spreadsheets.** Formula dates, separate date and time columns, all-day events, and any column order. Rowcal reads your headers and maps them for you; change the mapping in two clicks.

**Import too.** Pull a date range of events from any calendar into the sheet. Imported rows stay linked, so editing them updates the calendar.

**Honest limits.** Free: 50 event changes a month, counted in the sidebar. Pro: unlimited changes and hourly auto-sync. No account on our website, no hidden quota, and a run log you can open any time.

**Minimal permissions.** Rowcal can only see the spreadsheet it is open in, never your other files. It asks for calendar events and the list of your calendars, and nothing you sync leaves Google.

Questions or a column layout that doesn't map? https://bjhegney-ntia.github.io/rowcal

**Category:** Productivity → Calendars & Scheduling (Sheets)
**Pricing text:** Free of charge with paid features
**Pro price (sketch):** $4/month or $29/year via Stripe
**Keywords in copy:** sheets to calendar, calendar sync, create events from spreadsheet, bulk calendar events, import calendar to sheets

**Graphics (built by `store/build.sh`, all in `store/`):**
1. `screenshot-1.png` — See every change before it touches your calendar (preview, 8 to create)
2. `screenshot-2.png` — Your rows, on your calendar, at the time you typed (calendar week)
3. `screenshot-3.png` — Edit a row and the event updates. No duplicates. (1 update)
4. `screenshot-4.png` — Import any date range, and keep it linked
5. `screenshot-5.png` — An honest free plan, and a log of every run
- Icons: `icon-128.png`, `icon-96.png`, `icon-48.png`, `icon-32.png` · Card banner: `banner-220x140.png`

**Permissions Google will show, and why (for the OAuth verification form):**
- View and manage spreadsheets this application has been installed in — read rows, write the hidden Rowcal ID column and run log
- View and edit events on all your calendars — create, update and delete only the events Rowcal made, on the calendar the user picks
- See the list of Google calendars you're subscribed to — fill the calendar picker and read that calendar's time zone
- Connect to an external service — one call to Stripe to check a Pro subscription by checkout email
- Allow this application to run when you are not present — hourly auto-sync (Pro)
- Display and run third-party web content in prompts and sidebars — the sidebar itself

**Known before submitting:**
- Stripe is not set up, so the Upgrade button is hidden and everyone is on the free plan.
- Hourly auto-sync ran correctly as a Sheet-bound script. Google does not run timers in add-on test mode, so it is unproven as a published add-on until a private or public publish.
- `scripts/push.sh prod` pushes the shipped project and refuses if test harness code is present.

**Support URL:** https://bjhegney-ntia.github.io/rowcal  ·  **Privacy:** https://bjhegney-ntia.github.io/rowcal/privacy.html  ·  **Terms:** https://bjhegney-ntia.github.io/rowcal/terms.html
