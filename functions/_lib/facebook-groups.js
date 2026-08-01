// Facebook groups / pages good for EMS surplus, ambulances, and LMR radios.
// Join as the business Page or a staff profile; read each group's rules before posting.
// Member counts and rules change — verify before posting. Prefer Marketplace + 2–3 groups/day.

export const FACEBOOK_GROUPS = [
  {
    id: "fb-used-ambulance-equip",
    name: "Used Ambulances & EMS Equipment For Sale",
    focus: "vehicles + gear",
    why: "Primary buy/sell audience for Type II vans and fleet surplus.",
    url: "https://www.facebook.com/groups/1723201987990712/",
    searchHint: "Used Ambulance And equipment For Sale",
    postType: "vehicles+supplies",
  },
  {
    id: "fb-two-way-radio-trader",
    name: "Two Way Radio Trader / LMR Buy-Sell",
    focus: "radios",
    why: "Motorola/Kenwood mobiles and accessories — good for CM200/CM300 kits.",
    url: "https://www.facebook.com/groups/603282713035843/",
    searchHint: "Two Way Radio Trader OR Motorola radios buy sell",
    postType: "radios",
  },
  {
    id: "fb-lmr-bst-alt",
    name: "Business / LMR Radio Buy Sell Trade",
    focus: "radios",
    why: "Alternate LMR BST community if the first radio group is moderated.",
    url: "https://www.facebook.com/groups/548265914943046/",
    searchHint: "LMR buy sell trade two way radio",
    postType: "radios",
  },
  {
    id: "fb-sc-ems",
    name: "South Carolina EMS (discussion)",
    focus: "local network",
    why: "Local SC EMS network — soft post / DM after reading rules (often discussion-first).",
    url: "https://www.facebook.com/groups/1442532629339933/",
    searchHint: "South Carolina EMS",
    postType: "local",
  },
];

/** Extra group names to find via Facebook search (IDs change; search is more reliable). */
export const FACEBOOK_GROUP_SEARCHES = [
  { query: "Fire EMS Buy Sell Trade", postType: "supplies+vehicles" },
  { query: "EMS Equipment For Sale", postType: "supplies" },
  { query: "Ambulance For Sale", postType: "vehicles" },
  { query: "Used Ambulances For Sale", postType: "vehicles" },
  { query: "Firefighter Buy Sell Trade", postType: "supplies" },
  { query: "Volunteer Fire Department Equipment", postType: "supplies" },
  { query: "AED Buy Sell Trade", postType: "supplies" },
  { query: "Motorola Radios Buy Sell Trade", postType: "radios" },
  { query: "Ham Radio Buy Sell Southeast", postType: "radios" },
  { query: "Columbia SC Buy Sell Trade", postType: "local" },
  { query: "Blythewood SC Marketplace", postType: "local" },
  { query: "Midlands SC Yard Sale / BST", postType: "local" },
  { query: "EMT Paramedic Students Buy Sell", postType: "supplies" },
  { query: "EMS Instructor / Training Equipment", postType: "supplies" },
];

export function facebookGroupSearchUrl(query) {
  return `https://www.facebook.com/search/groups/?q=${encodeURIComponent(query)}`;
}

export function fbGroupPostTemplates(siteUrl = "https://prince-george-transport.pages.dev") {
  return {
    vehicles: `FOR SALE — Fleet-retired Type II ambulances
Prince George Transport (Blythewood / Columbia, SC)

• Unit P-03, P-04, P-07 (Ford E-Series / McCoy Miller)
• Outdoor stored · sold AS-IS · local pickup only
• Call for price / walkthrough: (803) 231-9420

Photos + details: ${siteUrl}/supplies#vehicles
Licensed SC ambulance service · NPI 1922468909`,

    supplies: `EMS surplus for sale — stretchers, AEDs, suction, airway, pads & more
Retired from Prince George Transport fleet (Blythewood, SC)

• Used / sealed OEM gear — prices on site
• Great for volunteer FD, training programs, backup ambulances
• Local pickup · CONUS shipping on smaller items
• Call/text (803) 231-9420

Browse inventory: ${siteUrl}/supplies
(Expired sterile items clearly marked — training use only)`,

    radios: `Motorola VHF mobile radios — fleet retired from SC ambulance
Prince George Transport · Blythewood, SC

• CM200 / CM300 / CM200d kits (radio + mic + harness + bracket)
• Priced ~$155–$195 · reprogramming required
• Pickup or ship CONUS

Details/photos: ${siteUrl}/supplies#radios
Call/text (803) 231-9420`,

    highValue: `HOT EMS surplus — Blythewood, SC
• Laerdal LCSU 4 suction unit w/ case
• LIFEPAK 500 / CR Plus AEDs (as-is)
• Kendrick Traction Device
• In-date Physio pediatric pads

Full list + photos: ${siteUrl}/supplies
Call/text (803) 231-9420 · Prince George Transport`,
  };
}
