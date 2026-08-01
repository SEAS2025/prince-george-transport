// eBay bulk-export CSV — for Seller Hub file exchange or manual listing prep.

const SITE_URL = "https://prince-george-transport.pages.dev";

/** KV key for the Tampermonkey form-filler active draft */
export const EBAY_FILLER_DRAFT_KEY = "ebay-filler:active-draft";

const RADIO_CATEGORY = "46539"; // Mobile & In-Vehicle Industrial Two-Way Radios
const SUPPLIES_CATEGORY = "117042"; // Medical & Mobility

export function resolveImageUrl(item, siteUrl = SITE_URL) {
  const raw = String(item.imageUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${siteUrl.replace(/\/$/, "")}${raw}`;
  return raw;
}

export function listingImageUrls(item, siteUrl = SITE_URL) {
  const urls = [];
  const main = resolveImageUrl(item, siteUrl);
  if (main) urls.push(main);
  for (const extra of item.extraImageUrls || []) {
    const resolved = extra.startsWith("https://")
      ? extra
      : extra.startsWith("/")
        ? `${siteUrl.replace(/\/$/, "")}${extra}`
        : extra;
    if (resolved && !urls.includes(resolved)) urls.push(resolved);
  }
  return urls;
}

export function ebayCategoryId(item) {
  if (item.ebayCategoryId) return String(item.ebayCategoryId);
  if (item.category === "radios") return RADIO_CATEGORY;
  if (item.category === "vehicles") return "6001"; // Cars & Trucks — prefer Motors listing; API may still need seller Motor policies
  return SUPPLIES_CATEGORY;
}

export function ebayTitle(item) {
  const title = String(item.ebayTitle || item.name || "").trim();
  return title.slice(0, 80);
}

export function ebayDescription(item) {
  const lines = [
    item.description || "",
    "",
    item.serialNumber ? `Serial Number: ${item.serialNumber}` : "",
    "",
    "Sold by Prince George Transport — licensed SC ambulance service (NPI 1922468909).",
    "Pickup: 200 Louthian Way, Blythewood, SC 29016.",
    "Call/text (803) 231-9420 with questions.",
    "",
    `${SITE_URL}/supplies.html`,
  ];
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

export function ebayBrand(item) {
  if (item.brand) return item.brand;
  if (item.category === "radios" && /motorola/i.test(item.name + item.description)) return "Motorola";
  return "";
}

/** eBay condition IDs used by /sl/list deep links */
export function ebayConditionId(item) {
  const c = String(item.condition || "Used").toLowerCase().trim();
  if (/parts|not working|for parts/.test(c)) return "7000";
  if (/refurb/.test(c)) return "2500";
  if (/open.?box/.test(c)) return "1500";
  if (/^(new|brand new|nos)$/.test(c) || c === "new") return "1000";
  return "3000"; // Used
}

/** Skip match / identify step — opens category+title suggest results */
export function ebayPrelistUrl(item) {
  const params = new URLSearchParams({
    title: ebayTitle(item),
    caty: ebayCategoryId(item),
  });
  return `https://www.ebay.com/sl/prelist/identify?${params}`;
}

/**
 * Deep link into the listing form (after sign-in).
 * Title, category, and condition are pre-applied when eBay accepts the params.
 */
export function ebayListStartUrl(item) {
  const params = new URLSearchParams({
    mode: "AddItem",
    title: ebayTitle(item),
    categoryId: ebayCategoryId(item),
    condition: ebayConditionId(item),
  });
  return `https://www.ebay.com/sl/list?${params}`;
}

/** Payload for clipboard + Tampermonkey filler */
export function ebayDraft(item, siteUrl = SITE_URL) {
  return {
    v: 1,
    prefix: "PGT_EBAY",
    id: item.id,
    title: ebayTitle(item),
    description: ebayDescription(item),
    price: item.price,
    quantity: item.quantity ?? 1,
    condition: item.condition || "Used",
    conditionId: ebayConditionId(item),
    categoryId: ebayCategoryId(item),
    brand: ebayBrand(item),
    images: listingImageUrls(item, siteUrl),
    listUrl: ebayListStartUrl(item),
    prelistUrl: ebayPrelistUrl(item),
    siteUrl: `${siteUrl.replace(/\/$/, "")}/supplies.html#${item.id}`,
  };
}

export function ebayDraftClipboardText(item, siteUrl = SITE_URL) {
  return `PGT_EBAY::${JSON.stringify(ebayDraft(item, siteUrl))}`;
}

export function inventoryToEbayCsv(items, siteUrl = SITE_URL) {
  const header = [
    "sku",
    "title",
    "description",
    "price",
    "quantity",
    "condition",
    "category_id",
    "brand",
    "image_url",
    "extra_image_urls",
    "serial_number",
    "site_category",
    "listing_url",
  ];

  const rows = items.map((item) => [
    item.id,
    ebayTitle(item),
    ebayDescription(item),
    item.price != null ? String(item.price) : "",
    String(item.quantity ?? 1),
    item.condition || "Used",
    ebayCategoryId(item),
    ebayBrand(item),
    resolveImageUrl(item, siteUrl),
    listingImageUrls(item, siteUrl).slice(1).join("|"),
    item.serialNumber || "",
    item.category || "supplies",
    `${siteUrl}/supplies.html#${item.id}`,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Condition ID values for Seller Hub \"Create new drafts\" template */
export function ebayDraftConditionToken(item) {
  const c = String(item.condition || "Used").toLowerCase().trim();
  if (/parts|not working/.test(c)) return "USED";
  if (/^new|sealed|nos|brand new|open.?box/.test(c)) return "NEW";
  return "USED";
}

function ebayDescriptionHtml(item, siteUrl = SITE_URL) {
  const parts = String(item.description || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`);
  if (item.serialNumber) {
    parts.push(`<p>Serial Number: ${escapeHtml(item.serialNumber)}</p>`);
  }
  parts.push(
    "<p>Sold by Prince George Transport — licensed SC ambulance service (NPI 1922468909).</p>"
  );
  parts.push(
    "<p>Pickup: 200 Louthian Way, Blythewood, SC 29016. Call/text (803) 231-9420.</p>"
  );
  parts.push(`<p><a href="${escapeHtml(siteUrl)}/supplies.html">${escapeHtml(siteUrl)}/supplies.html</a></p>`);
  return parts.join("");
}

/**
 * Seller Hub Reports → Upload → Create new drafts template.
 * Matches eBay-draft-listings-template_US header row exactly.
 */
export function inventoryToEbayDraftsCsv(items, siteUrl = SITE_URL) {
  const eligible = items.filter(
    (i) => i.price != null && i.category !== "vehicles" && !i.ebayListingUrl
  );

  const actionHeader =
    "Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)";
  const header = [
    actionHeader,
    "Custom label (SKU)",
    "Category ID",
    "Title",
    "UPC",
    "Price",
    "Quantity",
    "Item photo URL",
    "Condition ID",
    "Description",
    "Format",
  ];

  const info = [
    ["#INFO", "Version=0.0.2", "Template= eBay-draft-listings-template_US"],
    [
      "#INFO Action and Category ID are required fields. 1) Set Action to Draft 2) Category IDs from PGT inventory.",
    ],
    [
      "#INFO After upload, complete drafts at https://www.ebay.com/sh/lst/drafts",
    ],
    ["#INFO Generated by Prince George Transport"],
  ];

  const rows = eligible.map((item) => [
    "Draft",
    item.id,
    ebayCategoryId(item),
    ebayTitle(item),
    "",
    String(item.price),
    String(item.quantity ?? 1),
    listingImageUrls(item, siteUrl).join("|"),
    ebayDraftConditionToken(item),
    ebayDescriptionHtml(item, siteUrl),
    "FixedPrice",
  ]);

  const lines = [
    ...info.map((row) => row.map(csvCell).join(",")),
    header.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return lines.join("\r\n");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
