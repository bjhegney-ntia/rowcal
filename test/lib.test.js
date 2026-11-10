const assert = require('assert');
const R = require('../src/Lib.js');

const headers = ['Title', 'Date', 'Start time', 'End time', 'Where', 'Notes', 'Minutehand ID'];
const map = R.autoMap(headers);
assert.deepStrictEqual([map.title, map.start, map.startTime, map.endTime, map.location, map.description, map.id], [0, 1, 2, 3, 4, 5, 6]);
assert.strictEqual(map.end, -1);

// timed event from date + time strings
let d = R.buildDesired(['Dentist', '2026-11-12', '9:30 AM', '10:15', 'Main St', 'bring card', ''], map, {});
assert.strictEqual(d.allDay, false);
assert.strictEqual(d.start.getHours(), 9); assert.strictEqual(d.start.getMinutes(), 30);
assert.strictEqual(d.end.getHours(), 10); assert.strictEqual(d.end.getMinutes(), 15);

// Date objects as Sheets returns them (formula dates included); time-only cell is 1899-12-30
const day = new Date(2026, 10, 12), t = new Date(1899, 11, 30, 14, 0);
d = R.buildDesired(['Call', day, t, '', '', '', ''], map, { defaultMinutes: 45 });
assert.strictEqual(d.start.getHours(), 14);
assert.strictEqual(d.end.getTime() - d.start.getTime(), 45 * 60000);

// no time anywhere -> all day, exclusive end
d = R.buildDesired(['Holiday', day, '', '', '', '', ''], map, {});
assert.strictEqual(d.allDay, true);
assert.strictEqual(d.end.getDate(), 13);

// skips
assert.strictEqual(R.buildDesired(['', '', '', '', '', '', ''], map, {}).skip, 'empty row');
assert.strictEqual(R.buildDesired(['X', '', '', '', '', '', ''], map, {}).skip, 'no start date');
assert.strictEqual(R.buildDesired(['X', 'someday', '', '', '', '', ''], map, {}).skip, 'unreadable start date');
assert.strictEqual(R.buildDesired(['X', '2026-11-12', '10:00', '9:00', '', '', ''], map, {}).skip, 'end before start');

// plan: create, unchanged, update, delete removed
const rowA = ['A', '2026-11-12', '9:00', '', '', '', ''];
const hA = R.desiredHash(R.buildDesired(rowA, map, {}));
const rows = [
  rowA,
  ['B', '2026-11-13', '9:00', '', '', '', R.formatIdCell('evB', R.desiredHash(R.buildDesired(['B', '2026-11-13', '9:00', '', '', '', ''], map, {})))],
  ['C changed', '2026-11-14', '9:00', '', '', '', 'evC|oldhash'],
  ['', '', '', '', '', '', '']
];
const p = R.plan(rows, map, { deleteRemoved: true }, ['evB', 'evC', 'evGone']);
assert.deepStrictEqual(p.items.map(i => i.action), ['create', 'unchanged', 'update', 'skip']);
assert.deepStrictEqual(p.deletes, ['evGone']);
assert.deepStrictEqual(p.counts, { create: 1, update: 1, unchanged: 1, skip: 1, delete: 1, changes: 3 });
assert.strictEqual(p.items[0].hash, hA);

// deleteRemoved off -> no deletes
assert.deepStrictEqual(R.plan(rows, map, {}, ['evGone']).deletes, []);

// id cell round trip
assert.deepStrictEqual(R.parseIdCell('abc|h1'), { eventId: 'abc', hash: 'h1' });
assert.deepStrictEqual(R.parseIdCell(''), { eventId: '', hash: '' });

// times
assert.deepStrictEqual(R.parseTime('12:00 am'), { h: 0, m: 0 });
assert.deepStrictEqual(R.parseTime('12 pm'), { h: 12, m: 0 });
assert.strictEqual(R.parseTime('25:00'), null);

console.log('lib tests passed');
