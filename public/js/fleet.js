(function () {
  "use strict";

  var API = "/api/fleet-update";
  var pin = null;

  var loginPanel = document.querySelector('[data-panel="login"]');
  var appPanel = document.querySelector('[data-panel="app"]');
  var pinForm = document.getElementById("pin-form");
  var pinInput = document.getElementById("pin");
  var loginMsg = document.getElementById("login-msg");
  var logoutBtn = document.getElementById("logout-btn");
  var fleetForm = document.getElementById("fleet-form");
  var vehiclesList = document.getElementById("vehicles-list");
  var saveMsg = document.getElementById("save-msg");
  var saveBtn = document.getElementById("save-btn");
  var vehicleForm = document.getElementById("vehicle-form");
  var productForm = document.getElementById("product-form");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "form-msg" + (kind ? " " + kind : "");
  }

  async function post(payload) {
    var res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  // ---- Tabs ----
  document.querySelectorAll(".capture-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var name = tab.getAttribute("data-tab");
      document.querySelectorAll(".capture-tab").forEach(function (t) {
        t.classList.toggle("active", t === tab);
      });
      document.querySelectorAll("[data-tab-panel]").forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-tab-panel") !== name;
      });
    });
  });

  // ---- Photo handling (downscale to keep uploads small) ----
  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Bad image")); };
      img.src = url;
    });
  }

  async function fileToPayload(file) {
    var img = await fileToImage(file);
    var max = 1600;
    var w = img.width, h = img.height;
    if (w > max || h > max) {
      if (w >= h) { h = Math.round(h * (max / w)); w = max; }
      else { w = Math.round(w * (max / h)); h = max; }
    }
    var canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    var dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  }

  function bindPhotoInput(form) {
    var input = form.querySelector(".photo-input");
    var preview = form.querySelector(".photo-preview");
    if (!input) return;
    input.addEventListener("change", function () {
      preview.innerHTML = "";
      Array.prototype.forEach.call(input.files, function (file) {
        var url = URL.createObjectURL(file);
        var im = document.createElement("img");
        im.src = url;
        im.className = "photo-thumb";
        im.onload = function () { URL.revokeObjectURL(url); };
        preview.appendChild(im);
      });
    });
  }

  async function collectPhotos(form) {
    var input = form.querySelector(".photo-input");
    if (!input || !input.files.length) return [];
    var out = [];
    for (var i = 0; i < input.files.length && i < 8; i++) {
      try { out.push(await fileToPayload(input.files[i])); } catch (e) { /* skip */ }
    }
    return out;
  }

  // ---- Edit existing vehicles ----
  function renderVehicles(vehicles) {
    if (!vehicles || !vehicles.length) {
      vehiclesList.innerHTML = '<div class="card"><p class="admin-muted">No vehicles found in inventory.</p></div>';
      saveBtn.hidden = true;
      return;
    }
    saveBtn.hidden = false;
    vehiclesList.innerHTML = vehicles.map(function (v) {
      var price = v.price != null ? "$" + Number(v.price).toLocaleString() : "";
      return (
        '<div class="card" data-id="' + esc(v.id) + '">' +
          '<h3 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:0.25rem">' + esc(v.name) + '</h3>' +
          '<p class="admin-muted" style="margin-bottom:0.75rem">' + esc(v.condition || "") + (price ? " · " + price : "") + '</p>' +
          '<div class="form-group">' +
            '<label>Mileage (odometer)</label>' +
            '<input type="number" min="0" step="1" class="fleet-mileage" inputmode="numeric" placeholder="e.g. 84500" value="' + (v.mileage != null ? esc(v.mileage) : "") + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Engine condition / notes</label>' +
            '<textarea class="fleet-engine" rows="2" placeholder="e.g. New engine installed, runs strong">' + esc(v.engineNotes || "") + '</textarea>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function showApp() {
    loginPanel.hidden = true;
    appPanel.hidden = false;
    logoutBtn.hidden = false;
  }

  function lock() {
    pin = null;
    appPanel.hidden = true;
    loginPanel.hidden = false;
    logoutBtn.hidden = true;
    pinInput.value = "";
    setMsg(saveMsg, "");
  }

  pinForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    setMsg(loginMsg, "Checking…");
    var candidate = pinInput.value.trim();
    try {
      var data = await post({ pin: candidate });
      pin = candidate;
      setMsg(loginMsg, "");
      renderVehicles(data.vehicles);
      showApp();
    } catch (err) {
      setMsg(loginMsg, err.message, "error");
    }
  });

  logoutBtn.addEventListener("click", lock);

  fleetForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!pin) return;
    var updates = [];
    vehiclesList.querySelectorAll("[data-id]").forEach(function (card) {
      updates.push({
        id: card.getAttribute("data-id"),
        mileage: card.querySelector(".fleet-mileage").value.trim(),
        engineNotes: card.querySelector(".fleet-engine").value.trim(),
      });
    });
    setMsg(saveMsg, "Saving…");
    saveBtn.disabled = true;
    try {
      var data = await post({ pin: pin, updates: updates });
      renderVehicles(data.vehicles);
      setMsg(saveMsg, "Saved — live on the site.", "success");
    } catch (err) {
      setMsg(saveMsg, err.message, "error");
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ---- Create new listings ----
  function bindCreateForm(form, buildPayload) {
    if (!form) return;
    bindPhotoInput(form);
    var msg = form.querySelector(".create-msg");
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!pin) return;
      if (!form.name.value.trim()) { setMsg(msg, "Name is required.", "error"); return; }
      btn.disabled = true;
      setMsg(msg, "Uploading photos…");
      try {
        var photos = await collectPhotos(form);
        setMsg(msg, "Publishing…");
        var create = buildPayload(form);
        create.images = photos;
        var data = await post({ pin: pin, create: create });
        setMsg(msg, "Published — live on the site.", "success");
        form.reset();
        var preview = form.querySelector(".photo-preview");
        if (preview) preview.innerHTML = "";
        if (create.category === "vehicles") {
          var refreshed = await post({ pin: pin });
          renderVehicles(refreshed.vehicles);
        }
      } catch (err) {
        setMsg(msg, err.message, "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  bindCreateForm(vehicleForm, function (form) {
    return {
      category: "vehicles",
      name: form.name.value.trim(),
      price: form.price.value.trim(),
      condition: form.condition.value.trim(),
      mileage: form.mileage.value.trim(),
      engineNotes: form.engineNotes.value.trim(),
      description: form.description.value.trim(),
      acceptOffers: form.acceptOffers.checked,
    };
  });

  bindCreateForm(productForm, function (form) {
    return {
      category: form.category.value,
      name: form.name.value.trim(),
      price: form.price.value.trim(),
      quantity: form.quantity.value.trim(),
      condition: form.condition.value.trim(),
      brand: form.brand.value.trim(),
      serialNumber: form.serialNumber.value.trim(),
      description: form.description.value.trim(),
      acceptOffers: form.acceptOffers.checked,
    };
  });
})();
