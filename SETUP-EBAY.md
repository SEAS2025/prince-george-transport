# eBay Listing — Prince George Transport

You can sell on eBay **without** a Developer API account. Use Seller Hub (manual or worksheet-assisted).

---

## Path A — List now (recommended if Developer signup was rejected)

API rejection is common and often automated. **You do not need API approval to sell.**

### Form filler (fastest)

1. Install [Tampermonkey](https://www.tampermonkey.net/) in Chrome.
2. Open https://prince-george-transport.pages.dev/ebay-filler.user.js → **Install**.
3. Sign in to eBay in the same browser.
4. Admin → Marketing → **eBay Form Filler** → **List on eBay** for an item.
5. On the eBay listing page, use the red **PGT eBay Filler** panel → **Fill form** (or **Load draft**).
6. Upload photos manually (image URLs are copied for you), set shipping, publish.
7. Paste the live `ebay.com/itm/…` URL back into Admin on that item.

Deep links prefill **title**, **category**, and **condition**. The userscript fills **price**, **description**, and **brand** when the fields are present.

### Or use the CSV worksheet

### 1. Download the worksheet

Admin → Marketing → **Download Listing Worksheet CSV**

Also on this PC:

- `C:\Users\User\Downloads\pgt-ebay-listings-worksheet.csv` — full export
- `C:\Users\User\Downloads\pgt-ebay-FIRST-BATCH-no-expired.csv` — **82** in-date / non-expired priced items (best first pass)

Columns: title, description, price, quantity, condition, category_id, brand, image URLs.

### 2. Create listings in Seller Hub

1. Sign in at https://www.ebay.com/sh/lst/active  
2. **Create listing** (or https://www.ebay.com/sl/prelist/suggest)  
3. For each row (open the CSV in Excel):
   - Paste **title** (already ≤ 80 chars)
   - Paste **description**
   - Set **price** and **quantity**
   - Match **condition**
   - Category: Medical & Mobility / EMS (`117042`) or Two-Way Radios (`46539`)
   - Add photos from `image_url` / `extra_image_urls` (open HTTPS links → save, or use photos on the website)
4. Shipping: local pickup Blythewood SC + your usual CONUS policy
5. Publish

**Tips**

- Skip **vehicles** for now (Motors flow + need asking prices)
- Leave **EXPIRED** items for a later “training only” pass
- Batch high-value first: radios, AEDs, LCSU, KTD, then consumables

### 3. Paste “Buy on eBay” back on the site (optional)

After a listing goes live, copy the `ebay.com/itm/…` URL into Admin → edit item → **eBay Listing URL**.  
The supplies page will show **Buy on eBay**.

### 4. Facebook Marketplace (same inventory)

Admin → Marketing → **Download CSV for Bulk Lister** — alternate channel while you list on eBay by hand.

---

## Path B — Appeal Developer rejection (for future auto-publish)

Rejections often say “problems with the data provided or other irregularities” with **no detailed reason**.

1. Appeal once via https://developer.ebay.com/support/developer-account-support → “My account registration was rejected”
2. Use a real person name, address matching your eBay seller profile, and a clear use case:

   > Prince George Transport — licensed SC ambulance service (NPI 1922468909). We need the Sell Inventory API only to list our own used EMS fleet supplies on our own seller account.

3. Wait — don’t spam appeals  
4. Or re-register later with the **same email as your verified eBay seller account**

If approved later: set secrets → Admin → Connect eBay → Publish All (see Path C).

---

## Path C — API auto-publish (only after Developer approval)

1. Create Production keyset: https://developer.ebay.com/my/keys  
2. Scopes: `sell.inventory`, `sell.account`  
3. RuName Auth Accepted URL: `https://prince-george-transport.pages.dev/api/admin/ebay/callback`  
4. Run `.\scripts\setup-ebay.ps1`  
5. Admin → Marketing → **Connect eBay Account** → **Publish All**

Seller Hub must have Payment, Shipping, and Return business policies.

---

## Automated daily task

Until Developer keys exist, the Monday automation will report secrets missing and won’t list anything. That’s expected — use Path A.

---

## Troubleshooting

| Situation | What to do |
|-----------|------------|
| Developer rejected | Use Path A. Appeal once (Path B). |
| No auto Publish button | Expected without API secrets |
| Vehicles | Set asking prices; list via Motors / local pickup |
| Need photos | Use `https://prince-george-transport.pages.dev/img/…` from the CSV |
