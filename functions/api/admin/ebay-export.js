import { isAdmin } from "../../_lib/auth.js";
import { getInventory } from "../../_lib/inventory.js";
import { absoluteImageUrls, isRestrictedItem } from "../../_lib/sales-policy.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const items = (await getInventory(env)).filter((i) => !isRestrictedItem(i));
  const header = [
    "id",
    "title",
    "ebay_title",
    "price",
    "quantity",
    "condition",
    "category",
    "ebay_category_id",
    "brand",
    "description",
    "image_urls",
    "ebay_listing_url",
  ];

  const rows = items.map((item) => [
    item.id,
    item.name,
    item.ebayTitle || item.name,
    item.price ?? "",
    item.quantity ?? 1,
    item.condition || "Used",
    item.category || "supplies",
    item.ebayCategoryId || "",
    item.brand || "",
    item.description || "",
    absoluteImageUrls(item).join(" | "),
    item.ebayListingUrl || "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pgt-ebay-worksheet.csv"',
    },
  });
}

function csvCell(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
