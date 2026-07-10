import { isAdmin } from "../../_lib/auth.js";
import { getInventory } from "../../_lib/inventory.js";
import { EMT_LEADS } from "../../_lib/emt-leads.js";
import { outreachEmailTemplate, fbListingText } from "../../_lib/marketplace.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) {
    return json({ error: "Unauthorized." }, 401);
  }

  const items = await getInventory(env);
  const leads = EMT_LEADS.map((lead) => ({
    ...lead,
    emailTemplate: outreachEmailTemplate(lead, items),
  }));

  const facebookPosts = items.map((item) => ({
    id: item.id,
    name: item.name,
    text: fbListingText(item),
  }));

  return json({
    leads,
    facebookPosts,
    marketplaceNote:
      "Facebook does not offer a public API for bulk Marketplace posting. " +
      "Download the CSV and use a bulk lister Chrome extension (e.g. AutoList, TheLazyPoster), " +
      "or copy each listing below manually. Post slowly (10–15/hr) to avoid account restrictions.",
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
