import { readFileSync } from "node:fs";
import { filterSellableItems, salesRestrictionReason } from "../functions/_lib/sales-policy.js";

const items = JSON.parse(readFileSync(new URL("./inventory-kv.json", import.meta.url), "utf8"));
const { sellable, removed } = filterSellableItems(items);

console.log(`Sellable: ${sellable.length}`);
console.log(`Would remove: ${removed.length}`);
for (const r of removed) {
  console.log(` - ${r.id}: ${r.reason}`);
}

const leftover = items.filter((i) => salesRestrictionReason(i));
if (leftover.length) {
  console.error("ERROR: scripts/inventory-kv.json still contains restricted items");
  process.exit(1);
}
console.log("scripts/inventory-kv.json is clean.");
