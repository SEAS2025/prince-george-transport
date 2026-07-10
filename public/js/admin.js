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

    try {
      const { authed } = await this.fetchJson("/api/admin/session");
      if (authed) {
        this.show("dashboard");
        await this.loadItems();
        await this.loadMarketing();
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
          <span class="admin-item-meta">${esc(item.condition)} · ${item.category} · ${formatPrice(item.price)}</span>
          ${item.description ? `<p class="admin-item-desc">${esc(item.description)}</p>` : ""}
        </div>
        <div class="admin-item-actions">
          <button type="button" class="btn btn-outline btn-sm" data-edit="${item.id}">Edit</button>
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
  },

  async loadMarketing() {
    const fbNote = document.getElementById("fb-note");
    const fbPosts = document.getElementById("fb-posts");
    const leadsEl = document.getElementById("emt-leads");
    if (!fbPosts && !leadsEl) return;

    try {
      const data = await this.fetchJson("/api/admin/marketing");
      this.marketing = data;

      if (fbNote) fbNote.textContent = data.marketplaceNote;
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
