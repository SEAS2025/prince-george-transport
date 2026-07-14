// Inventory storage in Cloudflare KV.

import {
  applyInventoryPolicyTweaks,
  filterSellableItems,
} from "./sales-policy.js";

export const INVENTORY_KEY = "inventory:v1";
export const SALES_POLICY_PURGE_KEY = "inventory:sales-policy-purge:v1";

export const DEFAULT_INVENTORY = [
  {
    id: "stretcher-1",
    name: "Ferno PowerFlexx+ Stretcher",
    condition: "Used",
    category: "supplies",
    price: 1200,
    description: "Hydraulic stretcher retired from active fleet. Good condition, all latches functional. Local pickup only.",
    imageUrl: "",
  },
  {
    id: "stair-chair-1",
    name: "Stair Chair (Ferno Compact 2)",
    condition: "Used",
    category: "supplies",
    price: 450,
    description: "Track-style stair chair with new restraint straps. Serviced annually. Fits standard ambulance mounts.",
    imageUrl: "",
  },
  {
    id: "o2-reg-1",
    name: "Oxygen Regulator Set (CGA-870)",
    condition: "Used",
    category: "supplies",
    price: 85,
    description: "Flowmeter and regulator combo. Pressure tested. Multiple units available.",
    imageUrl: "",
  },
  {
    id: "suction-1",
    name: "Portable Suction Unit (Laerdal LSU)",
    condition: "Used",
    category: "supplies",
    price: 350,
    description:
      "Battery-powered suction unit. Holds charge well. Includes carry case. Collection canisters sold separately are not offered.",
    imageUrl: "",
  },
  {
    id: "aed-1",
    name: "AED — Philips HeartStart FRx",
    condition: "Used",
    category: "supplies",
    price: 650,
    description:
      "Battery replaced 2025. Self-test passes. Electrode pads are not included with this listing.",
    imageUrl: "",
  },
  {
    id: "radio-cm200",
    name: "Motorola VHF Mobile Radios — CM200/CM300/CM200d (6 Available)",
    condition: "Used",
    category: "radios",
    price: 165,
    description: `Fleet-retired Motorola VHF mobile radios removed from Prince George Transport ambulances. Six (6) units total — $930 for all six ($155/ea). Photos on file for 4 units; 2 additional units same fleet (labels pending).

PHOTO-CONFIRMED UNITS (4 of 6):

① CM200 45W — SN 922TMU3381 (IMG_2367)
   Model: AAM50KQD9AA1AN · PMUD1875C · FCC ABZ99FT3046
   VHF 146–174 MHz · 4 ch · 25–45W · PMLN4900C control head
   Photo: Radius CM200 faceplate, green LED shows CH 1 (powers on), dusty from fleet use

② CM300 25W — SN 922TMC5022 (IMG_2368)
   Model: AAM50KNF9AA1AN · PMUD1873B · FCC AZ492FT3805
   VHF 146–174 MHz · 32 ch · 1–25W
   Photo: Radius CM300 faceplate, P1–P4 buttons, volume knob edge chipped/worn, LCD present

③ CM200 45W — SN 922TNE0190 (IMG_2365)
   Model: AAM50KQD9AA1AN · PMUD1875C · FCC ABZ99FT3046
   VHF 146–174 MHz · 4 ch · 25–45W · PMLN4598C control head
   Photo: Radius CM200 in dash bracket, CH 1 on display, red/black harness attached

④ CM200d 45W — SN 751TGQ0925 (IMG_2366)
   Model: AAM01JQC9JC1AN · PMUD3237A · FCC ABZ99FT3091
   VHF 136–174 MHz · 16 ch · 25–45W · PMLN6321A control head
   Photo: CM200d faceplate (+Vol-/CH rockers, P1/P2), MOTOTRBO generation, bracket mounted

VISUAL CONDITION (from photos):
• Well-used fleet cosmetics — dust, scuffs, worn buttons/knobs
• CM200 units verified powering on (channel 1 displayed)
• Mounting brackets and wire harnesses visible in photos
• Sold as-is — no bench TX/RX certification

COMPLETE KIT PER RADIO:
• Mobile radio + hand microphone + vehicle wire harness + mounting bracket

Reprogramming required (Motorola CPS; CM200d uses CM200d CPS). CM200d upgradeable to DMR digital.
Local pickup Blythewood, SC. CONUS shipping at buyer's expense.`,
    imageUrl: "",
  },
  {
    id: "radio-kenwood-1",
    name: "Kenwood NX-5200 Mobile Radio",
    condition: "Used",
    category: "radios",
    price: 425,
    description: "Mobile unit with mounting bracket and power cable. Removed from retired ambulance.",
    imageUrl: "",
  },
  {
    id: "charger-1",
    name: "Radio Charger Base (6-bay)",
    condition: "Used",
    category: "radios",
    price: 150,
    description: "Six-bay impres charger for Motorola XPR series. Works with included power supply.",
    imageUrl: "",
  },
  {
    id: "backboard-1",
    name: "Backboard with Straps",
    condition: "Used",
    category: "supplies",
    price: 65,
    description: "HDPE backboard with head immobilizer and spider straps. Light scuffing, fully functional.",
    imageUrl: "",
  },
];

