# eBay API Setup — Prince George Transport

List surplus EMS equipment on eBay directly from **Admin → Marketing → eBay**.

## Prerequisites

1. **eBay seller account** with Business Policies enabled
   - Seller Hub → Account → Business Policies
   - Create at least one **Payment**, **Shipping**, and **Return** policy
2. **eBay Developers Program** account: https://developer.ebay.com

---

## Step 1: Create an eBay App

1. Go to https://developer.ebay.com/my/keys
2. Under **Production**, click **Create a keyset** (or use existing)
3. Note your:
   - **App ID (Client ID)**
   - **Cert ID (Client Secret)**

4. Enable OAuth scopes for your app:
   - `https://api.ebay.com/oauth/api_scope/sell.inventory`
   - `https://api.ebay.com/oauth/api_scope/sell.account`

---

## Step 2: Configure RuName (Redirect URL)

1. On the same keys page, click **User Tokens** next to your Production keyset
2. Under **Get a Token from eBay via Your Application**, click **Add eBay Redirect URL**
3. Set:
   - **Display Title:** Prince George Transport
   - **Privacy Policy URL:** `https://prince-george-transport.pages.dev/`
   - **Auth Accepted URL:** `https://prince-george-transport.pages.dev/api/admin/ebay/callback`
   - **Auth Declined URL:** `https://prince-george-transport.pages.dev/admin.html?ebay=error`

4. Save and copy the **RuName** value (looks like `YourName-YourApp-PRD-xxxxxxxx-xxxxxxxx`)

> The RuName is what you pass as `redirect_uri` — not the full callback URL.

---

## Step 3: Set Cloudflare Secrets

From the project folder:

```powershell
cd C:\Users\User\prince-george-transport

npx wrangler pages secret put EBAY_CLIENT_ID --project-name=prince-george-transport
npx wrangler pages secret put EBAY_CLIENT_SECRET --project-name=prince-george-transport
npx wrangler pages secret put EBAY_RUNAME --project-name=prince-george-transport
```

Or run the helper script:

```powershell
.\scripts\setup-ebay.ps1
```

### Local dev (`.dev.vars`)

```
EBAY_CLIENT_ID=YourAppId-PRD-xxxxxxxx-xxxxxxxxx
EBAY_CLIENT_SECRET=PRD-xxxxxxxxxxxx-xxxxxxxxx
EBAY_RUNAME=Your_Name-YourApp-PRD-xxxxxxxx-xxxxxxxx
EBAY_ENV=production
```

Use `EBAY_ENV=sandbox` with Sandbox keys for testing.

---

## Step 4: Deploy & Connect

```powershell
npm run deploy
```

1. Open https://prince-george-transport.pages.dev/admin.html
2. Enter your admin PIN
3. Go to **Marketing** tab → **Connect eBay Account**
4. Sign in with your eBay seller credentials and approve access

---

## Step 5: Publish Listings

- **Publish All to eBay** — lists every inventory item (must have a price)
- **eBay** button on each item — publish one at a time
- Items need an **HTTPS image URL** for best results (optional but recommended)

The system will:
1. Create a merchant location (200 Louthian Way, Blythewood)
2. Fetch your Business Policies from eBay
3. Create inventory item → offer → publish listing

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `eBay app not configured` | Set the 3 secrets above and redeploy |
| `Business policies missing` | Create Payment/Shipping/Return policies in Seller Hub |
| `token exchange failed` | RuName must match exactly; Auth Accepted URL must match callback |
| `price required` | Set a USD price on the inventory item |
| Listing created but no image | Add an `https://` image URL to the item in admin |

---

## API Reference

- [eBay Inventory API](https://developer.ebay.com/api-docs/sell/inventory/overview.html)
- [OAuth Authorization](https://developer.ebay.com/develop/guides-v2/authorization)
- [Business Policies](https://developer.ebay.com/api-docs/sell/account/overview.html)
