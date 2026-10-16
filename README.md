# gam-mcp

MCP server for Google Ad Manager. Pull line item delivery, order revenue, ad unit performance, and inventory forecasts directly in Claude.

## Installation

Add to your `claude_desktop_config.json` (Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gam": {
      "command": "npx",
      "args": ["gam-mcp"]
    }
  }
}
```

Then run the one-time auth setup:

```bash
npx gam-mcp --setup
```

A browser window will open. Sign in with the Google account that has access to your GAM network, click **Allow**, and you're done. Your token and network code are saved locally and auto-refresh.

## Authentication setup

gam-mcp includes a bundled OAuth client — no GCP project required. On first run it opens a browser for Google sign-in. Your token is saved at `~/.gam-mcp/tokens.json`.

Your GAM network code is detected automatically. If your account has multiple networks, you'll be prompted to pass `--network-code`.

**Using your own GCP credentials** (optional): Download your OAuth credentials JSON and add `--credentials-file /path/to/credentials.json` to both the config args and the setup command.

## Re-authenticate

```bash
npx gam-mcp --setup
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
