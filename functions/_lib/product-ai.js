// AI product identification from label photos.
// Priority: OpenAI vision → Cursor Cloud Agents API → Cloudflare Workers AI.

const CURSOR_POLL_MS = 1500;
const CURSOR_TIMEOUT_MS = 28000;

const ANALYSIS_PROMPT = `You are cataloging used ambulance/EMS fleet equipment for resale on eBay.

Analyze this product label photo. Extract every visible identifier (brand, model, serial, part numbers, FCC ID, etc.).

Return ONLY valid JSON (no markdown):
{
  "category": "radios" or "supplies",
  "name": "short product title for inventory",
  "brand": "manufacturer or empty string",
  "model": "model number or empty string",
  "serialNumber": "serial if visible or empty string",
  "condition": "Used",
  "description": "2-3 paragraph eBay-ready description. Include specs from label, fleet-retired from SC ambulance service, sold as-is, kit contents if inferable, reprogramming note for radios.",
  "suggestedPrice": number in USD based on typical used eBay prices for this item,
  "ebayTitle": "max 80 char eBay search title",
  "ebayCategoryId": "46539 for two-way radios, 117042 for medical supplies",
  "confidence": "high" or "medium" or "low"
}

Category rules:
- Motorola/Kenwood/Icom mobile or portable radios -> "radios", ebayCategoryId "46539"
- Stretchers, O2, AED, suction, chairs, backboards -> "supplies", ebayCategoryId "117042"`;

export async function analyzeProductImage(env, imageBytes, mimeType = "image/jpeg") {
  const errors = [];

  if (env.OPENAI_API_KEY) {
    try {
      return await analyzeWithOpenAI(env, imageBytes, mimeType);
    } catch (e) {
      errors.push(`openai: ${e.message}`);
      console.error("OpenAI vision failed:", e.message);
    }
  }

  if (env.CURSOR_API_KEY) {
    try {
      return await analyzeWithCursor(env, imageBytes, mimeType);
    } catch (e) {
      errors.push(`cursor: ${e.message}`);
      console.error("Cursor vision failed:", e.message);
    }
  }

  if (env.AI) {
    try {
      return await analyzeWithWorkersAI(env, imageBytes);
    } catch (e) {
      errors.push(`workers-ai: ${e.message}`);
      console.error("Workers AI failed:", e.message);
    }
  } else {
    errors.push("workers-ai: AI binding not available");
  }

  return fallbackAnalysis(
    errors.length ? errors.join("; ") : "Set OPENAI_API_KEY or CURSOR_API_KEY for best results",
    "fallback"
  );
}

async function analyzeWithCursor(env, imageBytes, mimeType) {
  const b64 = arrayBufferToBase64(imageBytes);
  const auth = cursorAuthHeader(env.CURSOR_API_KEY);

  const body = {
    name: "PGT label scan",
    prompt: {
      text: ANALYSIS_PROMPT + "\n\nRespond with JSON only, no markdown fences.",
      images: [{ data: b64, mimeType }],
    },
  };
  if (env.CURSOR_VISION_MODEL) {
    body.model = { id: env.CURSOR_VISION_MODEL };
  }

  const createRes = await fetch("https://api.cursor.com/v1/agents", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(createData.message || createData.error || `Cursor create ${createRes.status}`);
  }

  const agentId = createData.agent?.id;
  const runId = createData.run?.id;
  if (!agentId || !runId) throw new Error("Cursor did not return agent/run ids");

  const deadline = Date.now() + CURSOR_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(CURSOR_POLL_MS);
    const runRes = await fetch(`https://api.cursor.com/v1/agents/${agentId}/runs/${runId}`, {
      headers: { Authorization: auth },
    });
    const runData = await runRes.json().catch(() => ({}));
    if (!runRes.ok) {
      throw new Error(runData.message || runData.error || `Cursor run ${runRes.status}`);
    }

    const status = String(runData.status || "").toUpperCase();
    if (status === "FINISHED") {
      const text = runData.result || "";
      return parseAiJson(text, "cursor");
    }
    if (["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(status)) {
      throw new Error(`Cursor run ${status}`);
    }
  }

  throw new Error("Cursor analysis timed out (28s)");
}

function cursorAuthHeader(apiKey) {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function analyzeWithOpenAI(env, imageBytes, mimeType) {
  const b64 = arrayBufferToBase64(imageBytes);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ANALYSIS_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
          ],
        },
      ],
      max_tokens: 1200,
      temperature: 0.2,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI ${res.status}`);
  }

  const text = data.choices?.[0]?.message?.content || "";
  return parseAiJson(text, "openai");
}

async function analyzeWithWorkersAI(env, imageBytes) {
  const arr = [...new Uint8Array(imageBytes)];

  const models = [
    "@cf/meta/llama-3.2-11b-vision-instruct",
    "@cf/llava-hf/llava-1.5-7b-hw",
  ];

  let lastError = "";
  for (const model of models) {
    try {
      const response = await env.AI.run(model, {
        messages: [
          {
            role: "user",
            content: [
              { type: "image", image: arr },
              { type: "text", text: ANALYSIS_PROMPT + "\n\nRespond with JSON only." },
            ],
          },
        ],
        prompt: ANALYSIS_PROMPT + "\n\nRespond with JSON only.",
        image: arr,
      });

      const text =
        response?.response ||
        response?.description ||
        (typeof response === "string" ? response : JSON.stringify(response));
      return parseAiJson(text, `workers-ai:${model.split("/").pop()}`);
    } catch (e) {
      lastError = `${model}: ${e.message}`;
      console.error("Workers AI model failed:", lastError);
    }
  }

  throw new Error(lastError || "Workers AI failed");
}

function parseAiJson(text, source) {
  const raw = String(text || "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return fallbackAnalysis("Could not parse AI response", source);

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return fallbackAnalysis("Invalid JSON from AI", source);
  }

  const category = parsed.category === "radios" ? "radios" : "supplies";
  const price = Number(parsed.suggestedPrice ?? parsed.price);
  const ebayCategoryId = String(parsed.ebayCategoryId || (category === "radios" ? "46539" : "117042"));

  return {
    category,
    name: String(parsed.name || "Fleet Equipment Item").slice(0, 120),
    brand: String(parsed.brand || "").trim(),
    model: String(parsed.model || "").trim(),
    serialNumber: String(parsed.serialNumber || "").trim(),
    condition: String(parsed.condition || "Used"),
    description: String(parsed.description || "").trim(),
    price: Number.isFinite(price) && price > 0 ? Math.round(price) : null,
    ebayTitle: String(parsed.ebayTitle || parsed.name || "").slice(0, 80),
    ebayCategoryId,
    confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium",
    aiSource: source,
  };
}

function fallbackAnalysis(note, source = "fallback") {
  return {
    category: "supplies",
    name: "Equipment Item (needs review)",
    brand: "",
    model: "",
    serialNumber: "",
    condition: "Used",
    description: `Fleet-retired equipment from Prince George Transport (licensed SC ambulance service).\n\n${note}\n\nEdit this listing before approving.`,
    price: null,
    ebayTitle: "Used Ambulance Fleet Equipment",
    ebayCategoryId: "117042",
    confidence: "low",
    aiSource: source,
  };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
