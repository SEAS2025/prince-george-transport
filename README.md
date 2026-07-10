# Prince George Transport

Static marketing site for **Prince George Transport** — non-emergency medical transport in Blythewood, SC, plus used ambulance supplies and two-way radios for sale.

Built on the same Cloudflare Pages scaffolding as [pilotrules](https://github.com/SEAS2025/pilotrules).

**Live (after deploy):** `https://prince-george-transport.pages.dev`

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing — transport services, about, contact |
| `/supplies.html` | Used EMS equipment & radio inventory (loaded from KV) |
| `/admin.html` | PIN-protected inventory manager |

## Admin inventory

1. Go to `/admin.html`
2. Enter your **Admin PIN**
3. Add, edit, or delete listings — changes go live on `/supplies.html` immediately

Set the PIN in production:

```bash
npx wrangler pages secret put ADMIN_PIN --project-name=prince-george-transport
```

## eBay listings

See **[SETUP-EBAY.md](SETUP-EBAY.md)** for full setup. In Admin → Marketing:

1. Set `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_RUNAME` as Cloudflare secrets
2. Connect your eBay seller account
3. Publish inventory items to eBay (requires price + Business Policies in Seller Hub)

## Marketing (Facebook + EMT schools)

In **Admin → Marketing** tab (PIN required):

- **Facebook Marketplace CSV** — download bulk lister file for Chrome extensions (AutoList, TheLazyPoster). Meta does not offer a public bulk-posting API; these tools fill the listing form for you. Post slowly (10–15/hr).
- **Copy listing text** — paste manually into Facebook Marketplace
- **EMT school leads** — SC training programs with public phone/email + one-click outreach email templates

## GitHub

Repository: https://github.com/SEAS2025/prince-george-transport

Auto-deploy on push to `main` requires GitHub secrets:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:8788

## Deploy

```bash
npm run deploy
```

Or push to `main` — GitHub Actions deploys via `.github/workflows/deploy.yml`.

Requires GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Email inquiries (optional)

Set Cloudflare Pages secrets:

```bash
wrangler pages secret put RESEND_API_KEY --project-name=prince-george-transport
wrangler pages secret put OWNER_EMAIL --project-name=prince-george-transport
```

Without Resend configured, the contact form still accepts submissions but won't send email — users can call **(803) 231-9420**.

## Business info

- **Address:** 200 Louthian Way, Blythewood, SC 29016
- **Phone:** (803) 231-9420
- **Yelp:** https://www.yelp.com/biz/prince-george-transport-blythewood
- **NPI:** 1922468909 · **License:** SC E3044851

## Logo

`public/img/logo.svg` is a placeholder EMS Star-of-Life mark. Replace with the official company logo when available (no public logo was found on Google/Yelp/LinkedIn).
