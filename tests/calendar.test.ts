import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  calendarDate,
  calendarAddDays,
  calendarAddMonths,
  calendarClamp,
  calendarGrid,
  calendarIso,
  calendarLabel,
  validLocalDateTime,
} from '../src/lib/calendar';

test('calendar validates actual dates including leap years and the full supported year range', () => {
  for (const date of ['2024-02-29', '2000-02-29', '0001-01-01', '0099-12-31', '9999-12-31'])
    assert.equal(calendarIso(calendarDate(date)!), date);
  for (const date of [
    '',
    '2026-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-00-01',
    '2026-13-01',
    '0000-01-01',
    '10000-01-01',
    '2026-1-01',
    '2026-01-01T00:00:00Z',
  ])
    assert.equal(calendarDate(date), null);
});
test('calendar moves across months, leap days, year boundaries and bounds without rolling dates forward', () => {
  assert.equal(calendarAddMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(calendarAddMonths('2024-02-29', 12), '2025-02-28');
  assert.equal(calendarAddMonths('2026-01-31', -1), '2025-12-31');
  assert.equal(calendarAddDays('2024-02-28', 2), '2024-03-01');
  assert.equal(calendarAddDays('2026-12-31', 1), '2027-01-01');
  assert.equal(calendarAddDays('9999-12-31', 1), '');
  assert.equal(calendarAddDays('0001-01-01', -1), '');
  assert.equal(calendarClamp('2025-01-01', '2026-01-01', '2026-12-31'), '2026-01-01');
  assert.equal(calendarClamp('2027-01-01', '2026-01-01', '2026-12-31'), '2026-12-31');
});
test('calendar grids start on Monday and include adjacent days and leap dates', () => {
  const grid = calendarGrid('2024-02');
  assert.equal(grid.length, 42);
  assert.equal(grid[0], '2024-01-29');
  assert.equal(grid[41], '2024-03-10');
  assert.ok(grid.includes('2024-02-29'));
  assert.equal(calendarGrid('bad').length, 0);
  assert.equal(calendarGrid('9999-12').at(-1), '');
  assert.equal(calendarLabel('2024-02-29'), 'Feb 29, 2024');
});
test('scheduled local times reject malformed values and daylight-saving gaps', () => {
  assert.equal(validLocalDateTime('2026-09-29T09:45'), true);
  for (const value of [
    '2026-02-30T09:00',
    '2026-09-29T24:00',
    '2026-09-29T09:60',
    '2026-09-29',
    '',
  ])
    assert.equal(validLocalDateTime(value), false);
  const script = `import {validLocalDateTime, calendarLabel, calendarAddDays} from './src/lib/calendar.ts';
    console.log(JSON.stringify([validLocalDateTime('2026-03-08T02:30'), validLocalDateTime('2026-03-08T03:30'), calendarLabel('2026-03-08'), calendarAddDays('2026-03-08', 1)]));`;
  assert.deepEqual(
    JSON.parse(
      execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
        env: { ...process.env, TZ: 'America/New_York' },
        encoding: 'utf8',
      }),
    ),
    [false, true, 'Mar 8, 2026', '2026-03-09'],
  );
});
