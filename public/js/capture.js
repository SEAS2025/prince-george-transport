// Mobile product capture — PIN login, camera, AI queue for eBay

const PGT_CAPTURE = {
  currentItem: null,
  previewBlob: null,
  queue: [],

  async fetchJson(url, opts = {}) {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...opts.headers },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  show(panel) {
    document.querySelectorAll("[data-panel]").forEach((el) => {
      el.hidden = el.dataset.panel !== panel;
    });
    document.getElementById("logout-btn").hidden = panel !== "app";
  },

  async init() {
    document.getElementById("pin-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.login(e.target);
    });
    document.getElementById("logout-btn")?.addEventListener("click", () => this.logout());

    document.querySelectorAll(".capture-tab").forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    const cameraInput = document.getElementById("camera-input");
    cameraInput?.addEventListener("change", (e) => this.onPhotoSelected(e.target.files?.[0]));

    document.getElementById("upload-btn")?.addEventListener("click", () => this.uploadAndAnalyze());
    document.getElementById("approve-btn")?.addEventListener("click", () => this.approveItem());
    document.getElementById("discard-btn")?.addEventListener("click", () => this.discardResult());

    try {
      const { authed } = await this.fetchJson("/api/admin/session");
      if (authed) {
        this.show("app");
        await this.loadQueue();
      } else {
        this.show("login");
      }
    } catch {
      this.show("login");
    }
  },

  async login(form) {
    const msg = document.getElementById("login-msg");
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    if (msg) { msg.className = "form-msg"; msg.textContent = ""; }

    try {
      await this.fetchJson("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ pin: form.pin.value }),
      });
      form.reset();
      this.show("app");
      await this.loadQueue();
    } catch (e) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = e.message; }
    } finally {
      btn.disabled = false;
    }
  },

  async logout() {
    await this.fetchJson("/api/admin/logout", { method: "POST" }).catch(() => {});
    this.currentItem = null;
    this.show("login");
  },

  switchTab(name) {
    document.querySelectorAll(".capture-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === name);
    });
    document.querySelectorAll("[data-tab-panel]").forEach((p) => {
      p.hidden = p.dataset.tabPanel !== name;
    });
    if (name === "queue") this.loadQueue();
  },

  async onPhotoSelected(file) {
    if (!file) return;
    const msg = document.getElementById("scan-msg");
    const preview = document.getElementById("preview-wrap");
    const previewImg = document.getElementById("preview-img");
    const uploadBtn = document.getElementById("upload-btn");

    try {
      this.previewBlob = await this.compressImage(file, 1400, 0.82);
      previewImg.src = URL.createObjectURL(this.previewBlob);
      preview.hidden = false;
      uploadBtn.hidden = false;
      uploadBtn.disabled = false;
      if (msg) { msg.className = "form-msg"; msg.textContent = ""; }
      document.getElementById("result-card").hidden = true;
    } catch (e) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = e.message; }
    }
  },

  compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = url;
    });
  },

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  async uploadAndAnalyze() {
    if (!this.previewBlob) return;
    const btn = document.getElementById("upload-btn");
    const msg = document.getElementById("scan-msg");
    btn.disabled = true;
    if (msg) { msg.className = "form-msg"; msg.textContent = "Identifying product… (may take up to 30s)"; msg.style.display = "block"; }

    try {
      const imageBase64 = await this.blobToBase64(this.previewBlob);
      const { item } = await this.fetchJson("/api/admin/capture", {
        method: "POST",
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });
      this.currentItem = item;
      this.showResult(item);
      if (msg) { msg.className = "form-msg ok"; msg.textContent = "Identified! Review below, then approve."; }
      await this.loadQueue();
    } catch (e) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = e.message; }
    } finally {
      btn.disabled = false;
    }
  },

  showResult(item) {
    const card = document.getElementById("result-card");
    card.hidden = false;
    document.getElementById("result-confidence").textContent = `AI: ${item.confidence || "medium"} (${item.aiSource || "auto"})`;
    document.getElementById("result-category").textContent = item.category === "radios" ? "Radio" : "Supplies";
    document.getElementById("result-img").src = item.imageUrl;
    document.getElementById("edit-name").value = item.name || "";
    document.getElementById("edit-category").value = item.category || "supplies";
    document.getElementById("edit-brand").value = item.brand || "";
    document.getElementById("edit-model").value = item.model || "";
    document.getElementById("edit-serial").value = item.serialNumber || "";
    document.getElementById("edit-price").value = item.price ?? "";
    document.getElementById("edit-ebay-title").value = item.ebayTitle || "";
    document.getElementById("edit-description").value = item.description || "";
    card.scrollIntoView({ behavior: "smooth" });
  },

  getEditedItem() {
    if (!this.currentItem) return null;
    return {
      ...this.currentItem,
      name: document.getElementById("edit-name").value.trim(),
      category: document.getElementById("edit-category").value,
      brand: document.getElementById("edit-brand").value.trim(),
      model: document.getElementById("edit-model").value.trim(),
      serialNumber: document.getElementById("edit-serial").value.trim(),
      price: document.getElementById("edit-price").value === "" ? null : Number(document.getElementById("edit-price").value),
      ebayTitle: document.getElementById("edit-ebay-title").value.trim(),
      description: document.getElementById("edit-description").value.trim(),
      ebayCategoryId: document.getElementById("edit-category").value === "radios" ? "46539" : "117042",
    };
  },

  async approveItem() {
    const item = this.getEditedItem();
    if (!item?.name) return alert("Name is required.");
    const btn = document.getElementById("approve-btn");
    const msg = document.getElementById("approve-msg");
    btn.disabled = true;

    try {
      await this.fetchJson("/api/admin/queue", {
        method: "POST",
        body: JSON.stringify({ action: "update", id: item.id, item }),
      });
      const result = await this.fetchJson("/api/admin/queue", {
        method: "POST",
        body: JSON.stringify({ action: "approve", id: item.id, item }),
      });
      if (msg) { msg.className = "form-msg ok"; msg.textContent = "Queued for eBay! Visible on supplies page."; }
      this.discardResult();
      await this.loadQueue();
      this.switchTab("queue");
    } catch (e) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = e.message; }
    } finally {
      btn.disabled = false;
    }
  },

  discardResult() {
    this.currentItem = null;
    this.previewBlob = null;
    document.getElementById("result-card").hidden = true;
    document.getElementById("preview-wrap").hidden = true;
    document.getElementById("upload-btn").hidden = true;
    document.getElementById("camera-input").value = "";
    const msg = document.getElementById("scan-msg");
    if (msg) { msg.className = "form-msg"; msg.textContent = ""; msg.style.display = "none"; }
  },

  async loadQueue() {
    try {
      const data = await this.fetchJson("/api/admin/queue");
      this.queue = data.queue || [];
      const badge = document.getElementById("queue-count");
      if (badge) badge.textContent = String(this.queue.length);
      this.renderQueue(data);
    } catch {
      /* ignore */
    }
  },

  renderQueue(data) {
    const list = document.getElementById("queue-list");
    if (!list) return;
    const items = [...(data.queue || []), ...(data.approved || [])];
    if (!items.length) {
      list.innerHTML = `<p class="admin-muted">No items in queue. Scan a label to get started.</p>`;
      return;
    }

    list.innerHTML = items.map((item) => `
      <div class="capture-queue-item card">
        ${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="" class="capture-queue-thumb">` : ""}
        <div>
          <strong>${esc(item.name)}</strong>
          <div class="admin-item-meta">${esc(item.status)} · ${esc(item.category)} · ${item.price != null ? "$" + item.price : "no price"} · ${esc(item.confidence)} confidence</div>
          ${item.status === "approved" ? `<span class="capture-queued-badge">Queued for eBay</span>` : `<button type="button" class="btn btn-dark btn-sm" data-quick-approve="${esc(item.id)}">Quick Approve</button>`}
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-quick-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.quickApprove;
        const item = items.find((i) => i.id === id);
        if (!item) return;
        this.currentItem = item;
        try {
          await this.fetchJson("/api/admin/queue", {
            method: "POST",
            body: JSON.stringify({ action: "approve", id: item.id, item }),
          });
          await this.loadQueue();
        } catch (e) {
          alert(e.message);
        }
      });
    });
  },
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => PGT_CAPTURE.init());
