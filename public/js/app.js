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

  formatPrice(amount, { acceptOffers = false } = {}) {
    if (amount === null || amount === undefined || amount === "") return "Call for price";
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    return acceptOffers ? `${formatted} OBO` : formatted;
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
    const isVehicle = product.category === "vehicles";
    const serial = product.serialNumber
      ? `<p class="product-serial">${isVehicle ? "VIN" : "SN"} ${esc(product.serialNumber)}</p>`
      : "";
    const mileage = isVehicle && product.mileage != null && product.mileage !== ""
      ? `<p class="product-serial">${Number(product.mileage).toLocaleString()} mi</p>`
      : "";
    const engineNotes = isVehicle && product.engineNotes
      ? `<p class="product-engine">${esc(product.engineNotes)}</p>`
      : "";

    return `
      <article class="card product-card${hasPhoto ? " has-photo" : ""}" id="${esc(product.id)}" data-product-id="${product.id}">
        ${this.renderGallery(product)}
        <span class="condition ${product.condition === "Used" ? "used" : ""}">${esc(product.condition)}</span>
        ${qty}
        <h3>${esc(product.name)}</h3>
        ${serial}
        ${mileage}
        ${engineNotes}
        <div class="product-price">${this.formatPrice(product.price, {
          acceptOffers: product.acceptOffers || product.category === "vehicles",
        })}</div>
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

  sortForSale(items) {
    return [...items].sort((a, b) => {
      const priced = (i) => (i.price != null && i.price !== "" ? 0 : 1);
      const diff = priced(a) - priced(b);
      if (diff) return diff;
      const ta = Date.parse(a.updatedAt || 0) || 0;
      const tb = Date.parse(b.updatedAt || 0) || 0;
      return tb - ta;
    });
  },

  supplyBucket(item) {
    const blob = `${item.name} ${item.description || ""} ${item.brand || ""}`.toLowerCase();
    if (/igel|i-gel|laryseal|laryngeal|lma|bvm|resuscitator|pulmonary/.test(blob)) return "airways";
    if (/electrode|defib|aed|quik-combo|heartsync|philips|lifepak|smart pad|pacing/.test(blob)) return "defib";
    if (/nasopharyngeal|\bnpa\b|robertazzi|1-5073|1-5075/.test(blob)) return "npa";
    return "general";
  },

  splitSupplies(supplies) {
    const buckets = { airways: [], defib: [], npa: [], general: [] };
    for (const item of supplies) {
      buckets[this.supplyBucket(item)].push(item);
    }
    for (const key of Object.keys(buckets)) {
      buckets[key] = this.sortForSale(buckets[key]);
    }
    return buckets;
  },

  updateStoreStats(vehicles, radios, supplies) {
    const el = document.getElementById("store-stats");
    if (!el) return;
    const total = vehicles.length + radios.length + supplies.length;
    el.textContent = `${total} items for sale · ${vehicles.length} ambulances · ${supplies.length} EMS supplies · ${radios.length} radios`;
  },

  syncInquirySelect(products) {
    const select = document.getElementById("inquiry-item");
    if (!select) return;
    const current = select.value;
    const sorted = this.sortForSale(products.filter((p) => p.price != null));
    select.innerHTML = `<option value="">Select an item…</option>` +
      sorted.map((p) => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("") +
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
    const airwaysGrid = document.getElementById("airways-grid");
    const defibGrid = document.getElementById("defib-grid");
    const npaGrid = document.getElementById("npa-grid");
    const suppliesGrid = document.getElementById("supplies-grid");
    const legacyGrid = document.getElementById("products-grid");
    const grid = legacyGrid || radiosGrid || vehiclesGrid;

    if (!grid) return;

    const loading = `<p style="text-align:center;font-family:var(--font-ui);color:var(--muted);grid-column:1/-1">Loading inventory…</p>`;
    const grids = [vehiclesGrid, radiosGrid, airwaysGrid, defibGrid, npaGrid, suppliesGrid, legacyGrid].filter(Boolean);
    grids.forEach((g) => { g.innerHTML = loading; });

    try {
      const { items } = await this.fetchJson("/api/inventory");
      const forSale = items.filter((i) => i.price != null && i.price !== "");
      const vehicles = this.sortForSale(forSale.filter((i) => i.category === "vehicles"));
      const radios = this.sortForSale(forSale.filter((i) => i.category === "radios"));
      const supplies = this.sortForSale(forSale.filter((i) => i.category !== "radios" && i.category !== "vehicles"));
      const buckets = this.splitSupplies(supplies);

      this.updateStoreStats(vehicles, radios, supplies);

      if (vehiclesGrid) {
        this.renderProducts(vehicles, vehiclesGrid, "No vehicles listed right now. Call (803) 231-9420 for availability.");
      }

      if (radiosGrid) {
        this.renderProducts(radios, radiosGrid, "No radios listed right now. Call (803) 231-9420 for availability.");
      }

      if (airwaysGrid) {
        this.renderProducts(buckets.airways, airwaysGrid, "No airway items listed right now.");
      }
      if (defibGrid) {
        this.renderProducts(buckets.defib, defibGrid, "No defibrillator pads listed right now.");
      }
      if (npaGrid) {
        this.renderProducts(buckets.npa, npaGrid, "No NPAs listed right now.");
      }
      if (suppliesGrid) {
        this.renderProducts(buckets.general, suppliesGrid, "No general EMS supplies listed right now.");
      }

      if (legacyGrid && !radiosGrid) {
        this.renderProducts(forSale, legacyGrid, "No items in stock right now. Call (803) 231-9420 for availability.");
      }

      this.syncInquirySelect(forSale);
    } catch (e) {
      const err = `<p class="form-msg err" style="display:block;grid-column:1/-1">${esc(e.message)}</p>`;
      grids.forEach((g) => { g.innerHTML = err; });
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
