import { parseDate, toGamDate, validateDateRange } from '../src/dates.js';

describe('parseDate', () => {
  it('passes through ISO dates unchanged', () => {
    expect(parseDate('2026-10-01')).toBe('2026-10-01');
  });

  it('parses "today" to current date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(parseDate('today')).toBe(today);
  });

  it('parses "7 days ago" to a date 7 days before today', () => {
    const expected = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    expect(parseDate('7 days ago')).toBe(expected);
  });

  it('throws on unparseable input', () => {
    expect(() => parseDate('not a date')).toThrow('Could not parse date');
  });
});

describe('toGamDate', () => {
  it('converts YYYY-MM-DD to GAM date object', () => {
    expect(toGamDate('2026-10-15')).toEqual({ year: 2026, month: 10, day: 15 });
  });
});

describe('validateDateRange', () => {
  it('throws when start is after end', () => {
    expect(() => validateDateRange('2026-10-15', '2026-10-01'))
      .toThrow('start_date must be before end_date');
  });

  it('passes when start equals end', () => {
    expect(() => validateDateRange('2026-10-01', '2026-10-01')).not.toThrow();
  });
});
