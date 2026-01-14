(function () {
  "use strict";

  if (window.__LOOP_WIDGET_UI_LOADED__) return;
  window.__LOOP_WIDGET_UI_LOADED__ = true;

  // ---------- Helpers ----------
  function findScriptTag() {
    if (document.currentScript) return document.currentScript;
    const scripts = Array.from(document.querySelectorAll("script"));
    for (let i = scripts.length - 1; i >= 0; i--) {
      const s = scripts[i];
      const src = (s.getAttribute("src") || "").toLowerCase();
      if (src.includes("quote-ui.js") || s.hasAttribute("data-loop-client")) return s;
    }
    return null;
  }

  function sanitize(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 31, g: 41, b: 55 };
  }

  function getContrastColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#000000" : "#ffffff";
  }

  function setCSSVars(primary) {
    const root = document.getElementById("loop-widget-root");
    if (!root) return;

    const p = primary || "#1f2937";
    const { r, g, b } = hexToRgb(p);
    const text = getContrastColor(p);

    root.style.setProperty("--lw-primary", p);
    root.style.setProperty("--lw-primary-rgb", `${r},${g},${b}`);
    root.style.setProperty("--lw-text-on-primary", text);
  }

  function toast(message, isError) {
    const el = document.getElementById("lw-toast");
    if (!el) return;
    el.textContent = message;
    el.className = "lw-toast" + (isError ? " lw-error" : "") + " lw-show";
    setTimeout(() => el.classList.remove("lw-show"), 4200);
  }

  function lockScroll(locked) {
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }

  // ---------- UI State ----------
  const DEFAULT_EQUIPMENT = [
    "Excavator",
    "Bulldozer",
    "Crane",
    "Forklift",
    "Backhoe",
    "Skid Steer",
    "Dump Truck",
    "Roller",
    "Grader",
    "Loader",
  ];

  const state = {
    clientId: "default",
    buttonLabel: "Get a Quote",
    primaryColor: "#1f2937",
    equipmentList: [...DEFAULT_EQUIPMENT],

    selectedEquipment: [],
    files: { photos: [], docs: [] },
  };

  // ---------- Render ----------
  function ensureRoot() {
    if (document.getElementById("loop-widget-root")) return;

    const root = document.createElement("div");
    root.id = "loop-widget-root";

    const trigger = document.createElement("button");
    trigger.className = "lw-trigger";
    trigger.type = "button";
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>${sanitize(state.buttonLabel)}</span>
    `;

    const overlay = document.createElement("div");
    overlay.className = "lw-overlay";

    const panel = document.createElement("div");
    panel.className = "lw-panel";
    panel.innerHTML = `
      <div class="lw-header">
        <h2>Request a Quote</h2>
        <button class="lw-close" type="button" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="lw-body">
        <form class="lw-form" id="lw-quote-form" novalidate>
          <div class="lw-field">
            <label class="lw-label">Full Name <span class="lw-required">*</span></label>
            <input type="text" class="lw-input" name="fullName" required placeholder="John Smith">
          </div>

          <div class="lw-row">
            <div class="lw-field">
              <label class="lw-label">Email <span class="lw-required">*</span></label>
              <input type="email" class="lw-input" name="email" required placeholder="john@company.com">
            </div>
            <div class="lw-field">
              <label class="lw-label">Phone <span class="lw-required">*</span></label>
              <input type="tel" class="lw-input" name="phone" required placeholder="(555) 123-4567">
            </div>
          </div>

          <div class="lw-row">
            <div class="lw-field">
              <label class="lw-label">Start Date <span class="lw-required">*</span></label>
              <input type="date" class="lw-input" name="startDate" required>
            </div>
            <div class="lw-field">
              <label class="lw-label">End Date <span class="lw-required">*</span></label>
              <input type="date" class="lw-input" name="endDate" required>
            </div>
          </div>

          <div class="lw-field">
            <label class="lw-label">Fulfillment <span class="lw-required">*</span></label>
            <div class="lw-radio-group">
              <div class="lw-radio-option">
                <input type="radio" id="lw-delivery" name="fulfillment" value="delivery" checked>
                <label for="lw-delivery">Delivery</label>
              </div>
              <div class="lw-radio-option">
                <input type="radio" id="lw-pickup" name="fulfillment" value="pickup">
                <label for="lw-pickup">Pickup</label>
              </div>
            </div>
          </div>

          <div class="lw-field" id="lw-location-field">
            <label class="lw-label">Delivery Location <span class="lw-required">*</span></label>
            <input type="text" class="lw-input" name="location" placeholder="123 Main St, City, Province">
          </div>

          <div class="lw-field">
            <label class="lw-label">Equipment Needed</label>
            <div class="lw-equipment-input">
              <input type="text" class="lw-input" id="lw-equipment-search" placeholder="Search equipment...">
              <div class="lw-equipment-dropdown" id="lw-equipment-dropdown"></div>
            </div>
            <div class="lw-tags" id="lw-equipment-tags"></div>
          </div>

          <div class="lw-field">
            <label class="lw-label">Project Details</label>
            <textarea class="lw-textarea" name="details" placeholder="Tell us about your project..."></textarea>
          </div>

          <div class="lw-field">
            <label class="lw-label">Photos</label>
            <div class="lw-file-zone" id="lw-photos-zone" role="button" tabindex="0">
              <svg class="lw-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p>Click to upload photos</p>
              <input type="file" id="lw-photos-input" accept="image/*" multiple>
            </div>
            <div class="lw-file-list" id="lw-photos-list"></div>
          </div>

          <div class="lw-field">
            <label class="lw-label">Documents</label>
            <div class="lw-file-zone" id="lw-docs-zone" role="button" tabindex="0">
              <svg class="lw-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p>Click to upload documents</p>
              <input type="file" id="lw-docs-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" multiple>
            </div>
            <div class="lw-file-list" id="lw-docs-list"></div>
          </div>

          <button type="submit" class="lw-submit" id="lw-submit-btn">Submit Quote Request</button>
        </form>
      </div>
    `;

    const toastEl = document.createElement("div");
    toastEl.className = "lw-toast";
    toastEl.id = "lw-toast";

    root.appendChild(trigger);
    root.appendChild(overlay);
    root.appendChild(panel);
    root.appendChild(toastEl);

    document.body.appendChild(root);

    // Apply theme vars
    setCSSVars(state.primaryColor);

    bindUI();
  }

  function openPanel() {
    document.querySelector("#loop-widget-root .lw-overlay")?.classList.add("lw-open");
    document.querySelector("#loop-widget-root .lw-panel")?.classList.add("lw-open");
    lockScroll(true);
  }

  function closePanel() {
    document.querySelector("#loop-widget-root .lw-overlay")?.classList.remove("lw-open");
    document.querySelector("#loop-widget-root .lw-panel")?.classList.remove("lw-open");
    lockScroll(false);
  }

  // ---------- Equipment ----------
  function renderTags() {
    const tagsContainer = document.getElementById("lw-equipment-tags");
    if (!tagsContainer) return;

    tagsContainer.innerHTML = state.selectedEquipment
      .map(
        (item, i) => `
        <span class="lw-tag">
          ${sanitize(item)}
          <button type="button" class="lw-tag-remove" data-index="${i}" aria-label="Remove">&times;</button>
        </span>
      `
      )
      .join("");

    tagsContainer.querySelectorAll(".lw-tag-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-index"));
        state.selectedEquipment.splice(idx, 1);
        renderTags();
      });
    });
  }

  function renderDropdown(filter = "") {
    const dropdown = document.getElementById("lw-equipment-dropdown");
    if (!dropdown) return;

    const f = filter.trim().toLowerCase();
    const filtered = state.equipmentList.filter((item) => {
      const match = item.toLowerCase().includes(f);
      const notPicked = !state.selectedEquipment.includes(item);
      return match && notPicked;
    });

    dropdown.innerHTML = filtered.length
      ? filtered
          .map(
            (item) =>
              `<div class="lw-equipment-option" data-value="${sanitize(item)}">${sanitize(item)}</div>`
          )
          .join("")
      : `<div class="lw-equipment-option" style="cursor: default; opacity: .7;">No matches</div>`;

    dropdown.querySelectorAll(".lw-equipment-option[data-value]").forEach((opt) => {
      opt.addEventListener("click", () => {
        const val = opt.getAttribute("data-value");
        if (!val) return;
        state.selectedEquipment.push(val);
        renderTags();
        const input = document.getElementById("lw-equipment-search");
        if (input) input.value = "";
        dropdown.classList.remove("lw-show");
      });
    });
  }

  // ---------- Files ----------
  function renderFileList(type) {
    const listId = type === "photos" ? "lw-photos-list" : "lw-docs-list";
    const list = document.getElementById(listId);
    if (!list) return;

    const files = state.files[type] || [];
    list.innerHTML = files
      .map(
        (file, i) => `
        <div class="lw-file-item">
          <span title="${sanitize(file.name)}">${sanitize(file.name)}</span>
          <button type="button" class="lw-tag-remove" data-type="${type}" data-index="${i}" aria-label="Remove">&times;</button>
        </div>
      `
      )
      .join("");

    list.querySelectorAll(".lw-tag-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-type");
        const idx = Number(btn.getAttribute("data-index"));
        if (!t || Number.isNaN(idx)) return;
        state.files[t].splice(idx, 1);
        renderFileList(t);
      });
    });
  }

  function setupFileUpload(zoneId, inputId, type) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if (!zone || !input) return;

    const openPicker = () => input.click();

    zone.addEventListener("click", openPicker);
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openPicker();
    });

    input.addEventListener("change", () => {
      const picked = Array.from(input.files || []);
      picked.forEach((f) => state.files[type].push(f));
      renderFileList(type);
      input.value = "";
    });
  }

  // ---------- Validation ----------
  function validateForm(fd) {
    const required = ["fullName", "email", "phone", "startDate", "endDate"];
    for (const name of required) {
      const v = String(fd.get(name) || "").trim();
      if (!v) return { ok: false, message: `Please fill in: ${name}` };
    }

    const start = String(fd.get("startDate") || "");
    const end = String(fd.get("endDate") || "");
    if (start && end && start > end) {
      return { ok: false, message: "End Date must be after Start Date" };
    }

    const fulfillment = String(fd.get("fulfillment") || "delivery");
    if (fulfillment === "delivery") {
      const loc = String(fd.get("location") || "").trim();
      if (!loc) return { ok: false, message: "Please enter a delivery location" };
    }

    return { ok: true };
  }

  // ---------- Submit (UI only) ----------
  async function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const btn = document.getElementById("lw-submit-btn");
    if (!form || !btn) return;

    const fd = new FormData(form);

    const check = validateForm(fd);
    if (!check.ok) {
      toast(check.message, true);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="lw-loading"></span>Submitting...`;

    try {
      // UI-only payload (no uploads, no API)
      const payload = {
        clientId: state.clientId,
        pageUrl: window.location.href,

        fullName: String(fd.get("fullName") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        startDate: String(fd.get("startDate") || "").trim(),
        endDate: String(fd.get("endDate") || "").trim(),

        fulfillment: String(fd.get("fulfillment") || "delivery"),
        location: String(fd.get("location") || "").trim() || undefined,

        equipmentNeeded: [...state.selectedEquipment],
        details: String(fd.get("details") || "").trim(),

        // UI-only: just filenames (so you can see it works)
        photos: state.files.photos.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        docs: state.files.docs.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      };

      // Simulate network delay
      await new Promise((r) => setTimeout(r, 650));

      console.log("[LoopWidget UI] SUBMIT payload:", payload);

      toast("Submitted.");
      form.reset();
      state.selectedEquipment = [];
      state.files.photos = [];
      state.files.docs = [];
      renderTags();
      renderFileList("photos");
      renderFileList("docs");
      setTimeout(closePanel, 900);
    } catch (err) {
      console.error(err);
      toast("Something went wrong (UI-only).", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Submit Quote Request";
    }
  }

  // ---------- Bind ----------
  function bindUI() {
    const root = document.getElementById("loop-widget-root");
    if (!root) return;

    const trigger = root.querySelector(".lw-trigger");
    const overlay = root.querySelector(".lw-overlay");
    const closeBtn = root.querySelector(".lw-close");

    trigger.addEventListener("click", openPanel);
    overlay.addEventListener("click", closePanel);
    closeBtn.addEventListener("click", closePanel);

    // Fulfillment toggle
    const deliveryRadio = document.getElementById("lw-delivery");
    const pickupRadio = document.getElementById("lw-pickup");
    const locationField = document.getElementById("lw-location-field");

    const updateLocationVisibility = () => {
      if (!locationField) return;
      locationField.style.display = deliveryRadio && deliveryRadio.checked ? "flex" : "none";
    };

    deliveryRadio?.addEventListener("change", updateLocationVisibility);
    pickupRadio?.addEventListener("change", updateLocationVisibility);
    updateLocationVisibility();

    // Equipment autocomplete
    const equipmentSearch = document.getElementById("lw-equipment-search");
    const dropdown = document.getElementById("lw-equipment-dropdown");

    equipmentSearch?.addEventListener("focus", () => {
      renderDropdown(equipmentSearch.value);
      dropdown?.classList.add("lw-show");
    });

    equipmentSearch?.addEventListener("input", () => {
      renderDropdown(equipmentSearch.value);
      dropdown?.classList.add("lw-show");
    });

    document.addEventListener("click", (ev) => {
      if (!ev.target.closest(".lw-equipment-input")) dropdown?.classList.remove("lw-show");
    });

    // Files
    setupFileUpload("lw-photos-zone", "lw-photos-input", "photos");
    setupFileUpload("lw-docs-zone", "lw-docs-input", "docs");

    // Submit
    const form = document.getElementById("lw-quote-form");
    form?.addEventListener("submit", handleSubmit);

    // Esc key closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePanel();
    });
  }

  // ---------- Init (read script data attrs for UI theming) ----------
  function init() {
    const script = findScriptTag();
    if (script) {
      state.clientId = script.getAttribute("data-loop-client") || "default";
      state.primaryColor = script.getAttribute("data-loop-primary") || "#1f2937";
      state.buttonLabel = script.getAttribute("data-loop-button") || "Get a Quote";
    }

    ensureRoot();

    // update trigger label + theme after render
    const triggerLabel = document.querySelector("#loop-widget-root .lw-trigger span");
    if (triggerLabel) triggerLabel.textContent = state.buttonLabel;
    setCSSVars(state.primaryColor);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
