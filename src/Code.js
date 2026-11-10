/** Rowcal: Sheets → Calendar sync with a preview first. Apps Script side. */

var FREE_MONTHLY_CHANGES = 50;
var LOG_SHEET = 'Rowcal Log';

function onInstall(e) { onOpen(e); }
function onOpen(e) {
  SpreadsheetApp.getUi().createAddonMenu().addItem('Open Rowcal', 'showSidebar').addToUi();
}
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Rowcal');
  SpreadsheetApp.getUi().showSidebar(html);
}

// ---------- which sheet ----------
/** The sidebar passes the id of the tab it was opened on, so preview and sync always act on the same tab. */
function sheet_(sheetId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (sheetId === undefined || sheetId === null) return ss.getActiveSheet();
  return ss.getSheets().filter(function (s) { return s.getSheetId() === Number(sheetId); })[0] || null;
}
var NO_SHEET = { error: 'That tab no longer exists. Reopen Rowcal on the tab you want to sync.' };

// ---------- settings ----------
function sheetKey_(sheet) { return 'rowcal_' + sheet.getSheetId(); }
function docProps_() { return PropertiesService.getDocumentProperties(); }
function getSettings_(sheet) {
  var raw = docProps_().getProperty(sheetKey_(sheet) + '_settings');
  var s = raw ? JSON.parse(raw) : {};
  if (!s.defaultMinutes) s.defaultMinutes = 60;
  if (s.deleteRemoved === undefined) s.deleteRemoved = true;
  return s;
}
function saveSettings(settings, sheetId) {
  var sheet = sheet_(sheetId);
  if (!sheet) return NO_SHEET;
  var cur = getSettings_(sheet);
  Object.keys(settings).forEach(function (k) { cur[k] = settings[k]; });
  docProps_().setProperty(sheetKey_(sheet) + '_settings', JSON.stringify(cur));
  return getState(sheet.getSheetId());
}
function knownIds_(sheet) {
  var raw = docProps_().getProperty(sheetKey_(sheet) + '_known');
  return raw ? JSON.parse(raw) : [];
}
function saveKnownIds_(sheet, ids) { docProps_().setProperty(sheetKey_(sheet) + '_known', JSON.stringify(ids)); }

function headers_(sheet) {
  var lastCol = sheet.getLastColumn();
  return lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
}
function effectiveMap_(sheet, settings) {
  var map = ROWCAL.autoMap(headers_(sheet));
  var o = settings.mapOverrides || {};
  Object.keys(o).forEach(function (f) { if (o[f] !== undefined && o[f] !== null) map[f] = Number(o[f]); });
  return map;
}

/** Everything the sidebar needs to render. */
function getState(sheetId) {
  var sheet = sheet_(sheetId);
  if (!sheet) return NO_SHEET;
  if (sheet.getName() === LOG_SHEET) return { error: 'This is Rowcal\'s own log tab. Open Rowcal on the tab that holds your events.' };
  var settings = getSettings_(sheet);
  var headers = headers_(sheet);
  var lic = licenseState_();
  return {
    sheetId: sheet.getSheetId(),
    sheetName: sheet.getName(),
    headers: headers.map(function (h, i) { return { i: i, name: String(h || ('Column ' + (i + 1))) }; }),
    map: effectiveMap_(sheet, settings),
    fields: ROWCAL.FIELDS,
    settings: settings,
    calendars: listCalendars_(),
    timeZone: SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
    usage: usageThisMonth_(),
    freeLimit: FREE_MONTHLY_CHANGES,
    pro: lic.pro,
    licenseEmail: lic.email || '',
    upgradeUrl: PropertiesService.getScriptProperties().getProperty('UPGRADE_URL') || '',
    autoSync: hasTrigger_()
  };
}

function listCalendars_() {
  var cache = CacheService.getUserCache(), hit = cache.get('rowcal_cals');
  if (hit) return JSON.parse(hit);
  var out = [], token;
  do {
    var res = Calendar.CalendarList.list({ minAccessRole: 'writer', pageToken: token, maxResults: 250 });
    (res.items || []).forEach(function (c) { out.push({ id: c.id, name: c.summaryOverride || c.summary, primary: !!c.primary }); });
    token = res.nextPageToken;
  } while (token);
  out.sort(function (a, b) { return (b.primary - a.primary) || a.name.localeCompare(b.name); });
  cache.put('rowcal_cals', JSON.stringify(out), 600);
  return out;
}

// ---------- preview & sync ----------
/*
 * Time zones. The script runs in UTC; spreadsheets can be in any zone. Cell dates are converted to
 * "wall-clock" Dates (script-local fields equal what the user sees in the sheet), all logic runs on
 * those, and events are sent as local time strings labelled with the spreadsheet's zone.
 */
