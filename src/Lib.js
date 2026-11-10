/**
 * Rowcal pure logic. No Apps Script services here, so it runs in Node tests.
 * Loaded in Apps Script as a global `ROWCAL`.
 */
var ROWCAL = (function () {
  var ID_HEADER = 'Rowcal ID';
  var FIELDS = ['title', 'start', 'startTime', 'end', 'endTime', 'description', 'location', 'allDay', 'calendar'];
  var SYNONYMS = {
    title: ['title', 'event', 'event title', 'event name', 'subject', 'name', 'summary', 'what'],
    start: ['start', 'start date', 'date', 'begin', 'from', 'start date/time', 'start datetime', 'when', 'day'],
    startTime: ['start time', 'time', 'from time', 'begin time'],
    end: ['end', 'end date', 'finish', 'to', 'until', 'end date/time', 'end datetime'],
    endTime: ['end time', 'to time', 'finish time'],
    description: ['description', 'notes', 'details', 'note', 'body', 'desc'],
    location: ['location', 'where', 'place', 'address', 'venue', 'room'],
    allDay: ['all day', 'allday', 'all-day', 'all day?', 'all day event'],
    calendar: ['calendar', 'calendar id', 'calendar name']
  };

  function norm(s) {
    return String(s === null || s === undefined ? '' : s).trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
  }

  /** Map header names to column indexes. Unmapped fields are -1. */
  function autoMap(headers) {
    var map = {}, used = {}, normed = headers.map(norm);
    FIELDS.forEach(function (f) {
      map[f] = -1;
      for (var i = 0; i < normed.length; i++) {
        if (!used[i] && SYNONYMS[f].indexOf(normed[i]) >= 0) { map[f] = i; used[i] = true; break; }
      }
    });
    map.id = normed.indexOf(norm(ID_HEADER));
    return map;
  }

  function isBlank(v) { return v === null || v === undefined || String(v).trim() === ''; }
  function isDate(v) { return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime()); }

  function parseDateish(v) {
    if (isDate(v)) return new Date(v.getTime());
    if (typeof v === 'number') return null; // serials are not expected from getValues
    var s = String(v).trim();
    if (!s) return null;
    var d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    // "2026-11-10 9:30" style
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    return null;
  }

  /** Returns {h, m} or null. Accepts Date (time-only cells), "9:30", "9:30 AM", "14:05". */
  function parseTime(v) {
    if (isBlank(v)) return null;
    if (isDate(v)) return { h: v.getHours(), m: v.getMinutes() };
    var s = String(v).trim().toLowerCase();
    var m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    var h = +m[1], mi = +(m[2] || 0);
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (h > 23 || mi > 59) return null;
    return { h: h, m: mi };
  }

  function hasClockTime(d) { return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0; }

  function combine(dateVal, timeVal) {
    var d = parseDateish(dateVal);
    if (!d) return { date: null, timed: false };
    var t = parseTime(timeVal);
    if (t) return { date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m), timed: true };
    return { date: d, timed: hasClockTime(d) };
  }

  function truthy(v) {
    if (v === true) return true;
    var s = norm(v);
    return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'x';
  }

  function cell(row, idx) { return idx >= 0 && idx < row.length ? row[idx] : ''; }

  function dateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var r = new Date(d.getTime()); r.setDate(r.getDate() + n); return r; }

  /**
   * Build the event a row describes. Returns {skip: reason} or the desired event.
   * opts.defaultMinutes: duration when no end is given (default 60).
   */
  function buildDesired(row, map, opts) {
    opts = opts || {};
    var title = String(cell(row, map.title) || '').trim();
    var startRaw = cell(row, map.start);
    if (!title && isBlank(startRaw)) return { skip: 'empty row' };
    if (!title) return { skip: 'no title' };
    if (isBlank(startRaw)) return { skip: 'no start date' };
    var s = combine(startRaw, cell(row, map.startTime));
    if (!s.date) return { skip: 'unreadable start date' };
    var endRaw = cell(row, map.end), endTimeRaw = cell(row, map.endTime);
    if (isBlank(endRaw) && !isBlank(endTimeRaw)) endRaw = s.date; // "Date, Start time, End time" layouts
    var e = isBlank(endRaw) ? { date: null, timed: false } : combine(endRaw, endTimeRaw);
    if (!isBlank(endRaw) && !e.date) return { skip: 'unreadable end date' };
    var allDay = map.allDay >= 0 ? truthy(cell(row, map.allDay)) : !(s.timed || e.timed);
    var start, end;
    if (allDay) {
      start = dateOnly(s.date);
      end = addDays(e.date ? dateOnly(e.date) : start, 1); // API end is exclusive
      if (end <= start) return { skip: 'end before start' };
    } else {
      start = s.date;
      if (e.date) {
        end = e.timed ? e.date : new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate(), start.getHours(), start.getMinutes());
      } else {
        end = new Date(start.getTime() + (opts.defaultMinutes || 60) * 60000);
      }
      if (end <= start) return { skip: 'end before start' };
    }
    return {
      summary: title,
      description: String(cell(row, map.description) || ''),
      location: String(cell(row, map.location) || ''),
      allDay: allDay,
      start: start,
      end: end
    };
  }

  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function desiredHash(d) {
    return hash([d.summary, d.description, d.location, d.allDay ? 1 : 0, d.start.getTime(), d.end.getTime()].join('\u0001'));
  }

  function parseIdCell(v) {
    var s = String(v || '').trim();
    if (!s) return { eventId: '', hash: '' };
    var i = s.indexOf('|');
    return i < 0 ? { eventId: s, hash: '' } : { eventId: s.slice(0, i), hash: s.slice(i + 1) };
  }
  function formatIdCell(eventId, h) { return eventId ? eventId + '|' + h : ''; }

  /**
   * Plan a sync. rows exclude the header. knownIds: event ids this sheet created before.
   * Returns items (one per row) plus deletes for known events whose rows are gone.
   */
  function plan(rows, map, opts, knownIds) {
    var items = [], seen = {}, counts = { create: 0, update: 0, unchanged: 0, skip: 0, delete: 0 };
    rows.forEach(function (row, i) {
      var idc = parseIdCell(cell(row, map.id));
      var d = buildDesired(row, map, opts);
      var item = { row: i + 2, eventId: idc.eventId };
      if (d.skip) {
        item.action = 'skip'; item.reason = d.skip;
      } else {
        var h = desiredHash(d);
        item.desired = d; item.hash = h;
        if (!idc.eventId) item.action = 'create';
        else if (idc.hash === h) item.action = 'unchanged';
        else item.action = 'update';
      }
      if (idc.eventId) seen[idc.eventId] = true;
      counts[item.action]++;
      items.push(item);
    });
    var deletes = [];
    if (opts && opts.deleteRemoved) {
      (knownIds || []).forEach(function (id) { if (!seen[id]) deletes.push(id); });
    }
    counts.delete = deletes.length;
    counts.changes = counts.create + counts.update + counts.delete;
    return { items: items, deletes: deletes, counts: counts };
  }

  function monthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }

  return {
    ID_HEADER: ID_HEADER, FIELDS: FIELDS, autoMap: autoMap, buildDesired: buildDesired, plan: plan,
    parseIdCell: parseIdCell, formatIdCell: formatIdCell, desiredHash: desiredHash, monthKey: monthKey,
    parseTime: parseTime, parseDateish: parseDateish
  };
})();
if (typeof module !== 'undefined') module.exports = ROWCAL;
