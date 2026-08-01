import { isAdmin } from "../../_lib/auth.js";
import { getInventory } from "../../_lib/inventory.js";
import { inventoryToEbayCsv, inventoryToEbayDraftsCsv } from "../../_lib/ebay-export.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const items = await getInventory(env);
  const siteUrl = env.SITE_URL || "https://prince-george-transport.pages.dev";
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "worksheet";

  if (format === "drafts") {
    const csv = inventoryToEbayDraftsCsv(items, siteUrl);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="pgt-ebay-CREATE-DRAFTS-upload.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = inventoryToEbayCsv(items, siteUrl);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pgt-ebay-listings.csv"',
      "Cache-Control": "no-store",
    },
  });
}
