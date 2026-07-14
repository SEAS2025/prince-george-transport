// Build eBay form-filler drafts from inventory items.

import {
  absoluteImageUrls,
  isRestrictedItem,
  salesRestrictionReason,
} from "./sales-policy.js";

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
  const title = (item.ebayTitle || item.name || "").slice(0, 80);
  const { conditionId, condition } = conditionMeta(item.condition);
  const categoryId = defaultCategoryId(item);
  const quantity = item.quantity > 0 ? item.quantity : 1;
  const images = absoluteImageUrls(item);

  const description = [
    item.description || "",
    "",
    "Sold by Prince George Transport — licensed SC ambulance service (NPI 1922468909).",
    "Pickup available in Blythewood, SC. Call (803) 231-9420 with questions.",
    "",
    `${SITE_URL}/supplies.html`,
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");

  const params = new URLSearchParams({
    mode: "AddItem",
    title,
    categoryId,
    condition: conditionId,
  });

  return {
    id: item.id,
    title,
    price: item.price,
    quantity,
    condition,
    conditionId,
    brand: item.brand || (item.category === "radios" ? "Motorola" : "Unbranded"),
    description,
    images,
    categoryId,
    prelistUrl: "https://www.ebay.com/sl/prelist/suggest",
    listUrl: `https://www.ebay.com/sl/list?${params.toString()}`,
  };
}

export function buildEbayDraftQueue(items) {
  return (items || [])
    .filter((item) => item && item.category !== "vehicles")
    .filter((item) => item.price != null && Number(item.price) > 0)
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
