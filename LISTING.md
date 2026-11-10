# Minutehand — Marketplace listing (draft, working name)

Limits and rules below were read from Google's own pages on 2026-11-10: [create a listing](https://developers.google.com/workspace/marketplace/create-listing) and [branding](https://developers.google.com/workspace/marketplace/terms/branding).

**App name (max 50, must match the OAuth consent screen):** Minutehand: Sheets™ to Calendar™ Sync & Import

**Short description (max 200):** Turn Google Sheets™ rows into Google Calendar™ events, and import events back. Preview every change first. No duplicates. Asks only for the one spreadsheet it is open in.

**Detailed description (max 16,000):**

Minutehand turns the rows of a Google Sheets™ spreadsheet into Google Calendar™ events, and pulls events back into a sheet. It shows you every change before it makes one, and it asks for as little access as it can.

HOW IT WORKS

1. Open Minutehand from the Extensions menu and pick a calendar.
2. Press Preview. Minutehand reads your headers, matches the columns for you, and lists what it would create, update or delete.
3. Press Sync when the list looks right. Nothing touches your calendar before that.

WHAT YOU GET

Preview before anything changes. You see "8 to create, 1 to update, 0 to delete" with the rows listed. Rows it has to skip are named, with the reason.

No duplicates. Minutehand remembers which row made which event. Sync as often as you like: edited rows update their event, unchanged rows are left alone, and removed rows can remove their event if you switch that on.

Events land at the time you typed. A spreadsheet has its own time zone setting, and it often does not match your calendar. Minutehand reads your times in your calendar's own time zone and shows you which zone it is using.

Works with real spreadsheets. Formula dates, separate date and time columns, all-day events, and any column order.

Import too. Pull any date range of events into a sheet. Imported rows stay linked, so editing one updates the calendar instead of making a copy.

A run log. Every sync is recorded in a tab of your own spreadsheet.

THE SMALLEST ASK WE COULD MAKE

Before you install any calendar add-on, open its Permissions tab. Minutehand asks to:

- See and edit the one spreadsheet it is open in. It cannot see your other spreadsheets or your Drive.
- Create and change calendar events. It cannot delete or share your calendars, and it only touches the calendar you pick.
- See the list of your calendars, to fill the picker and read that calendar's time zone.

It does not ask for your contacts, your email address or your profile. It also asks to show its sidebar, to run the hourly sync if you switch that on, and to contact Stripe only to check a Pro subscription. Nothing you sync leaves Google.

PLANS

Free: 50 event changes a month, on any dates, counted in the sidebar where you can see it. No account to create on our website.
Pro: unlimited changes and hourly auto-sync.

NOT YET

Guest invites, Google Meet™ links and recurring events are not supported yet. If you need one of them, tell us and it moves up the list.

Questions, or a column layout that does not map? https://bjhegney-ntia.github.io/rowcal

Google Sheets™, Google Calendar™, Google Drive™ and Google Meet™ are trademarks of Google LLC.

**Category:** Productivity
**Pricing text:** Free of charge with paid features
**Pro price (open, your call):** sketch was $4/month or $29/year. Sheet2Cal, the best-rated rival, charges $19.99 once for life. See the project note.

**Graphics (built by `store/build.sh`, all in `store/`, all 1280x800):**
1. `screenshot-1.png` — See every change before it touches your calendar
2. `screenshot-2.png` — Events land at the time you typed (calendar week)
3. `screenshot-3.png` — Edit a row. The event updates. No duplicates.
4. `screenshot-4.png` — Asks for only what it uses (permissions, in plain words)
5. `screenshot-5.png` — Import any date range, and keep it linked
6. `screenshot-6.png` — A free plan with nothing hidden (counter and run log)
- Icons: `icon-128.png`, `icon-96.png`, `icon-48.png`, `icon-32.png` · Card banner: `banner-220x140.png`
- The Sheet and sidebar panels are real captures from a live run on 2026-11-10. Headlines, the teal callouts and the permissions slide are added graphics.

**Why this copy (checked 2026-11-10 on the public Permissions tab of each listing):**
- Sheets2GCal (8M+ installs) asks to see, edit, create and delete all your spreadsheets, plus your email address and profile.
- Sheet.Cal (25K+) asks to see, edit, share and permanently delete all your calendars, to download your contacts, plus email and profile. It already sells a preview, no duplicates and a log, so those alone are not a wedge against it.
- Sheet2Cal (27K+) asks to see, edit, share and permanently delete all your calendars, plus email and profile.
- Minutehand asks for none of those. The copy never names a rival; it tells the reader where to look.
- Not checked: whether rivals place times correctly. The copy therefore claims only what Minutehand does.

**Name check (2026-11-10):** the first working name, Rowcal, was dropped. "rowCall" is a Sheets add-on with 391K+ installs, and "Calrows" is a direct rival. A Marketplace search for "Minutehand" returns nothing, and a web search found no product by that name. No formal trademark search has been run.

**Permissions Google will show, and why (for the OAuth verification form):**
- View and manage spreadsheets this application has been installed in — read rows, write the hidden Minutehand ID column and run log
- View and edit events on all your calendars — create, update and delete only the events Minutehand made, on the calendar the user picks
- See the list of Google calendars you're subscribed to — fill the calendar picker and read that calendar's time zone
- Connect to an external service — one call to Stripe to check a Pro subscription by checkout email
- Allow this application to run when you are not present — hourly auto-sync (Pro)
- Display and run third-party web content in prompts and sidebars — the sidebar itself

**Known before submitting:**
- Stripe is not set up, so the Upgrade button is hidden and everyone is on the free plan.
- Hourly auto-sync ran correctly as a Sheet-bound script. Google does not run timers in add-on test mode, so it is unproven as a published add-on until a private or public publish.
- The two Apps Script projects are still titled "Rowcal" and "Rowcal test", and the GitHub repo and page addresses still say `rowcal`. Rename the shipped project to Minutehand when the Cloud project is created; the name users see comes from the listing and the consent screen.
- `scripts/push.sh prod` pushes the shipped project and refuses if test harness code is present.

**Support URL:** https://bjhegney-ntia.github.io/rowcal  ·  **Privacy:** https://bjhegney-ntia.github.io/rowcal/privacy.html  ·  **Terms:** https://bjhegney-ntia.github.io/rowcal/terms.html
