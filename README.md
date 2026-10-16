# gam-report-mcp

MCP server for Google Ad Manager. Pull line item delivery, order revenue, ad unit performance, and inventory forecasts directly in Claude.

## Quick start

**Step 1 — Authenticate (run once in Terminal):**

```bash
npx gam-report-mcp --setup
```

A browser window opens. Sign in with the Google account that has access to your GAM network and click Allow. Your token and network code are saved locally and auto-refresh.

**Step 2 — Add to Claude:**

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (create it if it doesn't exist):

```json
{
  "mcpServers": {
    "gam-report": {
      "command": "npx",
      "args": ["gam-report-mcp"]
    }
  }
}
```

Restart Claude Desktop. GAM tools will appear automatically.

### Claude Code (CLI)

```bash
claude mcp add gam-report -- npx gam-report-mcp
```

Then restart Claude Code.

## Authentication

gam-report-mcp includes a bundled OAuth client — no GCP project required. Your token is saved at `~/.gam-mcp/tokens.json` and refreshes automatically.

Your GAM network code is detected automatically on first run. If your account has multiple networks you'll be prompted to pass `--network-code`.

**Using your own GCP credentials** (optional): add `--credentials-file /path/to/credentials.json` to both the setup command and the config args.

## Re-authenticate

```bash
npx gam-report-mcp --setup
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
