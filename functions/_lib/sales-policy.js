// Sales restrictions for surplus EMS listings (site + eBay).
// Policy from Graham (Prince George Transport):
// - In-date dated medical equipment is not for sale (e.g. OPAs, sealed EXPs still good)
// - Bed pans, urinals, splints, and sharps containers are never for sale (do not expire)
// - AED pads/electrodes that are not confirmed expired are not for sale
// - Suction canisters are never for sale

const SITE_URL = "https://prince-george-transport.pages.dev";

/** Explicit removals that match Graham's list / known in-date catalog IDs. */
export const RESTRICTED_ITEM_IDS = new Set([
  "berman-opa-kit-2399",
  "berman-opa-lot-2400",
  "adc-berman-kit-2435",
  "patient-care-kit-2404",
  "red-padded-splints-2405",
  "orange-padded-splints-2415",
  "porta-sharps-2422",
  "bemis-canister-expired-2431",
  "quik-combo-redi-pak-2395",
  "physio-infant-pads-2396",
  "quik-combo-adult-2397",
  "physio-infant-pads-indate-2429",
  "ambu-peep-2442",
  "ambu-peep-2446",
  "flexicare-laryseal-2453",
]);

export const SALES_POLICY_SUMMARY = [
  "In-date medical consumables (dated stock still within EXP) are not for sale.",
  "Bed pans, urinals, board splints, and sharps containers are never for sale.",
  "AED pads/electrodes may be listed only when clearly marked EXPIRED (training/display).",
  "Suction canisters are never for sale.",
].join(" ");

function blob(item) {
  return `${item?.id || ""}\n${item?.name || ""}\n${item?.ebayTitle || ""}\n${item?.description || ""}`;
}

function markedExpired(text) {
  return /\bEXPIRED\b/i.test(text) || /\bUse By\b[^\n]*\bEXPIRED\b/i.test(text);
}

function isAedPadProduct(item) {
  const name = String(item?.name || "");
  const title = String(item?.ebayTitle || "");
  const id = String(item?.id || "");
  const header = `${id}\n${name}\n${title}`;
  const desc = String(item?.description || "");

  // Device listings (AED units) — never treat as pad SKUs based on body text alone.
  if (
    /\b(lifepak\s*\d|lifepak\s*cr|heartstart|biphasic aed|\baed\s*[—-]|\baed\b)/i.test(header) &&
    !/\belectrodes?\b|\bredi-pak\b|\bquik-combo\b|heartsync|(?:defib|aed)\s*pads?\b/i.test(header)
  ) {
    return false;
  }

  // Ignore alcohol / gauze "pads" on glucose kits etc.
  const defibPadHint =
    /defib(?:rillation)?\s*electr|\belectrodes?\b|\bredi-pak\b|\bquik-combo\b|heartsync|(?:infant\/child|aed|defib)\s*pads?|reduced energy defib/i;

  return defibPadHint.test(header) || (defibPadHint.test(desc) && !/\baed\b|lifepak|heartstart/i.test(header));
}

function hasFutureExpDate(text, now = new Date()) {
  // Match EXP 2026-12 / EXP 2029-11-23 / EXP ~2028-05-14
  const re = /EXP(?:\.|iration)?[^\d]{0,24}(~?\s*)(20\d{2})[-./](\d{1,2})(?:[-./](\d{1,2}))?/gi;
  let m;
  let foundFuture = false;
  while ((m = re.exec(text)) !== null) {
    const year = Number(m[2]);
    const month = Number(m[3]);
    const day = Number(m[4] || 28);
    const exp = new Date(Date.UTC(year, month - 1, Math.min(day, 28)));
    if (exp >= new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) {
      foundFuture = true;
    }
  }
  return foundFuture;
}

/**
 * Returns null if the item may be sold; otherwise a short reason string.
 */
export function salesRestrictionReason(item, now = new Date()) {
  if (!item) return "Missing item";
  if (RESTRICTED_ITEM_IDS.has(item.id)) {
    return "Matches fleet sales-restriction list (in-date medical / never-sell category)";
  }

  const text = blob(item);
  const lower = text.toLowerCase();

  if (/\bbed\s*pans?\b|\bbedpan\b/i.test(text)) {
    return "Bed pans are not for sale";
  }
  if (/\burinals?\b/i.test(text)) {
    return "Urinals are not for sale";
  }
  if (/\bsharps\b/i.test(text)) {
    return "Sharps containers are not for sale";
  }
  if (/\bsuction\s+canisters?\b/i.test(text) && !/not\s+(included|for sale|offered)/i.test(text)) {
    return "Suction canisters are not for sale";
  }
  // Board / padded splints — not spider straps or immobilizers alone
  if (/\bsplints?\b/i.test(text) && !/spider\s*strap/i.test(text)) {
    return "Splints are not for sale";
  }
  if (/\bopa\b|\boropharyngeal\b|berman\s+airway/i.test(text)) {
    return "Oropharyngeal airways (OPAs) are not for sale";
  }

  if (isAedPadProduct(item) && !markedExpired(text)) {
    return "AED pads/electrodes that are not confirmed expired are not for sale";
  }

  // Dated medical stock still in date (explicit future EXP, not marked EXPIRED)
  if (!markedExpired(text) && hasFutureExpDate(text, now)) {
    // Durable equipment titles sometimes include MFG dates — only flag consumable-ish categories
    if (
      item.category === "supplies" ||
      /mask|airway|pad|electrode|valve|peep|lma|cannula|catheter|dressing|saline|kit|sterile|disposable/i.test(
        lower
      )
    ) {
      return "In-date medical equipment (future EXP) is not for sale";
    }
  }

  return null;
}

export function isRestrictedItem(item, now = new Date()) {
  return !!salesRestrictionReason(item, now);
}

export function filterSellableItems(items, now = new Date()) {
  const sellable = [];
  const removed = [];
  for (const item of items || []) {
    const reason = salesRestrictionReason(item, now);
    if (reason) removed.push({ id: item.id, name: item.name, reason });
    else sellable.push(item);
  }
  return { sellable, removed };
}

export function applyInventoryPolicyTweaks(items) {
  return (items || []).map((item) => {
    if (!item) return item;
    if (item.id === "aed-1") {
      return {
        ...item,
        description:
          "Battery replaced 2025. Self-test passes. Electrode pads are not included with this listing.",
      };
    }
    if (item.id === "suction-1") {
      return {
        ...item,
        description:
          "Battery-powered suction unit. Holds charge well. Includes carry case. Collection canisters sold separately are not offered.",
      };
    }
    return item;
  });
}

export function absoluteImageUrls(item) {
  const urls = [];
  if (item?.imageUrl) urls.push(item.imageUrl);
  for (const u of item?.extraImageUrls || []) {
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls.map((u) => (u.startsWith("http") ? u : `${SITE_URL}${u}`));
}
