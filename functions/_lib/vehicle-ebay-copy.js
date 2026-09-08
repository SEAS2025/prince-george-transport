// Rewrite vehicle listing copy so eBay checkout is required (no at-site / cash payment).

const PAYMENT_BLOCK = [
  "Buy It Now price is shown on this listing. Best Offer is welcome through eBay.",
  "Payment must be completed through eBay checkout — cash and at-site payment are not accepted.",
  "Local pickup in Blythewood, SC (200 Louthian Way) is available after eBay payment clears,",
  "or the buyer may arrange towing / transport at the buyer's expense.",
  "Sold as-is, where-is, with no warranty. Confirm VIN, title, and mileage at pickup.",
].join(" ");

const LEGACY_PAYMENT_MARKERS = [
  /call\/?text\s*\(?\s*803\)?/i,
  /at[-\s]?site\s+payment/i,
  /cash\s+on\s+pickup/i,
  /pay\s+(?:on\s+)?(?:site|pickup)/i,
  /asking\s+\$[\d,]+/i,
  /local pickup available at 200 Louthian Way/i,
];

function needsRewrite(description) {
  const text = String(description || "");
  if (!text) return true;
  if (/Payment must be completed through eBay checkout/i.test(text)) return false;
  return LEGACY_PAYMENT_MARKERS.some((re) => re.test(text));
}

function stripLegacyPaymentTail(description) {
  let text = String(description || "").trim();
  // Drop common trailing sale/payment paragraphs while keeping the vehicle facts.
  text = text.replace(
    /\n*\s*Asking\s+\$[\d,]+[^\n]*(?:\n(?!Fleet-retired)[^\n]*)*$/i,
    ""
  );
  text = text.replace(
    /\n*\s*Buyer pays shipping[^\n]*(?:\n(?!Fleet-retired)[^\n]*)*$/i,
    ""
  );
  text = text.replace(
    /\n*\s*Local pickup available[^\n]*(?:\n(?!Fleet-retired)[^\n]*)*$/i,
    ""
  );
  text = text.replace(
    /\n*\s*Sold as-is[^\n]*(?:\n(?!Fleet-retired)[^\n]*)*$/i,
    ""
  );
  text = text.replace(/\n*\s*Call\/?text[^\n]*$/i, "");
  text = text.replace(/\n*\s*Call\s*\(?\s*803\)?[^\n]*$/i, "");
  return text.trim();
}

const AMBULANCE_SALE_PRICE = 1500;

const AMBULANCE_IDS = new Set([
  "ambulance-2008-a70177",
  "ambulance-2008-b04415",
  "ambulance-2010-a25619",
  "ambulance-2009-a88103",
  "ambulance-2010-a03185",
]);

export function rewriteVehicleEbayDescription(item) {
  if (!item || item.category !== "vehicles") return item;

  let next = item;
  if (AMBULANCE_IDS.has(item.id) && item.price !== AMBULANCE_SALE_PRICE) {
    next = { ...next, price: AMBULANCE_SALE_PRICE, acceptOffers: next.acceptOffers !== false };
  }

  if (!needsRewrite(next.description) && next === item) return item;
  if (!needsRewrite(next.description)) return next;

  const facts = stripLegacyPaymentTail(next.description);
  const description = [facts, "", PAYMENT_BLOCK].filter(Boolean).join("\n");

  let ebayTitle = String(next.ebayTitle || next.name || "").trim();
  // Keep Best Offer in eBay settings; drop informal OBO from title when present.
  ebayTitle = ebayTitle.replace(/\s+OBO\b/gi, "").trim().slice(0, 80);

  return {
    ...next,
    ebayTitle,
    description,
    acceptOffers: next.acceptOffers !== false,
  };
}

export function applyVehicleEbayPaymentCopy(items) {
  return (items || []).map((item) => rewriteVehicleEbayDescription(item));
}

export { PAYMENT_BLOCK };
