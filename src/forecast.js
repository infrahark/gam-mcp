import axios from 'axios';
import { getAccessToken } from './auth.js';
import { parseDate, toGamDate, validateDateRange } from './dates.js';

const GAM_BASE = 'https://admanager.googleapis.com/v1';

export async function getForecast(networkCode, args, authClient) {
  if (!args.line_item_id && !args.ad_unit_id) {
    throw new Error('get_forecast requires line_item_id or ad_unit_id');
  }

  const start = parseDate(args.start_date);
  const end = parseDate(args.end_date);
  validateDateRange(start, end);

  const token = await getAccessToken(authClient);

  const forecastOptions = {
    startDate: toGamDate(start),
    endDate: toGamDate(end),
  };

  if (args.line_item_id) {
    const response = await axios({
      method: 'POST',
      url: `${GAM_BASE}/networks/${networkCode}/lineItems/${args.line_item_id}/availabilityForecast`,
      headers: { Authorization: `Bearer ${token}` },
      data: { forecastOptions },
    });

    const data = response.data;
    return {
      lineItemId: args.line_item_id,
      startDate: start,
      endDate: end,
      matched: data.matched,
      available: data.available,
      possible: data.possible,
    };
  }

  // ad_unit_id path — verify endpoint with GAM v1 REST docs if this 404s
  const response = await axios({
    method: 'POST',
    url: `${GAM_BASE}/networks/${networkCode}/adUnits/${args.ad_unit_id}/availabilityForecast`,
    headers: { Authorization: `Bearer ${token}` },
    data: { forecastOptions },
  });

  const data = response.data;
  return {
    adUnitId: args.ad_unit_id,
    startDate: start,
    endDate: end,
    matched: data.matched,
    available: data.available,
    possible: data.possible,
  };
}
