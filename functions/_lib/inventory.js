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
    id: "radio-moto-1",
    name: "Motorola XPR 7550e Portable Radio",
    condition: "Used",
    category: "radios",
    price: 275,
    description: "UHF portable with antenna and belt clip. Charger included. Programmed — reprogramming available.",
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
  return {
    id: item.id || slugify(name),
    name,
    condition: String(item.condition || "Used").trim(),
    category: String(item.category || "supplies").trim(),
    price: Number.isFinite(price) && price >= 0 ? price : null,
    description: String(item.description || "").trim(),
    imageUrl: String(item.imageUrl || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) + "-" + Date.now().toString(36);
}
