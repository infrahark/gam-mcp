#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { parseArgs } from 'node:util';
import { getAuthClient } from './auth.js';
import { getLineItemDelivery, getOrderRevenue, getAdUnitPerformance } from './reports.js';
import { getForecast } from './forecast.js';

const { values: cliArgs } = parseArgs({
  options: {
    'network-code': { type: 'string' },
    'credentials-file': { type: 'string' },
    setup: { type: 'boolean', default: false },
  },
  strict: false,
});

if (!cliArgs['network-code']) {
  console.error('Error: --network-code is required\nUsage: npx gam-mcp --network-code YOUR_NETWORK_CODE');
  process.exit(1);
}

const networkCode = cliArgs['network-code'];
const authClient = await getAuthClient({
  credentialsFile: cliArgs['credentials-file'],
  setup: cliArgs.setup,
});

const server = new Server(
  { name: 'gam-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: 'get_line_item_delivery',
    description: 'Reports delivery progress for Google Ad Manager line items. Returns impressions, clicks, CTR, delivery % vs goal, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date — ISO (2026-10-01) or natural language (7 days ago)' },
        end_date: { type: 'string', description: 'End date — ISO (2026-10-14) or natural language (today)' },
        order_id: { type: 'string', description: 'Optional: filter to one order ID' },
        line_item_id: { type: 'string', description: 'Optional: filter to one line item ID' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_order_revenue',
    description: 'Returns revenue, impressions, and CPM by order and advertiser for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date — ISO or natural language' },
        end_date: { type: 'string', description: 'End date — ISO or natural language' },
        advertiser_name: { type: 'string', description: 'Optional: filter to one advertiser name' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_ad_unit_performance',
    description: 'Returns impressions, fill rate, revenue, and RPM per ad unit (placement) for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date — ISO or natural language' },
        end_date: { type: 'string', description: 'End date — ISO or natural language' },
        ad_unit_id: { type: 'string', description: 'Optional: filter to one ad unit ID' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_forecast',
    description: 'Returns inventory availability forecast (matched, available, possible impressions) for a line item or ad unit.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Forecast start date — ISO or natural language' },
        end_date: { type: 'string', description: 'Forecast end date — ISO or natural language' },
        line_item_id: { type: 'string', description: 'Line item ID to forecast (provide this OR ad_unit_id)' },
        ad_unit_id: { type: 'string', description: 'Ad unit ID to forecast (provide this OR line_item_id)' },
      },
      required: ['start_date', 'end_date'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case 'get_line_item_delivery':
        result = await getLineItemDelivery(networkCode, args, authClient);
        break;
      case 'get_order_revenue':
        result = await getOrderRevenue(networkCode, args, authClient);
        break;
      case 'get_ad_unit_performance':
        result = await getAdUnitPerformance(networkCode, args, authClient);
        break;
      case 'get_forecast':
        result = await getForecast(networkCode, args, authClient);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
