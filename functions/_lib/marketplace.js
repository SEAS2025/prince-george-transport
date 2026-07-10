// Facebook Marketplace bulk-export helpers.
// Note: Meta does not offer a public API for personal Marketplace bulk posting.
// This CSV is formatted for third-party bulk lister Chrome extensions (AutoList, TheLazyPoster, etc.)

const SITE_URL = "https://prince-george-transport.pages.dev";
const LOCATION = "Blythewood, SC";

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
    item.imageUrl || "",
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
  const sample = items.slice(0, 3).map((i) => `• ${i.name}${i.price != null ? ` — $${i.price}` : ""}`).join("\n");
  return `Subject: Surplus EMS training equipment available — Prince George Transport

Hello ${lead.contact || "there"},

I'm reaching out from Prince George Transport, a licensed non-emergency ambulance service in Blythewood / Columbia area (NPI 1922468909).

We are retiring used ambulance supplies and two-way radios from our fleet. Several items may be useful for EMT skills labs and training programs:

${sample || "• Various stretchers, O2 equipment, radios, and EMS supplies"}

All items are sold as-is at reduced prices. Local pickup available at 200 Louthian Way, Blythewood, SC 29016.

Full inventory: ${SITE_URL}/supplies.html
Phone: (803) 231-9420

Would your program be interested in reviewing our current list?

Thank you,
Prince George Transport`;
}