var WALL_FMT = "yyyy-MM-dd'T'HH:mm:ss";
function scriptTz_() { return Session.getScriptTimeZone(); }
function toWall_(v, ssTz) {
  if (Object.prototype.toString.call(v) !== '[object Date]' || isNaN(v.getTime())) return v;
  var m = Utilities.formatDate(v, ssTz, WALL_FMT).match(/^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)$/);
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}
function fromWall_(d, ssTz) { return Utilities.parseDate(Utilities.formatDate(d, scriptTz_(), WALL_FMT), ssTz, WALL_FMT); }
function readRows_(sheet) {
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 2 || !lastCol) return [];
  var tz = sheet.getParent().getSpreadsheetTimeZone();
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues().map(function (row) {
    return row.map(function (v) { return toWall_(v, tz); });
  });
}

function preview(sheetId) {
  var sheet = sheet_(sheetId);
  if (!sheet) return NO_SHEET;
  var settings = getSettings_(sheet);
  var map = effectiveMap_(sheet, settings);
  if (map.title < 0 || map.start < 0) return { error: 'Map at least a Title column and a Start date column.' };
  if (!settings.calendarId) return { error: 'Pick a calendar first.' };
  var p = ROWCAL.plan(readRows_(sheet), map, settings, knownIds_(sheet));
  var sample = p.items.filter(function (i) { return i.action !== 'unchanged'; }).slice(0, 40).map(function (i) {
    return { row: i.row, action: i.action, reason: i.reason || '', title: i.desired ? i.desired.summary : '', when: i.desired ? fmtWhen_(i.desired) : '' };
  });
  return { counts: p.counts, sample: sample, lic: licenseState_(), usage: usageThisMonth_(), freeLimit: FREE_MONTHLY_CHANGES };
}

function fmtWhen_(d) {
  var tz = scriptTz_();
  return d.allDay ? Utilities.formatDate(d.start, tz, 'EEE MMM d') + ' (all day)'
    : Utilities.formatDate(d.start, tz, 'EEE MMM d, h:mm a') + ' – ' + Utilities.formatDate(d.end, tz, 'h:mm a');
}

function toEventResource_(d, ssTz) {
  var r = { summary: d.summary, description: d.description, location: d.location };
  var tz = scriptTz_();
  if (d.allDay) {
    r.start = { date: Utilities.formatDate(d.start, tz, 'yyyy-MM-dd') };
    r.end = { date: Utilities.formatDate(d.end, tz, 'yyyy-MM-dd') };
  } else {
    r.start = { dateTime: Utilities.formatDate(d.start, tz, WALL_FMT), timeZone: ssTz };
    r.end = { dateTime: Utilities.formatDate(d.end, tz, WALL_FMT), timeZone: ssTz };
  }
  return r;
}

function ensureIdColumn_(sheet, map) {
  if (map.id >= 0) return map.id;
  var col = Math.max(sheet.getLastColumn(), 1) + 1;
  sheet.getRange(1, col).setValue(ROWCAL.ID_HEADER).setFontColor('#999999');
  sheet.hideColumns(col);
  return col - 1;
}

/** Apply the plan. Called by the sidebar after preview, and by the hourly trigger. */
function sync(fromTrigger, sheetId) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return { error: 'Another sync is running. Try again in a moment.' };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = fromTrigger ? triggerSheet_(ss) : sheet_(sheetId);
    if (!sheet) return fromTrigger ? { error: 'The tab set up for auto-sync no longer exists.' } : NO_SHEET;
    var settings = getSettings_(sheet);
    var map = effectiveMap_(sheet, settings);
    if (map.title < 0 || map.start < 0 || !settings.calendarId) return { error: 'Set up the columns and calendar first.' };
    var tz = ss.getSpreadsheetTimeZone();
    var rows = readRows_(sheet);
    var p = ROWCAL.plan(rows, map, settings, knownIds_(sheet));
    var lic = licenseState_();
    var used = usageThisMonth_();
    if (!lic.pro && used + p.counts.changes > FREE_MONTHLY_CHANGES) {
      return { error: 'This sync needs ' + p.counts.changes + ' event changes. The free plan has ' + Math.max(0, FREE_MONTHLY_CHANGES - used) + ' left this month. Nothing was changed.', limit: true };
    }
    var idCol = ensureIdColumn_(sheet, map) + 1;
    var calId = settings.calendarId;
    // known = every event this sheet is responsible for after this run. Rows that vanish while
    // "delete removed" is off are forgotten, so switching it on later never deletes old events.
    var errors = [], known = {}, idWrites = [], failedRows = 0;
    p.items.forEach(function (it) {
      if (it.action === 'unchanged' || it.action === 'skip') { if (it.eventId) known[it.eventId] = true; return; }
      var res = toEventResource_(it.desired, tz);
      try {
        var ev;
        if (it.action === 'create') ev = Calendar.Events.insert(res, calId);
        else {
          try { ev = Calendar.Events.patch(res, calId, it.eventId); if (ev.status === 'cancelled') throw new Error('Not Found (cancelled)'); }
          catch (e) { // event was deleted in Calendar: recreate rather than fail
            if (/Not Found|404|410|deleted/i.test(String(e))) ev = Calendar.Events.insert(res, calId);
            else throw e;
          }
        }
        known[ev.id] = true;
        idWrites.push({ row: it.row, value: ROWCAL.formatIdCell(ev.id, it.hash) });
      } catch (e) { failedRows++; if (it.eventId) known[it.eventId] = true; errors.push('Row ' + it.row + ': ' + e.message); }
    });
    var deleted = 0;
    p.deletes.forEach(function (id) {
      try { Calendar.Events.remove(calId, id); deleted++; }
      catch (e) { if (!/Not Found|404|410|deleted/i.test(String(e))) { known[id] = true; errors.push('Delete ' + id + ': ' + e.message); } }
    });
    idWrites.forEach(function (w) { sheet.getRange(w.row, idCol).setValue(w.value); });
    saveKnownIds_(sheet, Object.keys(known));
    var changes = p.counts.create + p.counts.update + deleted - failedRows;
    addUsage_(changes);
    log_(ss, fromTrigger ? 'auto-sync' : 'sync', sheet.getName(), p.counts.create, p.counts.update, deleted, p.counts.skip, errors);
    return { counts: p.counts, deleted: deleted, errors: errors, usage: usageThisMonth_() };
  } finally { lock.releaseLock(); }
}

