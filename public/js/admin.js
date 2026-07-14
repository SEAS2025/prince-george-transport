// Admin inventory manager — PIN protected

const PGT_ADMIN = {
  items: [],
  editingId: null,

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

  show(id) {
    document.querySelectorAll("[data-panel]").forEach((el) => {
      el.hidden = el.dataset.panel !== id;
    });
    const logout = document.getElementById("logout-btn");
    if (logout) logout.hidden = id !== "dashboard";
  },

  async init() {
    const loginForm = document.getElementById("pin-form");
    loginForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.login(loginForm);
    });

    document.getElementById("logout-btn")?.addEventListener("click", () => this.logout());
    document.getElementById("item-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveItem();
    });
    document.getElementById("cancel-edit")?.addEventListener("click", () => this.resetForm());

    document.querySelectorAll(".admin-tab").forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });
    document.getElementById("copy-all-fb")?.addEventListener("click", () => this.copyAllFacebook());
    document.getElementById("ebay-connect")?.addEventListener("click", () => this.connectEbay());
    document.getElementById("ebay-publish-all")?.addEventListener("click", () => this.publishAllEbay());
    document.getElementById("ebay-publish-radios")?.addEventListener("click", () => this.publishRadiosEbay());
    document.getElementById("ebay-disconnect")?.addEventListener("click", () => this.disconnectEbay());
    document.getElementById("ebay-filler-refresh")?.addEventListener("click", () => this.loadEbayFillerQueue());

    this.handleEbayRedirect();

    try {
      const { authed } = await this.fetchJson("/api/admin/session");
      if (authed) {
        this.show("dashboard");
        await this.loadItems();
        await this.loadMarketing();
        await this.loadEbay();
        await this.loadEbayFillerQueue();
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
      this.show("dashboard");
      await this.loadItems();
      await this.loadMarketing();
      await this.loadEbay();
      await this.loadEbayFillerQueue();
    } catch (e) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = e.message; }
    } finally {
      btn.disabled = false;
    }
  },

  async logout() {
    await this.fetchJson("/api/admin/logout", { method: "POST" }).catch(() => {});
    this.items = [];
    this.resetForm();
    this.show("login");
  },

  async loadItems() {
    const list = document.getElementById("item-list");
    if (list) list.innerHTML = `<p class="admin-muted">Loading…</p>`;
    try {
      const { items } = await this.fetchJson("/api/admin/inventory");
      this.items = items;
      this.renderList();
    } catch (e) {
      if (list) list.innerHTML = `<p class="form-msg err" style="display:block">${e.message}</p>`;
    }
  },

  renderList() {
    const list = document.getElementById("item-list");
    if (!list) return;

    if (!this.items.length) {
      list.innerHTML = `<p class="admin-muted">No items yet. Add your first listing below.</p>`;
      return;
    }

    list.innerHTML = this.items.map((item) => `
      <div class="admin-item" data-id="${item.id}">
        <div class="admin-item-main">
          <strong>${esc(item.name)}</strong>
          <span class="admin-item-meta">${esc(item.condition)} · ${item.category}${item.quantity > 1 ? ` · qty ${item.quantity}` : ""} · ${formatPrice(item.price)}${item.imageUrl ? " · 📷" : ""}${item.ebayListingUrl ? " · eBay ✓" : ""}</span>
          ${item.ebayListingUrl ? `<p class="admin-item-desc"><a href="${esc(item.ebayListingUrl)}" target="_blank" rel="noopener">Buy on eBay</a></p>` : ""}
          ${item.description ? `<p class="admin-item-desc">${esc(item.description)}</p>` : ""}
        </div>
        <div class="admin-item-actions">
          <button type="button" class="btn btn-outline btn-sm" data-edit="${item.id}">Edit</button>
          <button type="button" class="btn btn-dark btn-sm" data-ebay="${item.id}" title="Publish to eBay">eBay</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete="${item.id}">Delete</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => this.startEdit(btn.dataset.edit));
    });
    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => this.deleteItem(btn.dataset.delete));
    });
    list.querySelectorAll("[data-ebay]").forEach((btn) => {
      btn.addEventListener("click", () => this.publishEbayItem(btn.dataset.ebay, btn));
    });
  },

  startEdit(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    this.editingId = id;
    const form = document.getElementById("item-form");
    form.name.value = item.name;
    form.condition.value = item.condition;
    form.category.value = item.category || "supplies";
    form.price.value = item.price ?? "";
    form.description.value = item.description || "";
    form.imageUrl.value = item.imageUrl || "";
    form.ebayListingUrl.value = item.ebayListingUrl || "";
    document.getElementById("form-title").textContent = "Edit Item";
    document.getElementById("save-btn").textContent = "Update Item";
    document.getElementById("cancel-edit").hidden = false;
    form.scrollIntoView({ behavior: "smooth" });
  },

  resetForm() {
    this.editingId = null;
    const form = document.getElementById("item-form");
    form?.reset();
    document.getElementById("form-title").textContent = "Add Item";
    document.getElementById("save-btn").textContent = "Add to Inventory";
    document.getElementById("cancel-edit").hidden = true;
    document.getElementById("save-msg").className = "form-msg";
    document.getElementById("save-msg").textContent = "";
  },

  async saveItem() {
    const form = document.getElementById("item-form");
    const msg = document.getElementById("save-msg");
    const btn = document.getElementById("save-btn");

    const payload = {
      id: this.editingId || undefined,
      name: form.name.value.trim(),
      condition: form.condition.value,
      category: form.category.value,
      price: form.price.value === "" ? null : Number(form.price.value),
      description: form.description.value.trim(),
      imageUrl: form.imageUrl.value.trim(),
      ebayListingUrl: form.ebayListingUrl.value.trim(),
    };

    if (!payload.name) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = "Name is required."; }
      return;
    }

    btn.disabled = true;
    if (msg) { msg.className = "form-msg"; msg.textContent = ""; }

    try {
      const { items } = await this.fetchJson("/api/admin/inventory", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      this.items = items;
      this.renderList();
      this.resetForm();
      if (msg) { msg.className = "form-msg ok"; msg.textContent = "Saved! Item is live on the supplies page."; }
    } catch (e) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = e.message; }
    } finally {
      btn.disabled = false;
    }
  },

  switchTab(name) {
    document.querySelectorAll(".admin-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === name);
    });
    document.querySelectorAll("[data-tab-panel]").forEach((p) => {
      p.hidden = p.dataset.tabPanel !== name;
    });
    if (name === "marketing") this.loadEbayFillerQueue();
  },

  async loadEbayFillerQueue() {
    const statusEl = document.getElementById("ebay-filler-status");
    const listEl = document.getElementById("ebay-filler-queue");
    if (!listEl) return;

    try {
      const data = await this.fetchJson("/api/admin/ebay-draft");
      this.ebayFillerQueue = data.queue || [];
      if (statusEl) {
        statusEl.textContent = data.count
          ? `${data.count} priced item(s) ready to list (vehicles and already-linked eBay URLs skipped).`
          : "No items in the filler queue — add prices, or clear ebay listing URLs for items you still need to post.";
      }
      listEl.innerHTML = (data.queue || [])
        .map(
          (d) => `
        <div class="admin-fb-item" data-draft-id="${esc(d.id)}">
          <strong>${esc(d.title)}</strong>
          <span class="admin-item-meta">$${esc(d.price)} · qty ${esc(d.quantity)} · ${esc(d.condition)} · cat ${esc(d.categoryId)}</span>
          <div class="admin-form-actions" style="margin-top:0.6rem">
            <button type="button" class="btn btn-primary btn-sm" data-ebay-list="${esc(d.id)}">List on eBay</button>
            <button type="button" class="btn btn-outline btn-sm" data-ebay-prelist="${esc(d.id)}">Open suggest step</button>
            <button type="button" class="btn btn-outline btn-sm" data-ebay-copy="${esc(d.id)}">Copy draft</button>
            <button type="button" class="btn btn-outline btn-sm" data-ebay-copy-title="${esc(d.id)}">Copy title</button>
          </div>
        </div>`
        )
        .join("");

      listEl.querySelectorAll("[data-ebay-list]").forEach((btn) => {
        btn.addEventListener("click", () => this.startEbayFill(btn.dataset.ebayList, "list"));
      });
      listEl.querySelectorAll("[data-ebay-prelist]").forEach((btn) => {
        btn.addEventListener("click", () => this.startEbayFill(btn.dataset.ebayPrelist, "prelist"));
      });
      listEl.querySelectorAll("[data-ebay-copy]").forEach((btn) => {
        btn.addEventListener("click", () => this.copyEbayDraft(btn.dataset.ebayCopy));
      });
      listEl.querySelectorAll("[data-ebay-copy-title]").forEach((btn) => {
        btn.addEventListener("click", () => this.copyEbayDraftField(btn.dataset.ebayCopyTitle, "title"));
      });
    } catch (e) {
      if (statusEl) statusEl.textContent = `Filler queue error: ${e.message}`;
    }
  },

  getEbayDraft(id) {
    return (this.ebayFillerQueue || []).find((d) => d.id === id) || null;
  },

  async startEbayFill(itemId, mode = "list") {
    const draft = this.getEbayDraft(itemId);
    if (!draft) return alert("Draft not found — refresh the queue.");

    try {
      await this.fetchJson("/api/admin/ebay-draft", {
        method: "POST",
        body: JSON.stringify({ itemId }),
      });
    } catch (e) {
      console.warn("Could not arm remote draft:", e);
    }

    try {
      await navigator.clipboard.writeText(`PGT_EBAY::${JSON.stringify(draft)}`);
    } catch {
      /* userscript can still Load draft from API */
    }

    const url = mode === "prelist" ? draft.prelistUrl : draft.listUrl;
    window.open(url, "_blank", "noopener");
  },

  async copyEbayDraft(itemId) {
    const draft = this.getEbayDraft(itemId);
    if (!draft) return;
    try {
      await this.fetchJson("/api/admin/ebay-draft", {
        method: "POST",
        body: JSON.stringify({ itemId }),
      });
      await navigator.clipboard.writeText(`PGT_EBAY::${JSON.stringify(draft)}`);
      alert("Draft copied. On eBay, open the PGT panel → From clipboard (or Load draft).");
    } catch (e) {
      alert(e.message);
    }
  },

  async copyEbayDraftField(itemId, field) {
    const draft = this.getEbayDraft(itemId);
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(String(draft[field] ?? ""));
    } catch (e) {
      alert(e.message);
    }
  },

  async loadMarketing() {
    const fbNote = document.getElementById("fb-note");
    const fbPosts = document.getElementById("fb-posts");
    const fbGroups = document.getElementById("fb-groups");
    const fbGroupPosts = document.getElementById("fb-group-posts");
    const fbGroupSearches = document.getElementById("fb-group-searches");
    const leadsEl = document.getElementById("emt-leads");
    if (!fbPosts && !leadsEl && !fbGroups) return;

    try {
      const data = await this.fetchJson("/api/admin/marketing");
      this.marketing = data;

      if (fbNote) fbNote.textContent = data.marketplaceNote;

      if (fbGroupPosts && data.facebookGroupPosts) {
        const labels = {
          vehicles: "Vehicles post",
          supplies: "Supplies post",
          radios: "Radios post",
          highValue: "High-value gear post",
        };
        fbGroupPosts.innerHTML = Object.entries(data.facebookGroupPosts).map(([key, text]) => `
          <div class="admin-fb-item">
            <strong>${esc(labels[key] || key)}</strong>
            <pre>${esc(text)}</pre>
            <button type="button" class="btn btn-outline btn-sm" data-copy-group-post="${esc(key)}">Copy post</button>
          </div>
        `).join("");
        fbGroupPosts.querySelectorAll("[data-copy-group-post]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const text = data.facebookGroupPosts[btn.dataset.copyGroupPost];
            if (text) this.copyText(text, btn);
          });
        });
      }

      if (fbGroups) {
        fbGroups.innerHTML = (data.facebookGroups || []).map((g) => {
          const searchUrl = "https://www.facebook.com/search/groups/?q=" + encodeURIComponent(g.searchHint || g.name);
          return `
          <div class="admin-fb-item">
            <strong>${esc(g.name)}</strong>
            <div class="admin-item-meta">${esc(g.focus)} · ${esc(g.postType)}</div>
            <p class="admin-item-desc">${esc(g.why)}</p>
            <div class="admin-form-actions" style="margin-top:0.5rem">
              <a class="btn btn-primary btn-sm" href="${esc(g.url)}" target="_blank" rel="noopener">Open group</a>
              <a class="btn btn-outline btn-sm" href="${esc(searchUrl)}" target="_blank" rel="noopener">Search if link moved</a>
            </div>
          </div>`;
        }).join("");
      }

      if (fbGroupSearches) {
        fbGroupSearches.innerHTML = (data.facebookGroupSearches || []).map((s) => `
          <div class="admin-fb-item">
            <strong>${esc(s.query)}</strong>
            <span class="admin-item-meta">${esc(s.postType)}</span>
            <a class="btn btn-outline btn-sm" href="${esc(s.url)}" target="_blank" rel="noopener">Search on Facebook</a>
          </div>
        `).join("");
      }

      if (fbPosts) {
        fbPosts.innerHTML = (data.facebookPosts || []).map((p) => `
          <div class="admin-fb-item">
            <strong>${esc(p.name)}</strong>
            <pre>${esc(p.text)}</pre>
            <button type="button" class="btn btn-outline btn-sm" data-copy-fb="${p.id}">Copy</button>
          </div>
        `).join("");

        fbPosts.querySelectorAll("[data-copy-fb]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const post = data.facebookPosts.find((x) => x.id === btn.dataset.copyFb);
            if (post) this.copyText(post.text, btn);
          });
        });
      }

      if (leadsEl) {
        leadsEl.innerHTML = (data.leads || []).map((lead) => `
          <div class="admin-lead">
            <h3>${esc(lead.name)}</h3>
            <div class="admin-lead-meta">${esc(lead.city)} · ${esc(lead.distance)} · ${esc(lead.type)}</div>
            <div class="admin-lead-meta">
              ${lead.phone ? `📞 <a href="tel:${lead.phone.replace(/\D/g, "")}">${esc(lead.phone)}</a>` : ""}
              ${lead.email ? ` · ✉️ <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : ""}
              ${lead.altEmail ? ` · <a href="mailto:${esc(lead.altEmail)}">${esc(lead.altEmail)}</a>` : ""}
            </div>
            <p class="admin-item-desc">${esc(lead.notes)}</p>
            <div class="admin-form-actions">
              ${lead.url ? `<a href="${esc(lead.url)}" class="btn btn-outline btn-sm" target="_blank" rel="noopener">Website</a>` : ""}
              <button type="button" class="btn btn-dark btn-sm" data-copy-email="${esc(lead.id)}">Copy Outreach Email</button>
            </div>
          </div>
        `).join("");

        leadsEl.querySelectorAll("[data-copy-email]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const lead = data.leads.find((x) => x.id === btn.dataset.copyEmail);
            if (lead) this.copyText(lead.emailTemplate, btn);
          });
        });
      }
    } catch (e) {
      if (fbNote) fbNote.textContent = `Could not load marketing data: ${e.message}`;
    }
  },

  handleEbayRedirect() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ebay") === "connected") {
      this.switchTab("marketing");
      history.replaceState({}, "", "/admin.html");
    }
    if (params.get("ebay") === "error") {
      alert("eBay connection failed: " + (params.get("msg") || "unknown error"));
      history.replaceState({}, "", "/admin.html");
    }
  },

  async loadEbay() {
    const statusEl = document.getElementById("ebay-status");
    const connectBtn = document.getElementById("ebay-connect");
    const publishBtn = document.getElementById("ebay-publish-all");
    const publishRadiosBtn = document.getElementById("ebay-publish-radios");
    const disconnectBtn = document.getElementById("ebay-disconnect");
    const resultsEl = document.getElementById("ebay-results");
    if (!statusEl) return;

    try {
      const status = await this.fetchJson("/api/admin/ebay/status");
      this.ebayStatus = status;

      if (!status.configured) {
        statusEl.innerHTML = "API auto-publish is <strong>not available</strong> (Developer account not connected). You can still list manually — download the worksheet CSV and use Seller Hub.";
        connectBtn.hidden = true;
        publishBtn.hidden = true;
        if (publishRadiosBtn) publishRadiosBtn.hidden = true;
        disconnectBtn.hidden = true;
        return;
      }

      if (!status.connected) {
        statusEl.textContent = "Not connected. Click below to authorize your eBay seller account.";
        connectBtn.hidden = false;
        publishBtn.hidden = true;
        if (publishRadiosBtn) publishRadiosBtn.hidden = true;
        disconnectBtn.hidden = true;
      } else {
        const policyNote = status.policiesReady ? "Business policies ready." : "Will auto-fetch policies on first publish.";
        statusEl.textContent = `Connected since ${new Date(status.connectedAt).toLocaleDateString()}. ${policyNote} Category: ${status.categoryId}.`;
        connectBtn.hidden = true;
        publishBtn.hidden = false;
        if (publishRadiosBtn) publishRadiosBtn.hidden = false;
        disconnectBtn.hidden = false;
      }

      if (resultsEl && status.listings) {
        const entries = Object.entries(status.listings);
        if (entries.length) {
          resultsEl.innerHTML = entries.map(([id, l]) => `
            <div class="admin-fb-item">
              <strong>${esc(id)}</strong>
              ${l.listingUrl ? `<a href="${esc(l.listingUrl)}" target="_blank" rel="noopener">View on eBay</a>` : ""}
              <span class="admin-item-meta">SKU ${esc(l.sku || "")} · Offer ${esc(l.offerId || "")}</span>
            </div>
          `).join("");
        }
      }
    } catch (e) {
      statusEl.textContent = `eBay status error: ${e.message}`;
    }
  },

  async connectEbay() {
    const btn = document.getElementById("ebay-connect");
    btn.disabled = true;
    try {
      const { url } = await this.fetchJson("/api/admin/ebay/auth");
      window.location.href = url;
    } catch (e) {
      alert(e.message);
      btn.disabled = false;
    }
  },

  async disconnectEbay() {
    if (!confirm("Disconnect eBay account?")) return;
    await this.fetchJson("/api/admin/ebay/disconnect", { method: "POST" });
    await this.loadEbay();
  },

  async publishRadiosEbay() {
    const radioIds = this.items.filter((i) => i.category === "radios").map((i) => i.id);
    if (!radioIds.length) return alert("No radio items in inventory.");
    if (!confirm(`Publish ${radioIds.length} radio listing(s) to eBay?`)) return;

    const btn = document.getElementById("ebay-publish-radios");
    btn.disabled = true;
    try {
      const result = await this.fetchJson("/api/admin/ebay/publish", {
        method: "POST",
        body: JSON.stringify({ itemIds: radioIds }),
      });
      this.showEbayResults(result);
      await this.loadEbay();
      await this.loadItems();
    } catch (e) {
      alert(e.message);
    } finally {
      btn.disabled = false;
    }
  },

  async publishAllEbay() {
    const btn = document.getElementById("ebay-publish-all");
    if (!confirm("Publish all inventory items to eBay? Items need a price set.")) return;
    btn.disabled = true;
    try {
      const result = await this.fetchJson("/api/admin/ebay/publish", { method: "POST", body: JSON.stringify({}) });
      this.showEbayResults(result);
      await this.loadEbay();
      await this.loadItems();
    } catch (e) {
      alert(e.message);
    } finally {
      btn.disabled = false;
    }
  },

  async publishEbayItem(itemId, btn) {
    const orig = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    try {
      const result = await this.fetchJson("/api/admin/ebay/publish", {
        method: "POST",
        body: JSON.stringify({ itemId }),
      });
      this.showEbayResults(result);
      await this.loadEbay();
      await this.loadItems();
    } catch (e) {
      alert(e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    }
  },

  showEbayResults(result) {
    const el = document.getElementById("ebay-results");
    if (!el) return;
    el.innerHTML = (result.results || []).map((r) => `
      <div class="admin-fb-item">
        <strong>${esc(r.name || r.id)}</strong>
        <span class="admin-item-meta">${r.ok ? "✓ Published" : "✗ " + esc(r.error)}</span>
        ${r.listingUrl ? `<a href="${esc(r.listingUrl)}" target="_blank" rel="noopener">View listing</a>` : ""}
      </div>
    `).join("");
  },

  async copyAllFacebook() {
    const posts = this.marketing?.facebookPosts || [];
    const text = posts.map((p) => `--- ${p.name} ---\n${p.text}`).join("\n\n");
    await this.copyText(text, document.getElementById("copy-all-fb"));
  },

  async copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    } catch {
      alert("Copy failed — select text manually.");
    }
  },

  async deleteItem(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    if (!confirm(`Delete "${item.name}" from inventory?`)) return;

    try {
      const { items } = await this.fetchJson(`/api/admin/inventory/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      this.items = items;
      this.renderList();
      if (this.editingId === id) this.resetForm();
    } catch (e) {
      alert(e.message);
    }
  },
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(amount) {
  if (amount === null || amount === undefined || amount === "") return "Call for price";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

document.addEventListener("DOMContentLoaded", () => PGT_ADMIN.init());
