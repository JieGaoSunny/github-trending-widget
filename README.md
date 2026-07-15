# GitHub Trending Widget 📊

An iOS home screen widget that displays today's GitHub Trending repositories — built with [Scriptable](https://scriptable.app) and powered by a Cloudflare Worker backend.

<p align="center">
  <img src="hero.png" width="360" alt="GitHub Trending Widget on iPhone">
</p>

## Features

- 🏆 Top 12 trending repos, 6 per page with hourly rotation
- 🥇🥈🥉 Medal ranks for top 3
- ★ Today's star count with heat-based coloring (🔥 orange → 🌟 gold → gray)
- 🇨🇳 One-line Chinese summary via Cloudflare Workers AI (Llama 3.3 70B)
- ☆ Total stars + original English description
- Tap widget to jump to github.com/trending
- Auto-refreshes every hour, data cached 4h on edge

## Architecture

```
iOS Widget (Scriptable)
    ↓ fetch JSON
Cloudflare Worker
    ├── Scrapes GitHub Trending page
    ├── Generates Chinese summaries (Workers AI)
    └── Caches in KV (4h TTL)
```

## Quick Start

### 1. Deploy the Worker

```bash
cd worker/
# Create KV namespace
npx wrangler kv namespace create TRENDING_CACHE
# Update wrangler.toml with your KV namespace ID
npx wrangler deploy
```

### 2. Install the Widget

1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) on your iPhone
2. Create a new script, paste the contents of `scriptable/GitHub Trending.js`
3. Update `ENDPOINT` to your Worker URL
4. Run ▶️ to test
5. Add a **Large** Scriptable widget to your home screen → select the script

## Project Structure

```
├── scriptable/
│   └── GitHub Trending.js    # iOS Scriptable widget
├── worker/
│   ├── index.js              # Cloudflare Worker (scraper + AI summary)
│   └── wrangler.toml         # Worker config template
├── preview.png               # Screenshot
└── README.md
```

## Requirements

- iPhone with [Scriptable](https://scriptable.app) installed
- Cloudflare account (free tier works)
- Workers AI enabled (free daily quota is sufficient)

## How It Works

1. **Cloudflare Worker** scrapes GitHub's trending page every 4 hours
2. **Workers AI** generates a concise Chinese summary for each repo
3. Results are cached in **Cloudflare KV**
4. **Scriptable widget** fetches the JSON and renders a native iOS widget
5. Widget rotates between page 1 (repos 1–6) and page 2 (repos 7–12) every hour

## License

MIT
