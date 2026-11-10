/**
 * Live end-to-end test. Copied into src/ only for test pushes (src/Dev.js is git-ignored); never shipped.
 * Run rowcalE2E from the Apps Script editor. Writes only to the calendar named "Rowcal test".
 */
function rowcalE2E() {
  var out = [];
  function ok(name, cond, extra) { out.push((cond ? 'PASS  ' : 'FAIL  ') + name + (extra !== undefined ? '  [' + extra + ']' : '')); }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('America/Los_Angeles'); // deliberately not the script zone (UTC)
  var tz = ss.getSpreadsheetTimeZone();
  var sheet = ss.getSheets()[0];
  ss.setActiveSheet(sheet);
  CacheService.getUserCache().remove('rowcal_cals');
  var cal = listCalendars_().filter(function (c) { return c.name === 'Rowcal test'; })[0];
  ok('test calendar found', !!cal);
  if (!cal) return finish_(ss, out);
  var calId = cal.id;
  function events() {
    return (Calendar.Events.list(calId, { timeMin: '2026-11-01T00:00:00Z', timeMax: '2026-12-31T00:00:00Z', singleEvents: true, orderBy: 'startTime', maxResults: 500 }).items || []);
  }
  function byTitle(t) { return events().filter(function (e) { return e.summary === t; }); }
  function local(e) { return Utilities.formatDate(new Date(e.start.dateTime), tz, 'yyyy-MM-dd HH:mm') + '>' + Utilities.formatDate(new Date(e.end.dateTime), tz, 'HH:mm'); }

  // ---- reset: test calendar, sheet, settings, usage
  events().forEach(function (e) { Calendar.Events.remove(calId, e.id); });
  docProps_().deleteAllProperties();
  userProps_().deleteProperty('rowcal_usage_' + ROWCAL.monthKey());
  ss.getSheets().forEach(function (s) { if (s.getSheetId() !== sheet.getSheetId()) ss.deleteSheet(s); });
  sheet.clear(); sheet.showColumns(1, sheet.getMaxColumns()); sheet.setName('Schedule');
  sheet.getRange(1, 1, 6, 6).setValues([
    ['Event', 'Date', 'Start time', 'End time', 'Where', 'Notes'],
    ['Dentist', '11/16/2026', '9:30 AM', '10:15 AM', 'Main St', 'Bring insurance card'],
    ['Team offsite', '11/17/2026', '', '', 'Boston', ''],
    ['Quarterly review', '', '2:00 PM', '', 'Room 4', 'Date comes from a formula'],
    ['Row with no date', '', '', '', '', ''],
    ['Client call', '11/19/2026', '14:00', '15:00', '', '']
  ]);
  sheet.getRange(4, 2).setFormula('=DATE(2026,11,18)');
  sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  SpreadsheetApp.flush();

  // ---- settings + mapping
  var st = saveSettings({ calendarId: calId });
  ok('headers auto-mapped', st.map.title === 0 && st.map.start === 1 && st.map.startTime === 2 && st.map.endTime === 3 && st.map.location === 4 && st.map.description === 5, JSON.stringify(st.map));

  // ---- preview changes nothing
  var p = preview();
  ok('preview: 4 create, 1 skip', p.counts && p.counts.create === 4 && p.counts.skip === 1 && p.counts.changes === 4, JSON.stringify(p.counts || p));
  ok('preview wrote nothing to calendar', events().length === 0);
  ok('preview shows sheet-local times', p.sample.some(function (s) { return s.title === 'Dentist' && s.when.indexOf('9:30 AM') >= 0; }), p.sample.map(function (s) { return s.title + ' ' + s.when; }).join(' | '));

  // ---- first sync
  var s1 = sync(false);
  ok('sync 1: no errors', s1.errors && s1.errors.length === 0, JSON.stringify(s1.errors || s1));
  ok('sync 1: 4 events on calendar', events().length === 4, events().length);
  var den = byTitle('Dentist')[0];
  ok('timed event at sheet-local 9:30-10:15 on Nov 16', den && local(den) === '2026-11-16 09:30>10:15', den && local(den));
  ok('location + description carried', den && den.location === 'Main St' && den.description === 'Bring insurance card');
  var off = byTitle('Team offsite')[0];
  ok('no time = all-day on the right date', off && off.start.date === '2026-11-17' && off.end.date === '2026-11-18', off && JSON.stringify(off.start));
  var q = byTitle('Quarterly review')[0];
  ok('formula date works, 60-min default', q && local(q) === '2026-11-18 14:00>15:00', q && local(q));
  var cc = byTitle('Client call')[0];
  ok('24h times work', cc && local(cc) === '2026-11-19 14:00>15:00', cc && local(cc));
  ok('usage counted 4', usageThisMonth_() === 4, usageThisMonth_());

  // ---- re-sync: no duplicates
  var s2 = sync(false);
  ok('sync 2: nothing to do', s2.counts.create === 0 && s2.counts.update === 0 && s2.deleted === 0, JSON.stringify(s2.counts));
  ok('sync 2: still 4 events (no duplicates)', events().length === 4, events().length);

  // ---- edit a row: update in place
  sheet.getRange(2, 1).setValue('Dentist (moved)'); sheet.getRange(2, 3, 1, 2).setValues([['11:00 AM', '11:45 AM']]); SpreadsheetApp.flush();
  var s3 = sync(false);
  var den2 = byTitle('Dentist (moved)')[0];
  ok('edit = 1 update, 0 create', s3.counts.update === 1 && s3.counts.create === 0, JSON.stringify(s3.counts));
  ok('same event id, new title and time', den2 && den && den2.id === den.id && local(den2) === '2026-11-16 11:00>11:45', den2 && local(den2));
  ok('still 4 events', events().length === 4, events().length);

  // ---- delete a row: event removed
  sheet.deleteRow(3); SpreadsheetApp.flush();
  var s4 = sync(false);
  ok('deleted row removes its event', s4.deleted === 1 && byTitle('Team offsite').length === 0 && events().length === 3, JSON.stringify(s4.counts) + ' events=' + events().length);

  // ---- delete-removed switched off: event stays
  saveSettings({ deleteRemoved: false });
  var lastRow = sheet.getLastRow(); // Client call
  sheet.deleteRow(lastRow); SpreadsheetApp.flush();
  var s5 = sync(false);
  ok('with delete off, removed row keeps its event', s5.deleted === 0 && byTitle('Client call').length === 1, 'deleted=' + s5.deleted);
  saveSettings({ deleteRemoved: true });

  // ---- event deleted by hand in Calendar, then row edited: recreated, not an error
  Calendar.Events.remove(calId, q.id);
  sheet.getRange(3, 6).setValue('Edited after the event was deleted in Calendar'); SpreadsheetApp.flush();
  var s6 = sync(false);
  ok('event kept while delete was off is still there after delete is back on', byTitle('Client call').length === 1);
  ok('hand-deleted event is recreated on next edit', s6.errors.length === 0 && byTitle('Quarterly review').length === 1, JSON.stringify(s6.errors) + ' n=' + byTitle('Quarterly review').length);

  // ---- free limit blocks the whole sync, changes nothing
  userProps_().setProperty('rowcal_usage_' + ROWCAL.monthKey(), String(FREE_MONTHLY_CHANGES - 1));
  sheet.getRange(sheet.getLastRow() + 1, 1, 2, 4).setValues([['Extra A', '11/23/2026', '9:00 AM', ''], ['Extra B', '11/24/2026', '9:00 AM', '']]); SpreadsheetApp.flush();
  var before = events().length;
  var s7 = sync(false);
  ok('free limit: sync refused with a clear message', !!s7.limit && /free plan/.test(s7.error || ''), s7.error);
  ok('free limit: nothing changed', events().length === before, events().length);
  userProps_().setProperty('rowcal_usage_' + ROWCAL.monthKey(), '0');
  var s8 = sync(false);
  ok('under the limit again: both created', s8.counts.create === 2 && s8.errors.length === 0, JSON.stringify(s8.counts));

  // ---- licence: no Stripe key configured means free, and a bad email is rejected politely
  ok('no licence = free plan', licenseState_().pro === false);
  ok('activate rejects bad email', !!activateLicense('not-an-email').error);
  ok('auto-sync refused on free plan', !!setAutoSync(true).error && !hasTrigger_());

  // ---- import into an empty sheet, then no duplicates on re-import
  var imp = ss.insertSheet('Imported'); ss.setActiveSheet(imp);
  saveSettings({ calendarId: calId });
  var total = events().length;
  var i1 = importEvents('2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z');
  ok('import brings every event in range', i1.imported === total, JSON.stringify(i1) + ' total=' + total);
  var i2 = importEvents('2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z');
  ok('re-import adds nothing', i2.imported === 0, JSON.stringify(i2));
  var shown = imp.getRange(2, 1, imp.getLastRow() - 1, 3).getDisplayValues().map(function (r) { return r.join(' / '); }).join(' | ');
  ok('imported times read in sheet-local time', /Dentist \(moved\) \/ 11\/16\/2026 11:00:00/.test(shown), shown);
  var p2 = preview();
  ok('fresh import previews as nothing to change', p2.counts && p2.counts.changes === 0, JSON.stringify(p2.counts || p2));
  imp.getRange(2, 1).setValue(imp.getRange(2, 1).getValue() + ' *edited*'); SpreadsheetApp.flush();
  var s9 = sync(false);
  ok('editing an imported row updates its event', s9.counts.update === 1 && s9.counts.create === 0 && events().length === total, JSON.stringify(s9.counts));

  // ---- run log
  var log = ss.getSheetByName('Rowcal Log');
  ok('run log has a line per run', !!log && log.getLastRow() >= 10, log && log.getLastRow());
  ss.setActiveSheet(sheet);
  return finish_(ss, out);
}

