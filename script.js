(function () {
  "use strict";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const DATA_URL = "data/cards.json";
  let cache = null;

  async function loadCards() {
    if (cache) return cache;
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Fehler beim Laden der Daten");
    cache = await res.json();
    return cache;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function renderCert(card) {
    return `
      <div class="cert-detail glass">
        <div class="cert-detail-header">
          <div>
            <div class="cert-label" style="color:var(--brand);font-size:11px;letter-spacing:0.2em;font-weight:700;">GRAID CERTIFIED</div>
            <h3>${escapeHtml(card.card_name)}</h3>
            <div class="meta">${escapeHtml(card.set_name)} · ${escapeHtml(card.set_number)} · ${escapeHtml(card.year)}</div>
            <div style="margin-top:10px;"><span class="cert-status">● ${escapeHtml(card.status)}</span></div>
          </div>
          <div class="cert-grade">
            <span class="grade-num">${escapeHtml(card.total_grade)}</span>
            <span class="grade-label">TOTAL GRADE</span>
          </div>
        </div>
        <div class="cert-detail-grid">
          <div><span>Zertifikats-ID</span><strong>${escapeHtml(card.id)}</strong></div>
          <div><span>Sprache</span><strong>${escapeHtml(card.language)}</strong></div>
          <div><span>Graded am</span><strong>${escapeHtml(card.graded_date)}</strong></div>
          <div><span>Centering</span><strong>${escapeHtml(card.centering_grade)}</strong></div>
          <div><span>Condition</span><strong>${escapeHtml(card.condition_grade)}</strong></div>
          <div><span>Print</span><strong>${escapeHtml(card.print_grade)}</strong></div>
        </div>
      </div>
    `;
  }

  function renderError(id) {
    return `
      <div class="cert-detail cert-error glass">
        <strong style="font-family:'Space Grotesk',sans-serif;font-size:20px;">Zertifikat nicht gefunden</strong>
        ${id ? `<p style="margin-top:8px;color:var(--muted);">Für die ID <code>${escapeHtml(id)}</code> konnte kein Eintrag gefunden werden.</p>` : ""}
      </div>
    `;
  }

  // Verify form on index
  const form = document.getElementById("verify-form");
  const input = document.getElementById("cert-input");
  const result = document.getElementById("verify-result");

  if (form && input && result) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = input.value.trim().toUpperCase();
      if (!id) return;
      result.innerHTML = `<div class="cert-detail glass" style="text-align:center;color:var(--muted);">Suche…</div>`;
      try {
        const cards = await loadCards();
        const found = cards.find((c) => c.id.toUpperCase() === id);
        result.innerHTML = found ? renderCert(found) : renderError(id);
      } catch (err) {
        result.innerHTML = renderError(id);
      }
    });
  }

  // Cert page
  const certContainer = document.getElementById("cert-container");
  if (certContainer) {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const id = (params.get("id") || "").trim().toUpperCase();
      if (!id) {
        certContainer.innerHTML = renderError("");
        return;
      }
      try {
        const cards = await loadCards();
        const found = cards.find((c) => c.id.toUpperCase() === id);
        certContainer.innerHTML = found ? renderCert(found) : renderError(id);
        if (found) document.title = `GRAID · ${found.card_name} (${found.id})`;
      } catch (err) {
        certContainer.innerHTML = renderError(id);
      }
    })();
  }

  // Hero image arrow overlays: fade in when scrolling into view
  const heroVisual = document.querySelector(".hero-visual");
  const heroOverlays = document.querySelector(".hero-overlays");

  // ---- Callout system (config-driven) ----
  if (heroVisual && heroOverlays) {
    const CALLOUTS = [
      { id: "a", label: "GRAID Label",     side: "left",  target: { x: 32, y: 11 }, chip: { top: 6 } },
      { id: "b", label: "Subgrades & ID",  side: "left",  target: { x: 32, y: 19 }, chip: { top: 22 } },
      { id: "c", label: "Kartenmotiv",     side: "left",  target: { x: 50, y: 48 }, chip: { top: 48 } },
      { id: "d", label: "Gesamtnote",      side: "right", target: { x: 68, y: 12 }, chip: { top: 6 } },
      { id: "e", label: "QR-Verifizierung",side: "right", target: { x: 77, y: 19 }, chip: { top: 22 } },
      { id: "f", label: "Schutz-Case",     side: "right", target: { x: 88, y: 50 }, chip: { top: 50 } },
    ];

    const SVGNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "callout-svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    const defs = document.createElementNS(SVGNS, "defs");
    defs.innerHTML =
      '<linearGradient id="calloutGrad" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#1f5eac"/>' +
      '<stop offset="70%" stop-color="#2f78d6"/>' +
      '<stop offset="100%" stop-color="#e0b64a"/>' +
      "</linearGradient>";
    svg.appendChild(defs);

    // Chip inner edge in SVG viewBox units (approx).
    // Chips sit outside card (left:-30% / right:-30%), so their inner edge
    // is a few units outside the 0..100 range.
    const START_LEFT = -3;
    const START_RIGHT = 103;

    CALLOUTS.forEach((c) => {
      const sx = c.side === "left" ? START_LEFT : START_RIGHT;
      const sy = c.chip.top; // chip vertical center
      const ex = c.target.x;
      const ey = c.target.y;
      // Smooth bezier: run mostly parallel to card edge, curve in near target.
      const dx = ex - sx;
      const cp1x = c.side === "left" ? sx + Math.max(18, dx * 0.55) : sx - Math.max(18, -dx * 0.55);
      const cp2x = c.side === "left" ? ex - 8 : ex + 8;
      const d = `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`;
      const path = document.createElementNS(SVGNS, "path");
      path.setAttribute("class", "callout-path");
      path.setAttribute("data-id", c.id);
      path.setAttribute("d", d);
      svg.appendChild(path);
    });

    heroOverlays.appendChild(svg);

    // Targets
    CALLOUTS.forEach((c) => {
      const dot = document.createElement("div");
      dot.className = "callout-target";
      dot.setAttribute("data-id", c.id);
      dot.setAttribute("data-label", c.label);
      dot.style.left = c.target.x + "%";
      dot.style.top = c.target.y + "%";
      heroOverlays.appendChild(dot);
    });

    // Desktop chips
    CALLOUTS.forEach((c) => {
      const chip = document.createElement("div");
      chip.className = "callout-chip";
      chip.setAttribute("data-id", c.id);
      chip.innerHTML = `<span class="idx">${c.id}</span><span>${c.label}</span>`;
      chip.style.top = c.chip.top + "%";
      chip.style.transform = "translateY(-50%)";
      if (c.side === "left") {
        chip.style.right = "calc(100% + 18px)";
      } else {
        chip.style.left = "calc(100% + 18px)";
      }
      const activate = () => heroOverlays.setAttribute("data-active", c.id);
      const deactivate = () => heroOverlays.removeAttribute("data-active");
      chip.addEventListener("mouseenter", activate);
      chip.addEventListener("mouseleave", deactivate);
      chip.addEventListener("focusin", activate);
      chip.addEventListener("focusout", deactivate);
      heroOverlays.appendChild(chip);
    });

    // Mobile list + hotspot interactivity
    const mobileList = document.querySelector(".callout-mobile-list");
    if (mobileList) {
      CALLOUTS.forEach((c) => {
        const li = document.createElement("li");
        li.setAttribute("data-id", c.id);
        li.innerHTML = `<span class="idx">${c.id}</span><span>${c.label}</span>`;
        mobileList.appendChild(li);
      });
      const setActive = (id) => {
        if (id) heroOverlays.setAttribute("data-active", id);
        else heroOverlays.removeAttribute("data-active");
        mobileList.querySelectorAll("li").forEach((li) => {
          li.classList.toggle("is-active", li.getAttribute("data-id") === id);
        });
      };
      heroOverlays.querySelectorAll(".callout-target").forEach((dot) => {
        dot.setAttribute("role", "button");
        dot.setAttribute("tabindex", "0");
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = dot.getAttribute("data-id");
          const active = heroOverlays.getAttribute("data-active") === id;
          setActive(active ? null : id);
        });
      });
      mobileList.querySelectorAll("li").forEach((li) => {
        li.addEventListener("click", () => {
          const id = li.getAttribute("data-id");
          const active = heroOverlays.getAttribute("data-active") === id;
          setActive(active ? null : id);
        });
      });
    }
  }

  if (heroVisual && heroOverlays) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              heroOverlays.classList.add("is-visible");
              observer.unobserve(heroVisual);
            }
          });
        },
        { threshold: 0.25 }
      );
      observer.observe(heroVisual);
    } else {
      heroOverlays.classList.add("is-visible");
    }
  }

  // Front/back side toggle for hero card
  const sideToggle = document.querySelector(".side-toggle");
  if (heroVisual && sideToggle) {
    const buttons = sideToggle.querySelectorAll(".side-toggle-btn");
    sideToggle.setAttribute("data-side", "front");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const side = btn.getAttribute("data-side");
        if (!side) return;
        heroVisual.setAttribute("data-side", side);
        sideToggle.setAttribute("data-side", side);
        buttons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-selected", active ? "true" : "false");
        });
      });
    });
  }

  // Compare scatter chart (Warum GRAID?)
  const compareChart = document.getElementById("compare-chart");
  if (compareChart) {
    const data = [
      { id: "gr8", name: "GR8 Grading", days: 14, price: 9.0, featured: true },
      { id: "tag", name: "TAG Grading", days: 30, price: 34.2 },
      { id: "psa", name: "PSA", days: 75, price: 28.9 },
      { id: "bgs", name: "Beckett / BGS", days: 75, price: 15.7 },
      { id: "ace", name: "ACE Grading", days: 95, price: 14.0 },
      { id: "cgc", name: "CGC", days: 120, price: 14.9 },
    ];
    const xTicks = [0, 30, 60, 90, 120];
    const yTicks = [0, 10, 20, 30, 40];
    const xMin = 0, xMax = 130, yMin = 0, yMax = 40;
    const xPct = (v) => ((v - xMin) / (xMax - xMin)) * 100;
    const yPct = (v) => (1 - (v - yMin) / (yMax - yMin)) * 100;
    const fmtEuro = (v) => v.toFixed(2).replace(".", ",") + " €";

    const yAxis = compareChart.querySelector(".cc-yaxis");
    const xAxis = compareChart.querySelector(".cc-xaxis");
    const plot = compareChart.querySelector(".cc-plot");

    yTicks.forEach((v) => {
      const t = document.createElement("div");
      t.className = "cc-tick cc-tick-y";
      t.style.top = yPct(v) + "%";
      t.textContent = fmtEuro(v);
      yAxis.appendChild(t);
    });
    xTicks.forEach((v) => {
      const t = document.createElement("div");
      t.className = "cc-tick cc-tick-x";
      t.style.left = xPct(v) + "%";
      t.textContent = v + " T";
      xAxis.appendChild(t);
    });

    // Shared tooltip
    const tip = document.createElement("div");
    tip.className = "cc-tooltip";
    plot.appendChild(tip);

    const hideTip = () => tip.classList.remove("is-visible");
    const showTip = (d, x, y) => {
      tip.innerHTML = `<strong>${d.name}</strong><span>${d.days} Tage · ${fmtEuro(d.price)}</span>`;
      tip.style.left = x + "%";
      tip.style.top = y + "%";
      tip.classList.add("is-visible");
    };

    data.forEach((d) => {
      const x = xPct(d.days);
      const y = yPct(d.price);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cc-point" + (d.featured ? " is-featured" : "");
      btn.style.left = x + "%";
      btn.style.top = y + "%";
      btn.setAttribute("aria-label", `${d.name}: ${d.days} Tage, ${fmtEuro(d.price)}`);
      btn.addEventListener("mouseenter", () => showTip(d, x, y));
      btn.addEventListener("mouseleave", hideTip);
      btn.addEventListener("focus", () => showTip(d, x, y));
      btn.addEventListener("blur", hideTip);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = btn.classList.contains("is-active");
        plot.querySelectorAll(".cc-point.is-active").forEach((el) => el.classList.remove("is-active"));
        if (wasActive) { hideTip(); } else { btn.classList.add("is-active"); showTip(d, x, y); }
      });
      plot.appendChild(btn);

      if (d.featured) {
        const badge = document.createElement("div");
        badge.className = "cc-badge";
        badge.textContent = "Schnellster & günstigster";
        badge.style.left = x + "%";
        badge.style.top = y + "%";
        plot.appendChild(badge);

        const label = document.createElement("div");
        label.className = "cc-label is-featured";
        label.innerHTML = `${d.name}<small>${d.days} Tage · ${fmtEuro(d.price)}</small>`;
        label.style.left = x + "%";
        label.style.top = `calc(${y}% + 22px)`;
        plot.appendChild(label);
      } else {
        const label = document.createElement("div");
        label.className = "cc-label";
        label.textContent = d.name;
        label.style.left = x + "%";
        // Place above for points near the bottom, below otherwise, to avoid axis clashes
        if (y > 65) {
          label.style.top = `calc(${y}% - 22px)`;
          label.style.transform = "translate(-50%,-100%)";
        } else {
          label.style.top = `calc(${y}% + 14px)`;
        }
        plot.appendChild(label);
      }
    });

    document.addEventListener("click", (e) => {
      if (!plot.contains(e.target)) {
        plot.querySelectorAll(".cc-point.is-active").forEach((el) => el.classList.remove("is-active"));
        hideTip();
      }
    });
  }
})();