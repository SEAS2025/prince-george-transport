import { getInventory } from "../_lib/inventory.js";
import { getEbayListings } from "../_lib/ebay-store.js";

export async function getPublicInventory(env) {
  const items = await getInventory(env);
  const ebayMap = await getEbayListings(env);
  return items.map((item) => ({
    ...item,
    ebayListingUrl: item.ebayListingUrl || ebayMap[item.id]?.listingUrl || "",
  }));
}
