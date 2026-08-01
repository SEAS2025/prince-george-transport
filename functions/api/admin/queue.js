import { isAdmin } from "../../_lib/auth.js";
import { getCaptureQueue, upsertCaptureItem, removeCaptureItem } from "../../_lib/capture-queue.js";
import { getInventory, saveInventory, normalizeItem } from "../../_lib/inventory.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  if (request.method === "GET") {
    const queue = await getCaptureQueue(env);
    const pending = queue.filter((q) => q.status !== "approved" && q.status !== "rejected");
    const approved = queue.filter((q) => q.status === "approved");
    return json({ queue: pending, approved, total: queue.length });
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const action = body.action;
    const id = body.id;
    if (!id) return json({ error: "id required" }, 400);

    const queue = await getCaptureQueue(env);
    const item = queue.find((q) => q.id === id);
    if (!item) return json({ error: "Queue item not found" }, 404);

    if (action === "approve") {
      const merged = {
        ...item,
        ...body.item,
        status: "approved",
        ebayQueued: true,
      };

      const imageUrl = `/api/capture-image/${id}`;

      const inventoryItem = normalizeItem({
        id: body.inventoryId || `item-${id.replace("cap-", "")}`,
        name: merged.name,
        brand: merged.brand,
        condition: merged.condition,
        category: merged.category,
        price: merged.price,
        quantity: 1,
        serialNumber: merged.serialNumber,
        ebayTitle: merged.ebayTitle,
        ebayCategoryId: merged.ebayCategoryId,
        description: merged.description,
        imageUrl,
        ebayQueued: true,
        captureId: id,
      });

      if (!inventoryItem) return json({ error: "Invalid item data" }, 400);

      const items = await getInventory(env);
      const idx = items.findIndex((i) => i.id === inventoryItem.id);
      if (idx >= 0) items[idx] = inventoryItem;
      else items.unshift(inventoryItem);
      await saveInventory(env, items);

      await upsertCaptureItem(env, { ...merged, inventoryId: inventoryItem.id, imageUrl });

      return json({ ok: true, item: merged, inventoryItem, message: "Queued for eBay publish" });
    }

    if (action === "update") {
      const updated = await upsertCaptureItem(env, { ...item, ...body.item, id });
      return json({ ok: true, item: updated });
    }

    if (action === "reject") {
      await upsertCaptureItem(env, { ...item, status: "rejected" });
      return json({ ok: true });
    }

    if (action === "delete") {
      const remaining = await removeCaptureItem(env, id);
      return json({ ok: true, queue: remaining });
    }

    return json({ error: "Unknown action" }, 400);
  }

  return json({ error: "Method not allowed" }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
