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

  productImages(product) {
    const images = [];
    if (product.imageUrl) images.push(product.imageUrl);
    for (const url of product.extraImageUrls || []) {
      if (url && !images.includes(url)) images.push(url);
    }
    return images;
  },

  renderGallery(product) {
    const images = this.productImages(product);
    if (!images.length) return "";

    const thumbs = images.length > 1
      ? `<div class="product-thumbs">${images.map((url, i) => `
          <button type="button" class="product-thumb${i === 0 ? " active" : ""}" data-src="${esc(url)}" aria-label="Photo ${i + 1}${i === 0 ? " (main)" : ""}">
            <img src="${esc(url)}" alt="" loading="lazy">
          </button>
        `).join("")}</div>`
      : "";

    return `
      <div class="product-gallery" data-gallery="${esc(product.id)}">
        <img src="${esc(images[0])}" alt="${esc(product.name)}" class="product-img product-img-main" loading="lazy">
        ${thumbs}
      </div>
    `;
  },

  bindGalleries(container) {
    container.querySelectorAll(".product-gallery").forEach((gallery) => {
      const main = gallery.querySelector(".product-img-main");
      gallery.querySelectorAll(".product-thumb").forEach((btn) => {
        btn.addEventListener("click", () => {
          const src = btn.dataset.src;
          if (!src || !main) return;
          main.src = src;
          gallery.querySelectorAll(".product-thumb").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
    });
  },

  renderProductCard(product) {
    const hasPhoto = this.productImages(product).length > 0;
    const qty = product.quantity > 1 ? `<span class="product-qty">Qty ${product.quantity}</span>` : "";
    const serial = product.serialNumber
      ? `<p class="product-serial">SN ${esc(product.serialNumber)}</p>`
      : "";

    return `
      <article class="card product-card${hasPhoto ? " has-photo" : ""}" id="${esc(product.id)}" data-product-id="${product.id}">
        ${this.renderGallery(product)}
        <span class="condition ${product.condition === "Used" ? "used" : ""}">${esc(product.condition)}</span>
        ${qty}
        <h3>${esc(product.name)}</h3>
        ${serial}
        <div class="product-price">${this.formatPrice(product.price)}</div>
        <p class="product-desc">${esc(product.description)}</p>
        <div class="product-actions">
          ${product.ebayListingUrl
            ? `<a href="${esc(product.ebayListingUrl)}" class="btn btn-ebay btn-block" target="_blank" rel="noopener noreferrer">Buy on eBay</a>`
            : ""}
          <button type="button" class="btn btn-dark btn-block inquiry-btn" data-item="${esc(product.name)}">
            ${product.ebayListingUrl ? "Inquire Direct" : "Inquire to Buy"}
          </button>
        </div>
      </article>
    `;
  },

  renderProducts(products, container, emptyMessage) {
    if (!container) return;
    if (!products.length) {
      container.innerHTML = `<p class="inventory-empty">${emptyMessage}</p>`;
      return;
    }

    container.innerHTML = products.map((p) => this.renderProductCard(p)).join("");
    this.bindGalleries(container);

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
    const vehiclesGrid = document.getElementById("vehicles-grid");
    const radiosGrid = document.getElementById("radios-grid");
    const suppliesGrid = document.getElementById("supplies-grid");
    const legacyGrid = document.getElementById("products-grid");
    const grid = legacyGrid || radiosGrid || vehiclesGrid;

    if (!grid) return;

    const loading = `<p style="text-align:center;font-family:var(--font-ui);color:var(--muted);grid-column:1/-1">Loading inventory…</p>`;
    if (vehiclesGrid) vehiclesGrid.innerHTML = loading;
    if (radiosGrid) radiosGrid.innerHTML = loading;
    if (suppliesGrid) suppliesGrid.innerHTML = loading;
    if (legacyGrid) legacyGrid.innerHTML = loading;

    try {
      const { items } = await this.fetchJson("/api/inventory");
      const vehicles = items.filter((i) => i.category === "vehicles");
      const radios = items.filter((i) => i.category === "radios");
      const supplies = items.filter((i) => i.category !== "radios" && i.category !== "vehicles");

      if (vehiclesGrid) {
        this.renderProducts(vehicles, vehiclesGrid, "No vehicles listed right now. Call (803) 231-9420 for availability.");
      }

      if (radiosGrid && suppliesGrid) {
        this.renderProducts(radios, radiosGrid, "No radios listed right now. Call (803) 231-9420 for availability.");
        this.renderProducts(supplies, suppliesGrid, "No supplies listed right now.");
      } else if (legacyGrid) {
        this.renderProducts(items, legacyGrid, "No items in stock right now. Call (803) 231-9420 for availability.");
      }

      this.syncInquirySelect(items);
    } catch (e) {
      const err = `<p class="form-msg err" style="display:block;grid-column:1/-1">${esc(e.message)}</p>`;
      if (vehiclesGrid) vehiclesGrid.innerHTML = err;
      if (radiosGrid) radiosGrid.innerHTML = err;
      if (suppliesGrid) suppliesGrid.innerHTML = err;
      if (legacyGrid) legacyGrid.innerHTML = err;
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
  if (document.getElementById("radios-grid") || document.getElementById("vehicles-grid") || document.getElementById("products-grid")) {
    PGT_APP.initSuppliesPage();
  }
  if (document.getElementById("contact-form")) PGT_APP.initHomePage();
});
