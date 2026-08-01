import { isAdmin } from "../../_lib/auth.js";
import { analyzeProductImage } from "../../_lib/product-ai.js";
import {
  newCaptureId,
  saveCaptureImage,
  upsertCaptureItem,
} from "../../_lib/capture-queue.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);

  let imageBytes;
  let mimeType = "image/jpeg";

  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    if (!body.imageBase64) return json({ error: "imageBase64 required" }, 400);
    mimeType = body.mimeType || "image/jpeg";
    imageBytes = base64ToArrayBuffer(body.imageBase64);
  } else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("image");
    if (!file || typeof file === "string") return json({ error: "image file required" }, 400);
    mimeType = file.type || "image/jpeg";
    imageBytes = await file.arrayBuffer();
  } else {
    return json({ error: "Send multipart image or JSON { imageBase64 }" }, 400);
  }

  if (!imageBytes || imageBytes.byteLength < 100) {
    return json({ error: "Image too small or invalid" }, 400);
  }

  if (imageBytes.byteLength > 4 * 1024 * 1024) {
    return json({ error: "Image must be under 4 MB" }, 400);
  }

  const id = newCaptureId();

  try {
    const analysis = await analyzeProductImage(env, imageBytes, mimeType);
    const imageUrl = await saveCaptureImage(env, id, imageBytes, mimeType);

    const item = await upsertCaptureItem(env, {
      id,
      status: "ready",
      ...analysis,
      imageUrl,
      ebayQueued: true,
    });

    return json({ ok: true, item });
  } catch (e) {
    return json({ error: e.message || "Capture failed" }, 500);
  }
}

function base64ToArrayBuffer(b64) {
  const raw = String(b64).replace(/^data:[^;]+;base64,/, "");
  const bin = atob(raw);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
