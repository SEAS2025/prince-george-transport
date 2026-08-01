import { getCaptureImage } from "../../_lib/capture-queue.js";
import { getInventory } from "../../_lib/inventory.js";
import { getCaptureQueue } from "../../_lib/capture-queue.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params?.id;
  if (!id) return new Response("Not found", { status: 404 });

  const allowed = await isPublicCaptureImage(env, id);
  if (!allowed) return new Response("Not found", { status: 404 });

  const img = await getCaptureImage(env, id);
  if (!img) return new Response("Not found", { status: 404 });

  return new Response(img.bytes, {
    status: 200,
    headers: {
      "Content-Type": img.mimeType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function isPublicCaptureImage(env, id) {
  const items = await getInventory(env);
  if (
    items.some(
      (i) =>
        i.captureId === id ||
        i.imageUrl?.includes(id) ||
        (Array.isArray(i.extraImageUrls) && i.extraImageUrls.some((u) => u.includes(id)))
    )
  ) {
    return true;
  }
  const queue = await getCaptureQueue(env);
  return queue.some((q) => q.id === id && q.status === "approved");
}