// ---------- import from calendar ----------
function importEvents(fromIso, toIso, sheetId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = sheet_(sheetId);
  if (!sheet) return NO_SHEET;
  var settings = getSettings_(sheet);
  if (!settings.calendarId) return { error: 'Pick a calendar first.' };
  var tz = ss.getSpreadsheetTimeZone();
  var headers = headers_(sheet);
  var map;
  if (!headers.length || headers.every(function (h) { return h === ''; })) {
    headers = ['Title', 'Start', 'End', 'All day', 'Location', 'Description', ROWCAL.ID_HEADER];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.hideColumns(headers.length);
    map = ROWCAL.autoMap(headers);
  } else {
    map = effectiveMap_(sheet, settings);
    if (map.title < 0 || map.start < 0) return { error: 'Map Title and Start columns first, or import into an empty sheet.' };
    map.id = ensureIdColumn_(sheet, map);
  }
  var existing = {};
  readRows_(sheet).forEach(function (r) { var id = ROWCAL.parseIdCell(r[map.id]).eventId; if (id) existing[id] = true; });
  var items = [], token;
  do {
    var res = Calendar.Events.list(settings.calendarId, { timeMin: fromIso, timeMax: toIso, singleEvents: true, orderBy: 'startTime', maxResults: 2500, pageToken: token });
    items = items.concat(res.items || []); token = res.nextPageToken;
  } while (token);
  var width = Math.max(sheet.getLastColumn(), map.id + 1);
  var out = [], formats = [], known = knownIds_(sheet);
  items.forEach(function (ev) {
    if (!ev.summary || existing[ev.id]) return;
    var allDay = !!(ev.start && ev.start.date);
    var start = allDay ? parseYmd_(ev.start.date) : toWall_(new Date(ev.start.dateTime), tz);
    var end = allDay ? parseYmd_(ev.end.date) : toWall_(new Date(ev.end.dateTime), tz);
    var row = []; for (var i = 0; i < width; i++) row.push('');
    row[map.title] = ev.summary;
    row[map.start] = start;
    if (map.end >= 0) row[map.end] = allDay ? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1) : end;
    if (map.allDay >= 0) row[map.allDay] = allDay;
    if (map.location >= 0) row[map.location] = ev.location || '';
    if (map.description >= 0) row[map.description] = ev.description || '';
    var d = ROWCAL.buildDesired(row, map, settings); // hash on wall-clock values, as a later sync will see them
    row[map.id] = d.skip ? ev.id : ROWCAL.formatIdCell(ev.id, ROWCAL.desiredHash(d));
    known.push(ev.id);
    out.push(row.map(function (v) { return Object.prototype.toString.call(v) === '[object Date]' ? fromWall_(v, tz) : v; }));
    formats.push(allDay ? 'm/d/yyyy' : 'm/d/yyyy h:mm am/pm');
  });
  if (out.length) {
    var first = sheet.getLastRow() + 1;
    sheet.getRange(first, 1, out.length, width).setValues(out);
    var fcol = formats.map(function (f) { return [f]; });
    sheet.getRange(first, map.start + 1, out.length, 1).setNumberFormats(fcol);
    if (map.end >= 0) sheet.getRange(first, map.end + 1, out.length, 1).setNumberFormats(fcol);
  }
  saveKnownIds_(sheet, known);
  log_(ss, 'import', sheet.getName(), out.length, 0, 0, items.length - out.length, []);
  return { imported: out.length, skipped: items.length - out.length };
}
function parseYmd_(s) { var m = s.split('-'); return new Date(+m[0], +m[1] - 1, +m[2]); }