function finish_(ss, out) {
  var fails = out.filter(function (l) { return l.indexOf('FAIL') === 0; }).length;
  out.push('RESULT: ' + (out.length - fails) + ' passed, ' + fails + ' failed');
  var sh = ss.getSheetByName('E2E results') || ss.insertSheet('E2E results');
  sh.clear(); sh.getRange(1, 1, out.length, 1).setValues(out.map(function (l) { return [l]; }));
  Logger.log(out.join('\n'));
  return out;
}

/** Trigger check: does the time-based path work with the narrow sheet permission? */
function devTriggerStart() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getSheetByName('Schedule');
  docProps_().setProperty('rowcal_trigger_sheet', String(sheet.getSheetId()));
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([['Made by the timer', '11/25/2026', '10:00 AM', '']]);
  ScriptApp.newTrigger('devTriggerTick').timeBased().everyMinutes(1).create();
}
function devTriggerTick() {
  var note;
  try { note = JSON.stringify(sync(true)); } catch (e) { note = 'THREW: ' + e.message; }
  PropertiesService.getScriptProperties().setProperty('dev_trigger_result', new Date().toISOString() + ' ' + note);
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}
function devTriggerResult() { Logger.log(PropertiesService.getScriptProperties().getProperty('dev_trigger_result') || 'no result yet'); }
