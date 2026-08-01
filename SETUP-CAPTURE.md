# Product Capture Setup

Mobile label scanner for staff: **https://prince-george-transport.pages.dev/capture.html**

## What it does

1. Boss logs in with the same **admin PIN** (`7429`)
2. Takes a photo of a product label
3. AI identifies the product, category, description, and suggested price
4. Boss reviews and taps **Approve & Queue for eBay**
5. Item goes live on the supplies page and queues for automated eBay publish

## Enable AI (pick one)

### Option A — Cursor API key (uses your existing Cursor account)

```powershell
npx wrangler pages secret put CURSOR_API_KEY --project-name=prince-george-transport
```

Get your key from **Cursor Dashboard → Settings → API Keys**.

The capture app sends label photos to the Cursor Cloud Agents API (supports images). Analysis usually takes 10–30 seconds per photo.

### Option B — OpenAI (fastest, ~2–5 seconds)

```powershell
npx wrangler pages secret put OPENAI_API_KEY --project-name=prince-george-transport
```

If both keys are set, OpenAI is tried first, then Cursor, then Cloudflare Workers AI.

Without any key, Cloudflare Workers AI (Llava) is used as fallback.

## Optional: Cursor CLI re-processing

For higher accuracy on difficult labels, re-run analysis locally:

```powershell
npm install -D @cursor/sdk
$env:CURSOR_API_KEY = "your-key"
$env:ADMIN_PIN = "7429"
node scripts/process-capture-cursor.mjs
```

## Flow

```
Photo → /api/admin/capture → AI analysis → Review → Approve
  → Inventory (ebayQueued: true) → Monday automation → eBay listing
```

## PIN

Same as admin: set via `ADMIN_PIN` Cloudflare secret (default dev: `7429`).

Change it:

```powershell
npx wrangler pages secret put ADMIN_PIN --project-name=prince-george-transport
```

Share the new PIN with your boss only.