// ---------- auto-sync (Pro) ----------
function hasTrigger_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'autoSync'; });
}
function setAutoSync(on, sheetId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = sheet_(sheetId);
  if (!sheet) return NO_SHEET;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'autoSync') ScriptApp.deleteTrigger(t); });
  if (on) {
    if (!licenseState_().pro) return { error: 'Hourly auto-sync is a Pro feature.' };
    docProps_().setProperty('rowcal_trigger_sheet', String(sheet.getSheetId()));
    ScriptApp.newTrigger('autoSync').timeBased().everyHours(1).create();
  }
  return getState(sheet.getSheetId());
}
function triggerSheet_(ss) {
  var id = docProps_().getProperty('rowcal_trigger_sheet');
  return ss.getSheets().filter(function (s) { return String(s.getSheetId()) === id; })[0];
}
function autoSync() { sync(true); }

// ---------- usage & licence ----------
function userProps_() { return PropertiesService.getUserProperties(); }
function usageThisMonth_() { return Number(userProps_().getProperty('rowcal_usage_' + ROWCAL.monthKey()) || 0); }
function addUsage_(n) { if (n > 0) userProps_().setProperty('rowcal_usage_' + ROWCAL.monthKey(), String(usageThisMonth_() + n)); }

function licenseState_() {
  var email = userProps_().getProperty('rowcal_license_email');
  var until = Number(userProps_().getProperty('rowcal_license_until') || 0);
  if (!email) return { pro: false };
  if (until > Date.now()) return { pro: true, email: email };
  var ok = stripeHasActiveSubscription_(email);
  if (ok === null) return { pro: until > Date.now() - 7 * 86400000, email: email }; // Stripe unreachable: 7-day grace
  userProps_().setProperty('rowcal_license_until', String(Date.now() + (ok ? 86400000 : 0)));
  return { pro: ok, email: email };
}
/** Returns true/false, or null when Stripe cannot be reached. Uses a read-only restricted key. */
function stripeHasActiveSubscription_(email) {
  var key = PropertiesService.getScriptProperties().getProperty('STRIPE_RESTRICTED_KEY');
  if (!key) return false;
  try {
    var h = { headers: { Authorization: 'Bearer ' + key }, muteHttpExceptions: true };
    var q = "email:'" + email.replace(/'/g, "\\'") + "'";
    var cr = UrlFetchApp.fetch('https://api.stripe.com/v1/customers/search?query=' + encodeURIComponent(q), h);
    if (cr.getResponseCode() !== 200) return null;
    var customers = JSON.parse(cr.getContentText()).data || [];
    for (var i = 0; i < customers.length; i++) {
      var sr = UrlFetchApp.fetch('https://api.stripe.com/v1/subscriptions?customer=' + customers[i].id + '&status=active&limit=1', h);
      if (sr.getResponseCode() === 200 && (JSON.parse(sr.getContentText()).data || []).length) return true;
    }
    return false;
  } catch (e) { return null; }
}
function activateLicense(email, sheetId) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter the email you used at checkout.' };
  var ok = stripeHasActiveSubscription_(email);
  if (ok === null) return { error: 'Could not reach the licence server. Try again in a minute.' };
  if (!ok) return { error: 'No active Rowcal Pro subscription found for ' + email + '.' };
  userProps_().setProperties({ rowcal_license_email: email, rowcal_license_until: String(Date.now() + 86400000) });
  return getState(sheetId);
}
function removeLicense(sheetId) { userProps_().deleteProperty('rowcal_license_email'); userProps_().deleteProperty('rowcal_license_until'); return getState(sheetId); }

// ---------- log ----------
function log_(ss, action, sheetName, created, updated, deleted, skipped, errors) {
  var sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    var active = ss.getActiveSheet(); // creating a tab makes it active; put the user back where they were
    sh = ss.insertSheet(LOG_SHEET, ss.getNumSheets());
    sh.appendRow(['When', 'Action', 'Sheet', 'Created', 'Updated', 'Deleted', 'Skipped', 'Errors']);
    sh.getRange(1, 1, 1, 8).setFontWeight('bold');
    sh.hideSheet();
    ss.setActiveSheet(active);
  }
  sh.appendRow([new Date(), action, sheetName, created, updated, deleted, skipped, errors.join('\n')]);
}
function showLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) return { error: 'No runs yet.' };
  sh.showSheet(); ss.setActiveSheet(sh); return {};
}
