import axios from 'axios';
import { getAccessToken } from './auth.js';
import { parseDate, toGamDate, validateDateRange } from './dates.js';

const GAM_BASE = 'https://admanager.googleapis.com/v1';
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60;

let sleepFn = (ms) => new Promise((r) => setTimeout(r, ms));
let maxPolls = MAX_POLLS;
export const _forTests = {
  setSleep: (fn) => { sleepFn = fn; },
  setMaxPolls: (n) => { maxPolls = n; },
};

async function gamRequest(method, path, data, authClient) {
  const token = await getAccessToken(authClient);
  const response = await axios({
    method,
    url: `${GAM_BASE}${path}`,
    headers: { Authorization: `Bearer ${token}` },
    data,
    timeout: 30000,
  });
  return response.data;
}

function parseCsvRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseReportCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map((h) => h.trim());
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = parseCsvRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? '']));
  });
}

async function runReport(networkCode, reportDefinition, authClient) {
  const created = await gamRequest('POST', `/networks/${networkCode}/reports`, { reportDefinition }, authClient);
  const reportName = created.name;
  const reportId = reportName.split('/').pop();

  await gamRequest('POST', `/networks/${networkCode}/reports/${reportId}:run`, {}, authClient);

  for (let i = 0; i < maxPolls; i++) {
    await sleepFn(POLL_INTERVAL_MS);
    const status = await gamRequest('GET', `/networks/${networkCode}/reports/${reportId}`, {}, authClient);
    const op = status.reportOperation;

    if (op?.reportStatus === 'DONE') {
      const csv = await axios({ method: 'GET', url: op.reportDataUri });
      return parseReportCsv(csv.data);
    }

    if (op?.reportStatus === 'FAILED') {
      throw new Error(`GAM report failed: ${reportName}`);
    }
  }

  throw new Error(`GAM report ${reportName} timed out after ${(MAX_POLLS * POLL_INTERVAL_MS) / 60000} minutes`);
}

export async function getLineItemDelivery(networkCode, args, authClient) {
  const start = parseDate(args.start_date);
  const end = parseDate(args.end_date);
  validateDateRange(start, end);

  const filters = [];
  if (args.order_id) filters.push({ fieldName: 'ORDER_ID', operator: 'EQUALS', values: [args.order_id] });
  if (args.line_item_id) filters.push({ fieldName: 'LINE_ITEM_ID', operator: 'EQUALS', values: [args.line_item_id] });

  const rows = await runReport(networkCode, {
    dimensions: ['LINE_ITEM_NAME', 'LINE_ITEM_ID', 'ORDER_NAME', 'LINE_ITEM_STATUS'],
    metrics: [
      'TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS',
      'TOTAL_LINE_ITEM_LEVEL_CLICKS',
      'TOTAL_LINE_ITEM_LEVEL_CTR',
      'LINE_ITEM_DELIVERY_INDICATOR',
    ],
    dateRange: { startDate: toGamDate(start), endDate: toGamDate(end) },
    filters,
  }, authClient);

  return rows.map((r) => ({
    lineItemName: r['LINE_ITEM_NAME'],
    lineItemId: r['LINE_ITEM_ID'],
    orderName: r['ORDER_NAME'],
    status: r['LINE_ITEM_STATUS'],
    impressions: Number(r['TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS']),
    clicks: Number(r['TOTAL_LINE_ITEM_LEVEL_CLICKS']),
    ctr: Number(r['TOTAL_LINE_ITEM_LEVEL_CTR']),
    deliveryPercent: Number(r['LINE_ITEM_DELIVERY_INDICATOR']),
  }));
}

export async function getOrderRevenue(networkCode, args, authClient) {
  const start = parseDate(args.start_date);
  const end = parseDate(args.end_date);
  validateDateRange(start, end);

  const filters = [];
  if (args.advertiser_name) filters.push({ fieldName: 'ADVERTISER_NAME', operator: 'EQUALS', values: [args.advertiser_name] });

  const rows = await runReport(networkCode, {
    dimensions: ['ORDER_NAME', 'ORDER_ID', 'ADVERTISER_NAME'],
    metrics: [
      'TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS',
      'TOTAL_LINE_ITEM_LEVEL_ALL_REVENUE',
      'LINE_ITEM_AVERAGE_COST_PER_UNIT',
    ],
    dateRange: { startDate: toGamDate(start), endDate: toGamDate(end) },
    filters,
  }, authClient);

  return rows.map((r) => ({
    advertiserName: r['ADVERTISER_NAME'],
    orderName: r['ORDER_NAME'],
    orderId: r['ORDER_ID'],
    impressions: Number(r['TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS']),
    revenue: Number(r['TOTAL_LINE_ITEM_LEVEL_ALL_REVENUE']),
    cpm: Number(r['LINE_ITEM_AVERAGE_COST_PER_UNIT']),
  }));
}

export async function getAdUnitPerformance(networkCode, args, authClient) {
  const start = parseDate(args.start_date);
  const end = parseDate(args.end_date);
  validateDateRange(start, end);

  const filters = [];
  if (args.ad_unit_id) filters.push({ fieldName: 'AD_UNIT_ID', operator: 'EQUALS', values: [args.ad_unit_id] });

  const rows = await runReport(networkCode, {
    dimensions: ['AD_UNIT_NAME', 'AD_UNIT_ID'],
    metrics: [
      'TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS',
      'TOTAL_LINE_ITEM_LEVEL_FILL_RATE',
      'TOTAL_LINE_ITEM_LEVEL_ALL_REVENUE',
      'AD_UNIT_REVENUE_PER_THOUSAND_IMPRESSIONS',
    ],
    dateRange: { startDate: toGamDate(start), endDate: toGamDate(end) },
    filters,
  }, authClient);

  return rows.map((r) => ({
    adUnitName: r['AD_UNIT_NAME'],
    adUnitId: r['AD_UNIT_ID'],
    impressions: Number(r['TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS']),
    fillRate: Number(r['TOTAL_LINE_ITEM_LEVEL_FILL_RATE']),
    revenue: Number(r['TOTAL_LINE_ITEM_LEVEL_ALL_REVENUE']),
    rpm: Number(r['AD_UNIT_REVENUE_PER_THOUSAND_IMPRESSIONS']),
  }));
}
