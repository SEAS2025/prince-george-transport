// Prince George Transport — shared frontend helpers

const PGT_APP = {
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

  formatPrice(amount) {
    if (amount === null || amount === undefined || amount === "") return "Call for price";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  },

  renderProducts(products, container) {
    if (!container) return;
    if (!products.length) {
      container.innerHTML = `<p style="text-align:center;font-family:var(--font-ui);color:var(--muted);grid-column:1/-1">No items in stock right now. Call <a href="tel:8032319420">(803) 231-9420</a> for availability.</p>`;
      return;
    }

    container.innerHTML = products.map((p) => `
      <article class="card product-card" data-product-id="${p.id}">
        ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" class="product-img" loading="lazy">` : ""}
        <span class="condition ${p.condition === "Used" ? "used" : ""}">${esc(p.condition)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="product-price">${this.formatPrice(p.price)}</div>
        <p class="product-desc">${esc(p.description)}</p>
        <button type="button" class="btn btn-dark btn-block inquiry-btn" data-item="${esc(p.name)}">
          Inquire to Buy
        </button>
      </article>
    `).join("");

    this.syncInquirySelect(products);

    container.querySelectorAll(".inquiry-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.getAttribute("data-item");
        const select = document.getElementById("inquiry-item");
        const form = document.getElementById("inquiry-form");
        if (select) select.value = item;
        if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  },

  syncInquirySelect(products) {
    const select = document.getElementById("inquiry-item");
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">Select an item…</option>` +
      products.map((p) => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("") +
      `<option value="Other / General Inquiry">Other / General Inquiry</option>`;
    if (current) select.value = current;
  },

  async submitInquiry(form) {
    const msg = document.getElementById("form-msg");
    const btn = form.querySelector('button[type="submit"]');
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      item: form.item.value,
      message: form.message.value.trim(),
    };

    if (!payload.name || !payload.email) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = "Name and email are required."; }
      return;
    }

    btn.disabled = true;
    if (msg) { msg.className = "form-msg"; msg.textContent = ""; }

    try {
      await this.fetchJson("/api/inquiry", { method: "POST", body: JSON.stringify(payload) });
      if (msg) {
        msg.className = "form-msg ok";
        msg.textContent = "Thanks! We'll get back to you shortly about your inquiry.";
      }
      form.reset();
    } catch (e) {
      if (msg) { msg.className = "form-msg err"; msg.textContent = e.message; }
    } finally {
      btn.disabled = false;
    }
  },

  async initSuppliesPage() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    grid.innerHTML = `<p style="text-align:center;font-family:var(--font-ui);color:var(--muted);grid-column:1/-1">Loading inventory…</p>`;

    try {
      const { items } = await this.fetchJson("/api/inventory");
      this.renderProducts(items, grid);
    } catch (e) {
      grid.innerHTML = `<p class="form-msg err" style="display:block;grid-column:1/-1">${esc(e.message)}</p>`;
    }

    const form = document.getElementById("inquiry-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitInquiry(form);
      });
    }
  },

  initHomePage() {
    const form = document.getElementById("contact-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitInquiry(form);
      });
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

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("products-grid")) PGT_APP.initSuppliesPage();
  if (document.getElementById("contact-form")) PGT_APP.initHomePage();
});
