// Build eBay form-filler drafts from inventory items.

import {
  absoluteImageUrls,
  isRestrictedItem,
  salesRestrictionReason,
} from "./sales-policy.js";
import { rewriteVehicleEbayDescription } from "./vehicle-ebay-copy.js";

const SITE_URL = "https://prince-george-transport.pages.dev";
export const EBAY_ARMED_DRAFT_KEY = "ebay:armed-draft:v1";

function conditionMeta(condition) {
  const c = String(condition || "Used").toLowerCase();
  if (c.includes("new")) return { conditionId: "1000", condition: "New" };
  if (c.includes("refurb")) return { conditionId: "2000", condition: "Seller refurbished" };
  return { conditionId: "3000", condition: "Used" };
}

function defaultCategoryId(item) {
  if (item.ebayCategoryId) return String(item.ebayCategoryId);
  if (item.category === "radios") return "46539";
  if (item.category === "vehicles") return "6001";
  return "117042";
}

export function buildEbayDraft(item) {
  const source = item.category === "vehicles" ? rewriteVehicleEbayDescription(item) : item;
  const title = (source.ebayTitle || source.name || "").slice(0, 80);
  const { conditionId, condition } = conditionMeta(source.condition);
  const categoryId = defaultCategoryId(source);
  const quantity = source.quantity > 0 ? source.quantity : 1;
  const images = absoluteImageUrls(source);

  const footer =
    source.category === "vehicles"
      ? [
          "Sold by Prince George Transport — licensed SC ambulance service (NPI 1922468909).",
          "Payment through eBay checkout only — no cash or at-site payment.",
          "Local pickup in Blythewood, SC after payment clears, or buyer-arranged transport.",
          `${SITE_URL}/supplies.html`,
        ]
      : [
          "Sold by Prince George Transport — licensed SC ambulance service (NPI 1922468909).",
          "Pickup available in Blythewood, SC. Call (803) 231-9420 with questions.",
          `${SITE_URL}/supplies.html`,
        ];

  const description = [source.description || "", "", ...footer]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");

  const params = new URLSearchParams({
    mode: "AddItem",
    title,
    categoryId,
    condition: conditionId,
  });

  return {
    id: source.id,
    title,
    price: source.price,
    quantity,
    condition,
    conditionId,
    brand: source.brand || (source.category === "radios" ? "Motorola" : source.category === "vehicles" ? "Ford" : "Unbranded"),
    description,
    images,
    categoryId,
    acceptOffers: Boolean(source.acceptOffers),
    prelistUrl: "https://www.ebay.com/sl/prelist/suggest",
    listUrl: `https://www.ebay.com/sl/list?${params.toString()}`,
  };
}

export function buildEbayDraftQueue(items) {
  return (items || [])
    .filter((item) => item && item.price != null && Number(item.price) > 0)
    .filter((item) => !item.ebayListingUrl)
    .filter((item) => !isRestrictedItem(item))
    .map(buildEbayDraft);
}

export function assertDraftAllowed(item) {
  const reason = salesRestrictionReason(item);
  if (reason) {
    const err = new Error(`Blocked by sales policy: ${reason}`);
    err.status = 400;
    throw err;
  }
  return true;
}
