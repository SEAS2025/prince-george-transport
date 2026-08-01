// Inventory storage in Cloudflare KV.

export const INVENTORY_KEY = "inventory:v1";

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
    description: "Battery-powered suction with new canister. Holds charge well. Includes carry case.",
    imageUrl: "",
  },
  {
    id: "aed-1",
    name: "AED — Philips HeartStart FRx",
    condition: "Used",
    category: "supplies",
    price: 650,
    description: "Adult/child pads included. Battery replaced 2025. Self-test passes.",
    imageUrl: "",
  },
  {
    id: "radio-cm200-922tmu3381",
    name: "Motorola Radius CM200 VHF Mobile Radio — SN 922TMU3381",
    ebayTitle: "Motorola Radius CM200 VHF 45W Mobile Radio Kit Mic Harness Bracket",
    condition: "Used",
    category: "radios",
    brand: "Motorola",
    price: 165,
    quantity: 1,
    serialNumber: "922TMU3381",
    ebayCategoryId: "46539",
    description: `Fleet-retired Motorola Radius CM200 VHF mobile radio from Prince George Transport ambulance.

Model: AAM50KQD9AA1AN · PMUD1875C · FCC ABZ99FT3046
Serial: 922TMU3381 · PMLN4900C control head
VHF 146–174 MHz · 4 channels · 25–45W

Verified powering on (channel 1 displayed). Well-used fleet cosmetics — dust, scuffs, worn buttons.

COMPLETE KIT INCLUDED:
• CM200 mobile radio
• Hand microphone
• Vehicle wire harness
• Mounting bracket

Reprogramming required (Motorola CPS). Sold as-is — no bench TX/RX certification.
Local pickup Blythewood, SC. CONUS shipping at buyer's expense.`,
    imageUrl: "/img/radios/cm200-922tmu3381.jpg",
    extraImageUrls: ["/img/radios/cm200-922tmu3381-label.jpg"],
  },
  {
    id: "radio-cm200-922tne0190",
    name: "Motorola Radius CM200 VHF Mobile Radio — SN 922TNE0190",
    ebayTitle: "Motorola Radius CM200 VHF 45W Mobile Radio Bracket Harness Kit",
    condition: "Used",
    category: "radios",
    brand: "Motorola",
    price: 165,
    quantity: 1,
    serialNumber: "922TNE0190",
    ebayCategoryId: "46539",
    description: `Fleet-retired Motorola Radius CM200 VHF mobile radio from Prince George Transport ambulance.

Model: AAM50KQD9AA1AN · PMUD1875C · FCC ABZ99FT3046
Serial: 922TNE0190 · PMLN4598C control head
VHF 146–174 MHz · 4 channels · 25–45W

Mounted in dash bracket with wire harness attached. Channel 1 displayed. Fleet-used condition.

COMPLETE KIT INCLUDED:
• CM200 mobile radio
• Hand microphone
• Vehicle wire harness
• Mounting bracket

Reprogramming required (Motorola CPS). Sold as-is — no bench TX/RX certification.
Local pickup Blythewood, SC. CONUS shipping at buyer's expense.`,
    imageUrl: "/img/radios/cm200-922tne0190.jpg",
    extraImageUrls: ["/img/radios/cm200-922tne0190-label.jpg"],
  },
  {
    id: "radio-cm300-922tmc5022",
    name: "Motorola Radius CM300 VHF Mobile Radio — SN 922TMC5022",
    ebayTitle: "Motorola Radius CM300 VHF 32Ch Mobile Radio Kit Mic Harness",
    condition: "Used",
    category: "radios",
    brand: "Motorola",
    price: 175,
    quantity: 1,
    serialNumber: "922TMC5022",
    ebayCategoryId: "46539",
    description: `Fleet-retired Motorola Radius CM300 VHF mobile radio from Prince George Transport ambulance.

Model: AAM50KNF9AA1AN · PMUD1873B · FCC AZ492FT3805
Serial: 922TMC5022
VHF 146–174 MHz · 32 channels · 1–25W

P1–P4 programmable buttons, LCD present. Volume knob edge chipped/worn from fleet use.

COMPLETE KIT INCLUDED:
• CM300 mobile radio
• Hand microphone
• Vehicle wire harness
• Mounting bracket

Reprogramming required (Motorola CPS). Sold as-is — no bench TX/RX certification.
Local pickup Blythewood, SC. CONUS shipping at buyer's expense.`,
    imageUrl: "/img/radios/cm300-922tmc5022.jpg",
    extraImageUrls: ["/img/radios/cm300-922tmc5022-label.jpg"],
  },
  {
    id: "radio-cm200d-751tgq0925",
    name: "Motorola CM200d MOTOTRBO VHF Mobile Radio — SN 751TGQ0925",
    ebayTitle: "Motorola CM200d MOTOTRBO VHF 16Ch DMR-Ready Mobile Radio Kit",
    condition: "Used",
    category: "radios",
    brand: "Motorola",
    price: 195,
    quantity: 1,
    serialNumber: "751TGQ0925",
    ebayCategoryId: "46539",
    description: `Fleet-retired Motorola CM200d MOTOTRBO VHF mobile radio from Prince George Transport ambulance.

Model: AAM01JQC9JC1AN · PMUD3237A · FCC ABZ99FT3091
Serial: 751TGQ0925 · PMLN6321A control head
VHF 136–174 MHz · 16 channels · 25–45W

DMR-upgradeable MOTOTRBO generation. Bracket mounted. Fleet-used cosmetics.

COMPLETE KIT INCLUDED:
• CM200d mobile radio
• Hand microphone
• Vehicle wire harness
• Mounting bracket

Reprogramming required (Motorola CM200d CPS). Sold as-is — no bench TX/RX certification.
Local pickup Blythewood, SC. CONUS shipping at buyer's expense.`,
    imageUrl: "/img/radios/cm200d-751tgq0925.jpg",
    extraImageUrls: ["/img/radios/cm200d-751tgq0925-label.jpg"],
  },
  {
    id: "radio-vhf-lot-2",
    name: "Motorola VHF Mobile Radio — Fleet Unit (2 Available, Labels Pending)",
    ebayTitle: "Motorola VHF Mobile Radio Ambulance Fleet 2 Units Mic Harness Bracket",
    condition: "Used",
    category: "radios",
    brand: "Motorola",
    price: 155,
    quantity: 2,
    ebayCategoryId: "46539",
    description: `Two additional fleet-retired Motorola VHF mobile radios from Prince George Transport ambulances. Same lot as documented CM200/CM300/CM200d units — model labels and serial photos pending.

$155 each · $310 for both.

COMPLETE KIT PER RADIO:
• Mobile radio
• Hand microphone
• Vehicle wire harness
• Mounting bracket

Reprogramming required (Motorola CPS). Sold as-is — no bench TX/RX certification.
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

export async function getInventory(env) {
  if (!env.INVENTORY) return [...DEFAULT_INVENTORY];
  const raw = await env.INVENTORY.get(INVENTORY_KEY);
  if (!raw) {
    await saveInventory(env, DEFAULT_INVENTORY);
    return [...DEFAULT_INVENTORY];
  }
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [...DEFAULT_INVENTORY];
  } catch {
    return [...DEFAULT_INVENTORY];
  }
}

export async function saveInventory(env, items) {
  if (!env.INVENTORY) throw new Error("Inventory storage not configured");
  const normalized = items.map(normalizeItem).filter(Boolean);
  await env.INVENTORY.put(INVENTORY_KEY, JSON.stringify(normalized));
  return normalized;
}

export function normalizeItem(item) {
  if (!item || !item.name) return null;
  const name = String(item.name).trim();
  if (!name) return null;
  const priceRaw = item.price;
  const price = priceRaw === "" || priceRaw === null || priceRaw === undefined
    ? null
    : Number(priceRaw);
  const qtyRaw = item.quantity;
  const quantity = qtyRaw === "" || qtyRaw === null || qtyRaw === undefined
    ? 1
    : Math.max(1, Math.floor(Number(qtyRaw)) || 1);

  return {
    id: item.id || slugify(name),
    name,
    ebayTitle: String(item.ebayTitle || "").trim(),
    condition: String(item.condition || "Used").trim(),
    category: String(item.category || "supplies").trim(),
    brand: String(item.brand || "").trim(),
    price: Number.isFinite(price) && price >= 0 ? price : null,
    quantity,
    serialNumber: String(item.serialNumber || "").trim(),
    ebayCategoryId: String(item.ebayCategoryId || "").trim(),
    description: String(item.description || "").trim(),
    imageUrl: String(item.imageUrl || "").trim(),
    extraImageUrls: Array.isArray(item.extraImageUrls)
      ? item.extraImageUrls.map((u) => String(u || "").trim()).filter(Boolean)
      : [],
    ebayListingUrl: String(item.ebayListingUrl || "").trim(),
    ebayQueued: item.ebayQueued === true,
    acceptOffers: item.acceptOffers === true,
    mileage: normalizeMileage(item.mileage),
    engineNotes: String(item.engineNotes || "").trim(),
    captureId: String(item.captureId || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeMileage(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) + "-" + Date.now().toString(36);
}
