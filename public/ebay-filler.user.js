// ==UserScript==
// @name         PGT eBay Listing Filler
// @namespace    https://prince-george-transport.pages.dev
// @version      1.1.0
// @description  Fills eBay listing forms from Prince George Transport inventory drafts
// @author       Prince George Transport
// @match        https://www.ebay.com/sl/*
// @match        https://www.ebay.com/lstng*
// @match        https://ebay.com/sl/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      prince-george-transport.pages.dev
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const DRAFT_URL = "https://prince-george-transport.pages.dev/api/ebay-filler-draft";
  const PANEL_ID = "pgt-ebay-filler-panel";

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setNativeValue(el, value) {
    if (!el) return false;
    const tag = el.tagName;
    const proto =
      tag === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    return true;
  }

  function visible(el) {
    if (!el) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && el.offsetParent !== null;
  }

  function allInputs(root = document) {
    return [...root.querySelectorAll("input, textarea, [contenteditable='true']")].filter(visible);
  }

  function scoreField(el, ...needles) {
    const blob = [
      el.getAttribute("aria-label"),
      el.getAttribute("placeholder"),
      el.getAttribute("name"),
      el.id,
      el.getAttribute("data-testid"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return needles.some((n) => blob.includes(n.toLowerCase())) ? 1 : 0;
  }

  function findField(...needles) {
    const candidates = allInputs();
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      const score = scoreField(el, ...needles);
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    }
    return best;
  }

  function findSuggestSearch() {
    return (
      findField("tell us what you're selling", "what you're selling") ||
      document.querySelector('input[placeholder*="selling" i]') ||
      allInputs().find((el) => el.type === "text" || el.type === "search")
    );
  }

  function clickButton(textRe) {
    const btn = [...document.querySelectorAll("button, a[role='button'], [role='button']")].find(
      (b) => textRe.test((b.textContent || b.getAttribute("aria-label") || "").trim()) && visible(b)
    );
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  }

  function selectCondition(conditionId, conditionLabel) {
    const id = String(conditionId || "3000");
    const radio = document.querySelector(`input[name="condition"][value="${id}"]`);
    if (radio) {
      radio.click();
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    const label = (conditionLabel || "Used").toLowerCase();
    const el = [...document.querySelectorAll("label, [role='radio'], div, span")].find((n) => {
      const t = (n.textContent || "").trim().toLowerCase();
      return t === label || t === "used" || t.startsWith(label);
    });
    if (el) {
      el.click();
      return true;
    }
    return false;
  }

  async function fillRichDescription(text) {
    const iframe = [...document.querySelectorAll("iframe")].find((f) => {
      try {
        const doc = f.contentDocument;
        return doc && doc.body && (doc.designMode === "on" || doc.body.isContentEditable);
      } catch {
        return false;
      }
    });
    if (iframe) {
      try {
        const body = iframe.contentDocument.body;
        body.focus();
        body.innerHTML = String(text)
          .split("\n")
          .map((l) => `<p>${l.replace(/</g, "&lt;")}</p>`)
          .join("");
        body.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      } catch {
        /* fall through */
      }
    }
    const area = findField("description", "item description");
    if (area) return setNativeValue(area, text);
    const editable = [...document.querySelectorAll("[contenteditable='true']")].find(visible);
    if (editable) {
      editable.focus();
      editable.textContent = text;
      editable.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return false;
  }

  async function applyDraft(draft) {
    if (!draft) return { ok: false, msg: "No draft loaded." };
    const report = [];

    // Step 1: prelist suggest search box
    if (/\/sl\/prelist\/suggest/i.test(location.pathname)) {
      const input = findSuggestSearch();
      if (input && setNativeValue(input, draft.title)) {
        report.push("Filled suggest title");
        await sleep(200);
        clickButton(/search/i) || input.form?.requestSubmit?.() || input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
        );
        report.push("Submitted search");
      }
    }

    // Step 2: identify / condition dialog
    if (/\/sl\/prelist\/identify/i.test(location.pathname) || document.body.innerText.includes("Select the condition")) {
      clickButton(/continue without match/i);
      await sleep(400);
      if (selectCondition(draft.conditionId, draft.condition)) report.push(`Condition → ${draft.condition || draft.conditionId}`);
      await sleep(200);
      clickButton(/continue to listing/i);
    }

    // Step 3: main listing form
    await sleep(500);
    const titleEl =
      findField("title", "item title", "listing title") ||
      [...allInputs()].find((el) => el.value && el.value.length < 5) ||
      null;
    // Prefer empty-ish title field labeled title
    const titleField = findField("title", "item title") || findSuggestSearch();
    if (titleField && setNativeValue(titleField, draft.title)) report.push("Title");

    if (draft.price != null) {
      const priceEl = findField("price", "buy it now", "bin price", "fixed price");
      if (priceEl && setNativeValue(priceEl, String(draft.price))) report.push(`Price $${draft.price}`);
    }

    if (draft.quantity != null) {
      const qtyEl = findField("quantity", "qty");
      if (qtyEl && setNativeValue(qtyEl, String(draft.quantity))) report.push(`Qty ${draft.quantity}`);
    }

    if (draft.brand) {
      const brandEl = findField("brand");
      if (brandEl && setNativeValue(brandEl, draft.brand)) report.push("Brand");
    }

    if (draft.description) {
      const ok = await fillRichDescription(draft.description);
      report.push(ok ? "Description" : "Description (manual paste needed)");
    }

    if (draft.images?.length) {
      try {
        await navigator.clipboard.writeText(draft.images.join("\n"));
        report.push(`Copied ${draft.images.length} image URL(s) to clipboard`);
      } catch {
        report.push("Image URLs listed in panel — paste/upload manually");
      }
    }

    return {
      ok: report.length > 0,
      msg: report.length ? report.join(" · ") : "No matching fields found — use panel copy buttons",
    };
  }

  function parseClipboard(text) {
    const t = String(text || "").trim();
    if (t.startsWith("PGT_EBAY::")) {
      try {
        return JSON.parse(t.slice("PGT_EBAY::".length));
      } catch {
        return null;
      }
    }
    if (t.startsWith("{") && t.includes('"title"')) {
      try {
        return JSON.parse(t);
      } catch {
        return null;
      }
    }
    return null;
  }

  function fetchDraft() {
    return new Promise((resolve) => {
      const gm = typeof GM !== "undefined" && GM.xmlHttpRequest ? GM.xmlHttpRequest : null;
      const legacy = typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : null;
      const xhr = gm || legacy;
      if (xhr) {
        xhr({
          method: "GET",
          url: DRAFT_URL,
          onload(res) {
            try {
              resolve(JSON.parse(res.responseText).draft || null);
            } catch {
              resolve(null);
            }
          },
          onerror() {
            resolve(null);
          },
        });
        return;
      }
      fetch(DRAFT_URL)
        .then((r) => r.json())
        .then((d) => resolve(d.draft || null))
        .catch(() => resolve(null));
    });
  }

  function ensurePanel() {
    if (document.getElementById(PANEL_ID)) return;
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <style>
        #${PANEL_ID}{
          position:fixed;bottom:16px;right:16px;z-index:2147483646;
          width:min(360px,calc(100vw - 24px));background:#0b1f33;color:#f4f7fb;
          font:13px/1.4 system-ui,Segoe UI,sans-serif;border-radius:12px;
          box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;
          border:1px solid #e53238;
        }
        #${PANEL_ID} header{display:flex;align-items:center;justify-content:space-between;
          padding:10px 12px;background:#e53238;font-weight:700}
        #${PANEL_ID} .body{padding:12px;max-height:50vh;overflow:auto}
        #${PANEL_ID} .muted{opacity:.75;font-size:12px;margin:0 0 8px}
        #${PANEL_ID} .title{font-weight:600;margin:0 0 8px}
        #${PANEL_ID} .row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
        #${PANEL_ID} button{
          border:0;border-radius:8px;padding:8px 10px;cursor:pointer;
          background:#1e3a5f;color:#fff;font-weight:600
        }
        #${PANEL_ID} button.primary{background:#fff;color:#0b1f33}
        #${PANEL_ID} button:disabled{opacity:.5;cursor:wait}
        #${PANEL_ID} .status{margin-top:8px;font-size:12px;min-height:1.2em}
        #${PANEL_ID} .imgs{font-size:11px;word-break:break-all;opacity:.85;margin-top:6px}
      </style>
      <header>
        <span>PGT eBay Filler</span>
        <button type="button" data-act="close" style="background:transparent;padding:0 4px">✕</button>
      </header>
      <div class="body">
        <p class="muted">Load a draft from Admin, then Fill. Photos still need manual upload.</p>
        <p class="title" data-field="title">No draft loaded</p>
        <p class="muted" data-field="meta"></p>
        <div class="row">
          <button type="button" class="primary" data-act="fill">Fill form</button>
          <button type="button" data-act="load">Load draft</button>
          <button type="button" data-act="clip">From clipboard</button>
        </div>
        <div class="row">
          <button type="button" data-act="copy-title">Copy title</button>
          <button type="button" data-act="copy-desc">Copy description</button>
          <button type="button" data-act="copy-price">Copy price</button>
          <button type="button" data-act="copy-imgs">Copy image URLs</button>
        </div>
        <p class="status" data-field="status"></p>
        <div class="imgs" data-field="imgs"></div>
      </div>
    `;
    document.documentElement.appendChild(panel);

    let draft = null;

    const setStatus = (msg) => {
      panel.querySelector('[data-field="status"]').textContent = msg || "";
    };

    const render = () => {
      panel.querySelector('[data-field="title"]').textContent = draft?.title || "No draft loaded";
      panel.querySelector('[data-field="meta"]').textContent = draft
        ? `$${draft.price ?? "?"} · qty ${draft.quantity ?? 1} · ${draft.condition || "Used"} · ${draft.id || ""}`
        : "Arm a draft in Admin → Marketing → eBay Form Filler";
      panel.querySelector('[data-field="imgs"]').textContent = draft?.images?.length
        ? draft.images.join("\n")
        : "";
    };

    const copy = async (text, label) => {
      try {
        await navigator.clipboard.writeText(String(text ?? ""));
        setStatus(`Copied ${label}`);
      } catch {
        setStatus(`Could not copy ${label}`);
      }
    };

    panel.addEventListener("click", async (e) => {
      const act = e.target?.closest?.("[data-act]")?.dataset?.act;
      if (!act) return;
      if (act === "close") {
        panel.remove();
        return;
      }
      if (act === "load") {
        setStatus("Loading…");
        draft = await fetchDraft();
        render();
        setStatus(draft ? `Loaded ${draft.id}` : "No armed draft — click List on eBay in Admin first");
        return;
      }
      if (act === "clip") {
        try {
          const text = await navigator.clipboard.readText();
          draft = parseClipboard(text);
          render();
          setStatus(draft ? `Clipboard draft ${draft.id}` : "Clipboard is not a PGT_EBAY draft");
        } catch {
          setStatus("Clipboard read blocked — allow permission or use Load draft");
        }
        return;
      }
      if (act === "fill") {
        if (!draft) draft = await fetchDraft();
        if (!draft) {
          try {
            draft = parseClipboard(await navigator.clipboard.readText());
          } catch {
            /* ignore */
          }
        }
        render();
        if (!draft) {
          setStatus("No draft available");
          return;
        }
        setStatus("Filling…");
        const result = await applyDraft(draft);
        setStatus(result.msg);
        return;
      }
      if (!draft) {
        setStatus("Load a draft first");
        return;
      }
      if (act === "copy-title") return copy(draft.title, "title");
      if (act === "copy-desc") return copy(draft.description, "description");
      if (act === "copy-price") return copy(draft.price, "price");
      if (act === "copy-imgs") return copy((draft.images || []).join("\n"), "image URLs");
    });

    // Auto-load draft once on listing pages
    fetchDraft().then((d) => {
      if (d) {
        draft = d;
        render();
        setStatus(`Draft ready: ${d.id}`);
      } else {
        render();
      }
    });
  }

  ensurePanel();
})();
