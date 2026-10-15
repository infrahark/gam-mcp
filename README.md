# gam-mcp

MCP server for Google Ad Manager. Pull line item delivery, order revenue, ad unit performance, and inventory forecasts directly in Claude.

## Installation

Add to your `claude_desktop_config.json` (Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gam": {
      "command": "npx",
      "args": ["gam-mcp", "--network-code", "YOUR_NETWORK_CODE"]
    }
  }
}
```

Replace `YOUR_NETWORK_CODE` with your GAM network code (visible in the URL when logged into Ad Manager: `admanager.google.com/12345678/`).

## First-time authentication

On first use, a browser window will open asking you to authorize access to your Google Ad Manager account. Click **Allow**. Your token is saved locally at `~/.gam-mcp/tokens.json` and auto-refreshes.

> **Note:** You may see an "unverified app" warning from Google during the beta period. Click **Advanced → Go to gam-mcp** to proceed.

## Re-authenticate

```bash
npx gam-mcp --network-code YOUR_NETWORK_CODE --setup
```

## Use your own Google Cloud credentials

If you prefer to use your own GCP OAuth app:

1. Create a project at https://console.cloud.google.com
2. Enable the **Google Ad Manager API**
3. Create an OAuth 2.0 client ID (type: **Desktop app**)
4. Download the credentials JSON

Then add `--credentials-file` to your config:

```json
"args": ["gam-mcp", "--network-code", "12345", "--credentials-file", "/Users/you/credentials.json"]
```

## Available tools

| Tool | What it returns |
|------|----------------|
| `get_line_item_delivery` | Impressions, clicks, CTR, delivery % vs goal per line item |
| `get_order_revenue` | Revenue, impressions, CPM per order/advertiser |
| `get_ad_unit_performance` | Impressions, fill rate, revenue, RPM per ad unit |
| `get_forecast` | Available, matched, possible impressions for a line item or ad unit |

All tools accept ISO dates or natural language ("last 7 days", "this month", "today").

## Example prompts

- "Show me line item delivery for this month"
- "Which advertiser had the highest revenue last week?"
- "What's the fill rate on the homepage leaderboard?"
- "How much inventory is available for line item 12345 in November?"

## License

MIT
