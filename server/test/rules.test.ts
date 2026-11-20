import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  manilaDate, manilaTime, countedMs, effectiveEnd, canTimeIn, canStartOvertime, overtimeOpen,
  summarizeDay, weekStart, isWorkday,
} from '../src/time/rules.ts';

// 2026-11-20 is a Friday; 2026-11-21 a Saturday.
const FRI = '2026-11-20';
const SAT = '2026-11-21';
const H = 3_600_000;
const at = (date: string, h: number, m = 0) => manilaTime(date, h, m);

test('Manila date boundaries use UTC+8', () => {
  assert.equal(manilaDate(new Date('2026-11-19T16:00:00Z')), FRI); // 00:00 Manila Friday
  assert.equal(manilaDate(new Date('2026-11-19T15:59:59Z')), '2026-11-19');
  assert.equal(isWorkday(FRI), true);
  assert.equal(isWorkday(SAT), false);
  assert.equal(weekStart(FRI), '2026-11-16');
  assert.equal(weekStart('2026-11-22'), '2026-11-16'); // Sunday belongs to the week starting Monday
});

test('a full 8:00-17:00 day counts exactly 8 hours (lunch excluded)', () => {
  const ms = countedMs({ kind: 'regular', startAt: at(FRI, 8), endAt: at(FRI, 17) }, at(FRI, 23));
  assert.equal(ms, 8 * H);
});

test('timing in before 8:00 counts from 8:00', () => {
  const ms = countedMs({ kind: 'regular', startAt: at(FRI, 6, 30), endAt: at(FRI, 10) }, at(FRI, 23));
  assert.equal(ms, 2 * H);
});

test('a forgotten regular bar auto-ends at 17:00', () => {
  const entry = { kind: 'regular' as const, startAt: at(FRI, 9), endAt: null };
  assert.equal(effectiveEnd(entry, at(FRI, 22)).getTime(), at(FRI, 17).getTime());
  assert.equal(countedMs(entry, at(FRI, 22)), 7 * H); // 9-12 + 13-17
});

test('an open bar counts up to now while still inside the day', () => {
  const ms = countedMs({ kind: 'regular', startAt: at(FRI, 8), endAt: null }, at(FRI, 12, 30));
  assert.equal(ms, 4 * H); // lunch half-hour not counted
});

test('overtime only counts 17:00 to midnight on weekdays and auto-ends at midnight', () => {
  const entry = { kind: 'overtime' as const, startAt: at(FRI, 17, 30), endAt: null };
  assert.equal(countedMs(entry, at(SAT, 9)), 6.5 * H);
  const s = summarizeDay(FRI, [entry], null, at(SAT, 9));
  assert.deepEqual(s.flags, ['overtime-no-time-out']);
});

test('overtime closed automatically at midnight keeps its no-time-out flag', () => {
  const closed = { kind: 'overtime' as const, startAt: at(FRI, 18), endAt: at(FRI, 24), endedBy: 'auto' };
  assert.deepEqual(summarizeDay(FRI, [closed], null, at(SAT, 9)).flags, ['overtime-no-time-out']);
  const timedOut = { kind: 'overtime' as const, startAt: at(FRI, 18), endAt: at(FRI, 20), endedBy: 'member' };
  assert.deepEqual(summarizeDay(FRI, [timedOut], null, at(SAT, 9)).flags, []);
});

test('multiple bars in a day are summed', () => {
  const entries = [
    { kind: 'regular' as const, startAt: at(FRI, 8), endAt: at(FRI, 11) },
    { kind: 'regular' as const, startAt: at(FRI, 13), endAt: null },
  ];
  const s = summarizeDay(FRI, entries, null, at(FRI, 20));
  assert.equal(s.regularMs, 7 * H); // 3h + 4h (auto-ended at 17:00)
  assert.equal(s.overtimeMs, 0);
});

test('time in is refused after 17:00, on weekends, with a status, or when already in', () => {
  assert.equal(canTimeIn(at(FRI, 7), { hasOpenBar: false, status: null }).ok, true);
  assert.equal(canTimeIn(at(FRI, 17), { hasOpenBar: false, status: null }).ok, false);
  assert.equal(canTimeIn(at(SAT, 10), { hasOpenBar: false, status: null }).ok, false);
  assert.equal(canTimeIn(at(FRI, 9), { hasOpenBar: false, status: 'sick' }).ok, false);
  assert.equal(canTimeIn(at(FRI, 9), { hasOpenBar: true, status: null }).ok, false);
});

test('overtime is locked before 17:00 on weekdays and open on weekends', () => {
  assert.equal(overtimeOpen(at(FRI, 16, 59)), false);
  assert.equal(overtimeOpen(at(FRI, 17)), true);
  assert.equal(overtimeOpen(at(SAT, 10)), true);
  assert.equal(canStartOvertime(at(FRI, 16), { hasOpenBar: false, status: null }).ok, false);
  assert.equal(canStartOvertime(at(FRI, 18), { hasOpenBar: false, status: null }).ok, true);
  const satOt = countedMs({ kind: 'overtime', startAt: at(SAT, 10), endAt: at(SAT, 14) }, at(SAT, 23));
  assert.equal(satOt, 4 * H);
});