export async function getInventory(env, { applyPolicy = true } = {}) {
  let items;
  if (!env.INVENTORY) {
    items = [...DEFAULT_INVENTORY];
  } else {
    const raw = await env.INVENTORY.get(INVENTORY_KEY);
    if (!raw) {
      await saveInventory(env, DEFAULT_INVENTORY, { applyPolicy: false });
      items = [...DEFAULT_INVENTORY];
    } else {
      try {
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed) ? parsed : [...DEFAULT_INVENTORY];
      } catch {
        items = [...DEFAULT_INVENTORY];
      }
    }
  }

  if (!applyPolicy) return items;

  const tweaked = applyInventoryPolicyTweaks(items);
  const { sellable, removed } = filterSellableItems(tweaked);

  const before = JSON.stringify(items);
  const after = JSON.stringify(sellable);
  if (env.INVENTORY && before !== after) {
    await saveInventory(env, sellable, { applyPolicy: false });
    if (removed.length) {
      await env.INVENTORY.put(
        SALES_POLICY_PURGE_KEY,
        JSON.stringify({
          purgedAt: new Date().toISOString(),
          removed,
        })
      );
    }
  }

  return sellable;
}

export async function saveInventory(env, items, { applyPolicy = true } = {}) {
  if (!env.INVENTORY) throw new Error("Inventory storage not configured");
  let list = (items || []).map(normalizeItem).filter(Boolean);
  if (applyPolicy) {
    list = applyInventoryPolicyTweaks(list);
    const { sellable, removed } = filterSellableItems(list);
    if (removed.length) {
      await env.INVENTORY.put(
        SALES_POLICY_PURGE_KEY,
        JSON.stringify({ purgedAt: new Date().toISOString(), removed })
      );
    }
    list = sellable;
  }
  await env.INVENTORY.put(INVENTORY_KEY, JSON.stringify(list));
  return list;
}

export function normalizeItem(item) {
  if (!item || !item.name) return null;
  const name = String(item.name).trim();
  if (!name) return null;
  const priceRaw = item.price;
  const price =
    priceRaw === "" || priceRaw === null || priceRaw === undefined
      ? null
      : Number(priceRaw);
  const quantityRaw = item.quantity;
  const quantity =
    quantityRaw === "" || quantityRaw === null || quantityRaw === undefined
      ? 1
      : Number(quantityRaw);
  const extraImageUrls = Array.isArray(item.extraImageUrls)
    ? item.extraImageUrls.map((u) => String(u || "").trim()).filter(Boolean)
    : [];

  return {
    id: item.id || slugify(name),
    name,
    ebayTitle: String(item.ebayTitle || "").trim(),
    condition: String(item.condition || "Used").trim(),
    category: String(item.category || "supplies").trim(),
    brand: String(item.brand || "").trim(),
    price: Number.isFinite(price) && price >= 0 ? price : null,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    serialNumber: String(item.serialNumber || "").trim(),
    ebayCategoryId: String(item.ebayCategoryId || "").trim(),
    description: String(item.description || "").trim(),
    imageUrl: String(item.imageUrl || "").trim(),
    extraImageUrls,
    ebayListingUrl: String(item.ebayListingUrl || "").trim(),
    ebayQueued: Boolean(item.ebayQueued),
    captureId: String(item.captureId || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) +
    "-" +
    Date.now().toString(36)
  );
}
