import * as chrono from 'chrono-node';

export function parseDate(expr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(expr)) return expr;
  const result = chrono.parseDate(expr);
  if (!result) throw new Error(`Could not parse date: "${expr}"`);
  return result.toISOString().split('T')[0];
}

export function toGamDate(isoStr) {
  const [year, month, day] = isoStr.split('-').map(Number);
  return { year, month, day };
}

export function validateDateRange(startIso, endIso) {
  if (startIso > endIso) {
    throw new Error(`start_date must be before end_date (got ${startIso} > ${endIso})`);
  }
}
