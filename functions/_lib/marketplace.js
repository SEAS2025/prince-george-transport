// Facebook Marketplace bulk-export helpers.
// Note: Meta does not offer a public API for personal Marketplace bulk posting.
// This CSV is formatted for third-party bulk lister Chrome extensions (AutoList, TheLazyPoster, etc.)

const SITE_URL = "https://prince-george-transport.pages.dev";
const LOCATION = "Blythewood, SC";

function resolveImageUrl(item) {
  const raw = String(item.imageUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${SITE_URL}${raw}`;
  return raw;
}

export function fbListingText(item) {
  const price = item.price != null ? `$${item.price}` : "Make offer";
  const lines = [
    item.name,
    "",
    item.description || "",
    "",
    `Condition: ${item.condition || "Used"}`,
    `Price: ${price}`,
    "",
    "Retired from a licensed SC ambulance service (Prince George Transport).",
    "Great for EMS training programs, volunteer departments, or backup gear.",
    "",
    `Pickup: ${LOCATION}`,
    `Call/text: (803) 231-9420`,
    `${SITE_URL}/supplies.html`,
  ];
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

export function fbCategory(item) {
  if (item.category === "radios") return "Electronics";
  return "Miscellaneous";
}

export function inventoryToMarketplaceCsv(items) {
  const header = [
    "title",
    "price",
    "description",
    "category",
    "condition",
    "location",
    "image_url",
    "site_url",
  ];

  const rows = items.map((item) => [
    item.name,
    item.price != null ? String(item.price) : "",
    fbListingText(item),
    fbCategory(item),
    item.condition || "Used",
    LOCATION,
    resolveImageUrl(item),
    `${SITE_URL}/supplies.html#inventory`,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function outreachEmailTemplate(lead, items) {
  const highlights = pickTrainingHighlights(items);
  const sample = highlights
    .map((i) => `• ${i.name}${i.price != null ? ` — $${i.price}` : ""}`)
    .join("\n");

  const isAgency = /dph|department of public health/i.test(lead.name);
  if (isAgency) {
    return `Subject: Surplus EMS training equipment — may help SC EMT programs

Hello ${lead.contact || "EMS and Trauma team"},

Prince George Transport is a licensed SC ambulance service in Blythewood (NPI 1922468909). We are liquidating fleet-retired EMS supplies, AEDs, suction units, and Motorola radios.

These items may help DPH-approved EMT/paramedic training programs for skills labs (expired sterile items clearly marked training/display only).

Full inventory with photos and prices:
https://prince-george-transport.pages.dev/supplies

If you can share this with training officers or point us to the best contact list for approved programs, we would appreciate it.

Thank you,
Prince George Transport
200 Louthian Way, Blythewood, SC 29016
(803) 231-9420`;
  }

  return `Subject: Surplus EMS training equipment for your program — Prince George Transport

Hello ${lead.contact || "EMS Program team"},

I'm reaching out from Prince George Transport, a licensed non-emergency ambulance service in Blythewood (Columbia metro), NPI 1922468909 / SC license E3044851.

We are retiring used ambulance supplies, airway/O2 gear, AEDs, suction equipment, and Motorola VHF radios. Several items may fit EMT/paramedic skills labs and training use:

${sample || "• EMS training gear, AEDs, suction, radios, and more — see full list online"}

Browse the full inventory (photos + prices):
https://prince-george-transport.pages.dev/supplies

Notes:
• Local pickup at 200 Louthian Way, Blythewood, SC 29016
• Items sold as-is; expired sterile products are labeled for training/display only
• Happy to pull a quote list for specific lab needs

Would your program like to review the list or schedule a walkthrough?

Thank you,
Prince George Transport
(803) 231-9420`;
}

function pickTrainingHighlights(items) {
  if (!Array.isArray(items) || !items.length) return [];
  const preferred = items.filter((i) => {
    if (i.category === "vehicles") return false;
    const t = `${i.name} ${i.description}`.toLowerCase();
    return /aed|suction|laerdal|airway|bvm|stretcher|board|collar|defib|traction|radio|yankauer|mask|pads/i.test(t);
  });
  const pool = preferred.length ? preferred : items.filter((i) => i.category !== "vehicles");
  return pool.slice(0, 8);
}
