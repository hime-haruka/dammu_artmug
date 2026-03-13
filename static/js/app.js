const SHEETS = {
  sectionMeta:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTATJpFhtZQRUDPE8-Tryx2F9B3nzxaxeSW_EroKwxWMx-xR0M8QH2f6iaTMZGM8BqMFvccnD2dVofH/pub?gid=1694096144&single=true&output=csv",
  slots:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTATJpFhtZQRUDPE8-Tryx2F9B3nzxaxeSW_EroKwxWMx-xR0M8QH2f6iaTMZGM8BqMFvccnD2dVofH/pub?gid=0&single=true&output=csv",
  collab:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTATJpFhtZQRUDPE8-Tryx2F9B3nzxaxeSW_EroKwxWMx-xR0M8QH2f6iaTMZGM8BqMFvccnD2dVofH/pub?gid=231874736&single=true&output=csv",
  rigSample:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTATJpFhtZQRUDPE8-Tryx2F9B3nzxaxeSW_EroKwxWMx-xR0M8QH2f6iaTMZGM8BqMFvccnD2dVofH/pub?gid=1206580608&single=true&output=csv",
  illustSample:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTATJpFhtZQRUDPE8-Tryx2F9B3nzxaxeSW_EroKwxWMx-xR0M8QH2f6iaTMZGM8BqMFvccnD2dVofH/pub?gid=2063197971&single=true&output=csv",
  formCalc:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTATJpFhtZQRUDPE8-Tryx2F9B3nzxaxeSW_EroKwxWMx-xR0M8QH2f6iaTMZGM8BqMFvccnD2dVofH/pub?gid=1401728046&single=true&output=csv",
};

const App = {
  state: {
    metaRows: [],
    slotRows: [],
    collabRows: [],
    rigSampleRows: [],
    illustSampleRows: [],
    formCalcRows: [],
  },

  async init() {
    try {
      const [
        metaRows,
        slotRows,
        collabRows,
        rigSampleRows,
        illustSampleRows,
        formCalcRows,
      ] = await Promise.all([
        fetchCsv(SHEETS.sectionMeta),
        fetchCsv(SHEETS.slots),
        fetchCsv(SHEETS.collab),
        fetchCsv(SHEETS.rigSample),
        fetchCsv(SHEETS.illustSample),
        fetchCsv(SHEETS.formCalc),
      ]);

      this.state.metaRows = metaRows;
      this.state.slotRows = slotRows;
      this.state.collabRows = collabRows;
      this.state.rigSampleRows = rigSampleRows;
      this.state.illustSampleRows = illustSampleRows;
      this.state.formCalcRows = formCalcRows;

      renderSectionMeta(this.state.metaRows);

      renderSlotSection(this.state.slotRows);
      renderCollabSection(this.state.collabRows);
      renderRigSampleSection(this.state.rigSampleRows);
      renderIllustSampleSection(this.state.illustSampleRows);
      renderFormSection(this.state.formCalcRows);

      initAccordion();
      initSliders();
      initVideoModal();
    } catch (error) {
      console.error("[App.init] failed:", error);
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

/* =========================
   CSV
========================= */

async function fetchCsv(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`CSV fetch failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return parseCsv(text);
}

function parseCsv(text) {
  const rows = [];
  const normalized = String(text || "").replace(/^\uFEFF/, "");

  if (!normalized.trim()) return rows;

  const records = [];
  let field = "";
  let record = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;

      record.push(field);
      field = "";

      if (record.some(cell => String(cell).trim() !== "")) {
        records.push(record);
      }

      record = [];
      continue;
    }

    field += char;
  }

  record.push(field);

  if (record.some(cell => String(cell).trim() !== "")) {
    records.push(record);
  }

  if (!records.length) return rows;

  const headers = records[0].map(v => String(v).trim());

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    const row = {};

    headers.forEach((header, index) => {
      row[header] = String(values[index] ?? "").trim();
    });

    rows.push(row);
  }

  return rows;
}

/* =========================
   URL HELPERS
========================= */

function toDriveDirectUrl(url = "") {
  if (!url) return "";

  if (url.includes("drive.google.com/thumbnail?id=")) {
    return url;
  }

  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w2000`;
  }

  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (openMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w2000`;
  }

  return url;
}

function extractYouTubeId(url = "") {
  const value = String(url).trim();
  if (!value) return "";

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  try {
    const parsed = new URL(value);
    const v = parsed.searchParams.get("v");
    if (v) return v;
  } catch (error) {
    /* noop */
  }

  return "";
}

/* =========================
   ESCAPE / UTILS
========================= */

function debounce(fn, delay = 100) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value);
}

function nl2br(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function appendToSectionPanel(sectionId, html) {
  const sectionEl = document.getElementById(sectionId);
  if (!sectionEl) {
    console.warn(`[appendToSectionPanel] #${sectionId} 섹션이 HTML에 없습니다.`);
    return null;
  }

  const panelInner = sectionEl.querySelector(".section-accordion__inner");
  if (!panelInner) {
    console.warn(
      `[appendToSectionPanel] #${sectionId} 내부에 .section-accordion__inner 가 없습니다.`
    );
    return null;
  }

  panelInner.insertAdjacentHTML("beforeend", html);
  return panelInner;
}

function sortByOrder(rows = []) {
  return [...rows].sort((a, b) => a.order - b.order);
}

/* =========================
   RENDER: SECTION META
========================= */

function renderSectionMeta(rows = []) {
  rows.forEach(row => {
    const sectionId = String(row.section_id || "").trim();
    const title = String(row.title || "").trim();
    const imageUrl = toDriveDirectUrl(String(row.image_url || "").trim());

    if (!sectionId) return;

    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) {
      console.warn(`[renderSectionMeta] section not found: #${sectionId}`);
      return;
    }

    sectionEl.classList.add("section-meta");
    sectionEl.dataset.sectionId = sectionId;

    /* =======================
       INTRO: no accordion
    ======================= */
    if (sectionId === "intro") {
      sectionEl.classList.add("section-intro");

      sectionEl.innerHTML = `
        <div class="container">
          ${
            imageUrl
              ? `
            <div class="intro-visual">
              <img
                src="${escapeAttribute(imageUrl)}"
                alt="인트로 이미지"
                loading="eager"
              >
            </div>
          `
              : ""
          }
        </div>
      `;
      return;
    }

    /* =======================
       DEFAULT: accordion
    ======================= */
    sectionEl.innerHTML = `
      <div class="container">
        <article class="section-accordion" data-accordion>
          <button
            class="section-accordion__header"
            type="button"
            aria-expanded="false"
            aria-controls="panel-${escapeAttribute(sectionId)}"
          >
            <span class="section-header__line" aria-hidden="true"></span>

            <span class="section-title">
              <span>${escapeHtml(title)}</span>
            </span>

            <span class="section-header__line" aria-hidden="true"></span>
          </button>

          <div
            class="section-accordion__panel"
            id="panel-${escapeAttribute(sectionId)}"
            data-accordion-panel
          >
            <div class="section-accordion__inner">
              ${
                imageUrl
                  ? `
                <div class="section-meta-visual">
                  <img
                    src="${escapeAttribute(imageUrl)}"
                    alt="${escapeAttribute(title)} 섹션 이미지"
                    loading="lazy"
                  >
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </article>
      </div>
    `;
  });
}

/* =========================
   ACCORDION
========================= */

function initAccordion() {
  const accordions = document.querySelectorAll("[data-accordion]");

  accordions.forEach(accordion => {
    const header = accordion.querySelector(".section-accordion__header");
    const panel = accordion.querySelector("[data-accordion-panel]");

    if (!header || !panel) return;

    setPanelHeight(panel, false);

    header.addEventListener("click", () => {
      const isOpen = accordion.classList.contains("is-open");
      toggleAccordion(accordion, panel, !isOpen);
    });

    panel.addEventListener("transitionend", event => {
      if (event.propertyName !== "max-height") return;

      if (accordion.classList.contains("is-open")) {
        panel.style.maxHeight = "none";
      }
    });
  });

  window.addEventListener(
    "resize",
    debounce(() => {
      document.querySelectorAll("[data-accordion]").forEach(accordion => {
        const panel = accordion.querySelector("[data-accordion-panel]");
        if (!panel) return;

        if (accordion.classList.contains("is-open")) {
          panel.style.maxHeight = "none";
        }
      });
    }, 120)
  );
}

function toggleAccordion(accordion, panel, willOpen) {
  const header = accordion.querySelector(".section-accordion__header");
  if (!header) return;

  if (willOpen) {
    accordion.classList.add("is-open");
    header.setAttribute("aria-expanded", "true");

    panel.style.display = "block";
    panel.style.overflow = "hidden";
    panel.style.maxHeight = "0px";

    requestAnimationFrame(() => {
      panel.style.maxHeight = `${panel.scrollHeight}px`;
    });
  } else {
    header.setAttribute("aria-expanded", "false");

    if (panel.style.maxHeight === "none") {
      panel.style.maxHeight = `${panel.scrollHeight}px`;
    }

    requestAnimationFrame(() => {
      panel.style.maxHeight = "0px";
      accordion.classList.remove("is-open");
    });
  }
}

function setPanelHeight(panel, isOpen) {
  panel.style.display = "block";
  panel.style.overflow = "hidden";
  panel.style.maxHeight = isOpen ? "none" : "0px";
}

/* =========================
   SLOT SECTION
========================= */

function renderSlotSection(rows = []) {
  const normalizedRows = rows
    .map(normalizeSlotRow)
    .filter(row => row.month && row.slots.length > 0);

  const html = normalizedRows.length
    ? `
      <div class="slot-board" data-slot-board>
        <div class="slot-grid">
          ${normalizedRows.map(renderSlotCard).join("")}
        </div>

        <p class="slot-note">슬롯은 입금 시 선점됩니다.</p>
      </div>
    `
    : `
      <p class="slot-empty">현재 표시할 작업 슬롯 정보가 없습니다.</p>
    `;

  appendToSectionPanel("slots", html);
}

function normalizeSlotRow(row = {}) {
  const month = String(row.month || "").trim();

  const slots = Object.keys(row)
    .filter(key => /^slot\s*\d+$/i.test(key))
    .sort((a, b) => extractSlotNumber(a) - extractSlotNumber(b))
    .map(key => normalizeSlotState(row[key]))
    .filter(state => state !== "none");

  return { month, slots };
}

function extractSlotNumber(key = "") {
  const match = String(key).match(/(\d+)/);
  return match ? Number(match[1]) : 999;
}

function normalizeSlotState(value = "") {
  const state = String(value).trim().toLowerCase();

  if (state === "closed") return "closed";
  if (state === "open") return "open";
  return "none";
}

function renderSlotCard(row) {
  return `
    <article class="slot-card">
      <div class="slot-card__head">
        <span class="slot-card__month">${escapeHtml(row.month)}</span>
      </div>

      <div
        class="slot-card__slots"
        aria-label="${escapeAttribute(row.month)} 작업 슬롯"
      >
        ${row.slots.map(renderSlotIcon).join("")}
      </div>
    </article>
  `;
}

function renderSlotIcon(state) {
  const labelMap = {
    closed: "마감 슬롯",
    open: "오픈 슬롯",
  };

  return `
    <span
      class="slot-heart is-${state}"
      role="img"
      aria-label="${labelMap[state] || "슬롯"}"
      title="${labelMap[state] || "슬롯"}"
    >❤</span>
  `;
}

/* =========================
   COLLAB SECTION
========================= */

function renderCollabSection(rows = []) {
  const normalizedRows = sortByOrder(
    rows
      .map(normalizeCollabRow)
      .filter(row => row.name && row.thumb && row.link)
  );

  const html = normalizedRows.length
    ? `
      <div class="collab-board">
        <div class="collab-grid">
          ${normalizedRows.map(renderCollabCard).join("")}
        </div>
      </div>
    `
    : `
      <p class="collab-empty">현재 표시할 협업 작가 정보가 없습니다.</p>
    `;

  appendToSectionPanel("collab", html);
}

function normalizeCollabRow(row = {}) {
  return {
    order: Number(row.order || 999),
    name: String(row.name || "").trim(),
    desc: String(row.desc || "").trim(),
    thumb: toDriveDirectUrl(String(row.thumb || "").trim()),
    link: String(row.link || "").trim(),
  };
}

function renderCollabCard(row) {
  const descHtml = row.desc
    ? `<p class="collab-card__desc">${nl2br(row.desc)}</p>`
    : "";

  return `
    <a
      class="collab-card"
      href="${escapeAttribute(row.link)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${escapeAttribute(row.name)} 아트머그 페이지로 이동"
    >
      <div class="collab-card__thumb">
        <img
          src="${escapeAttribute(row.thumb)}"
          alt="${escapeAttribute(row.name)} 썸네일"
          loading="lazy"
        >
      </div>

      <div class="collab-card__body">
        <div class="collab-card__top">
          <h3 class="collab-card__name">${escapeHtml(row.name)}</h3>
          <span class="collab-card__arrow" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
              <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
            </svg>
          </span>
        </div>

        ${descHtml}
      </div>
    </a>
  `;
}

/* =========================
   RIG SAMPLE SECTION
========================= */

function renderRigSampleSection(rows = []) {
  const normalizedRows = sortByOrder(
    rows
      .map(normalizeRigSampleRow)
      .filter(row => row.youtubeId)
  );

  const html = normalizedRows.length
    ? `
      <div class="rig-sample" data-slider="rig">
        <div class="rig-sample__viewport">
          <div class="rig-sample__track" data-slider-track>
            ${normalizedRows.map(renderRigSampleCard).join("")}
          </div>
        </div>

        <div class="rig-sample__controls">
          <button type="button" class="rig-sample__nav is-prev" data-slider-prev aria-label="이전 슬라이드">
            <span aria-hidden="true">‹</span>
          </button>

          <div class="rig-sample__dots" data-slider-dots></div>

          <button type="button" class="rig-sample__nav is-next" data-slider-next aria-label="다음 슬라이드">
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    `
    : `
      <p class="rig-sample-empty">현재 표시할 리깅 샘플이 없습니다.</p>
    `;

  appendToSectionPanel("rig_sample", html);
}

function normalizeRigSampleRow(row = {}) {
  const youtubeUrl = String(row.youtube_url || "").trim();
  const youtubeId = extractYouTubeId(youtubeUrl);

  return {
    order: Number(row.order || 999),
    title: String(row.title || "").trim(),
    desc: String(row.desc || "").trim(),
    youtubeUrl,
    youtubeId,
    thumb: youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      : "",
  };
}

function renderRigSampleCard(row) {
  const titleHtml = row.title
    ? `<h3 class="rig-card__title">${escapeHtml(row.title)}</h3>`
    : "";

  const descHtml = row.desc
    ? `<p class="rig-card__desc">${nl2br(row.desc)}</p>`
    : "";

  return `
    <article
      class="rig-card"
      data-video-id="${escapeAttribute(row.youtubeId)}"
      data-video-title="${escapeAttribute(row.title || "리깅 샘플 영상")}"
      tabindex="0"
      role="button"
      aria-label="${escapeAttribute(row.title || "리깅 샘플")} 영상 열기"
    >
      <div class="rig-card__thumb">
        <img
          src="${escapeAttribute(row.thumb)}"
          alt="${escapeAttribute(row.title || "리깅 샘플 썸네일")}"
          loading="lazy"
        >
        <span class="rig-card__play" aria-hidden="true"></span>
      </div>

      <div class="rig-card__body">
        ${titleHtml}
        ${descHtml}
      </div>
    </article>
  `;
}

/* =========================
   ILLUST SAMPLE SECTION
========================= */

function renderIllustSampleSection(rows = []) {
  const normalizedRows = sortByOrder(
    rows
      .map(normalizeIllustSampleRow)
      .filter(row => row.img)
  );

  const html = normalizedRows.length
    ? `
      <div class="illust-sample" data-slider="illust">
        <div class="illust-sample__viewport">
          <div class="illust-sample__track" data-slider-track>
            ${normalizedRows.map(renderIllustSampleCard).join("")}
          </div>
        </div>

        <div class="illust-sample__controls">
          <button type="button" class="illust-sample__nav" data-slider-prev aria-label="이전 슬라이드">‹</button>
          <div class="illust-sample__dots" data-slider-dots></div>
          <button type="button" class="illust-sample__nav" data-slider-next aria-label="다음 슬라이드">›</button>
        </div>
      </div>
    `
    : `
      <p class="illust-sample-empty">현재 표시할 일러스트 샘플이 없습니다.</p>
    `;

  appendToSectionPanel("illust_sample", html);
}

function normalizeIllustSampleRow(row = {}) {
  return {
    order: Number(row.order || 999),
    title: String(row.title || "").trim(),
    desc: String(row.desc || "").trim(),
    img: toDriveDirectUrl(String(row.img_url || "").trim()),
  };
}

function renderIllustSampleCard(row) {
  const titleHtml = row.title
    ? `<h3 class="illust-card__title">${escapeHtml(row.title)}</h3>`
    : "";

  const descHtml = row.desc
    ? `<p class="illust-card__desc">${nl2br(row.desc)}</p>`
    : "";

  return `
    <article class="illust-card">
      <div class="illust-card__image">
        <img
          src="${escapeAttribute(row.img)}"
          alt="${escapeAttribute(row.title || "일러스트 샘플")}"
          loading="lazy"
        >
      </div>

      <div class="illust-card__body">
        ${titleHtml}
        ${descHtml}
      </div>
    </article>
  `;
}

/* =========================
   GENERIC SLIDER ENGINE
========================= */

function initSliders() {
  createLoopSlider('[data-slider="rig"]', {
    visibleCount: 3,
    dotClassName: "rig-sample__dot",
    activeCardClass: "is-active",
    onUpdate({ items, currentIndex, visibleCount }) {
      items.forEach(card => card.classList.remove("is-active"));

      const centerIndex = currentIndex + Math.floor(visibleCount / 2);
      const centerCard = items[centerIndex];

      if (centerCard) {
        centerCard.classList.add("is-active");
      }
    },
  });

  createLoopSlider('[data-slider="illust"]', {
    visibleCount: 1,
    dotClassName: "illust-sample__dot",
  });
}

function createLoopSlider(selector, options = {}) {
  const root = document.querySelector(selector);
  if (!root) return null;

  const track = root.querySelector("[data-slider-track]");
  const prevBtn = root.querySelector("[data-slider-prev]");
  const nextBtn = root.querySelector("[data-slider-next]");
  const dotsWrap = root.querySelector("[data-slider-dots]");
  const viewport = track?.parentElement;

  if (!track || !viewport) return null;

  const visibleCount = Math.max(1, Number(options.visibleCount || 1));
  const activeCardClass = String(options.activeCardClass || "").trim();
  const dotClassName = String(options.dotClassName || "slider-dot").trim();
  const onUpdate = typeof options.onUpdate === "function" ? options.onUpdate : null;

  const originalItems = Array.from(track.children);
  const total = originalItems.length;

  if (!total) return null;

  if (total <= visibleCount) {
    if (dotsWrap) dotsWrap.innerHTML = "";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    if (activeCardClass) {
      originalItems.forEach(item => item.classList.add(activeCardClass));
    }

    if (onUpdate) {
      onUpdate({
        items: originalItems,
        currentIndex: 0,
        visibleCount,
        total,
      });
    }

    return null;
  }

  let currentIndex = visibleCount;
  let isAnimating = false;

  const focusOffset = Math.floor(visibleCount / 2);

  const headClones = originalItems
    .slice(0, visibleCount)
    .map(el => el.cloneNode(true));

  const tailClones = originalItems
    .slice(-visibleCount)
    .map(el => el.cloneNode(true));

  tailClones.reverse().forEach(clone => {
    track.insertBefore(clone, track.firstChild);
  });

  headClones.forEach(clone => {
    track.appendChild(clone);
  });

  const items = () => Array.from(track.children);

  if (dotsWrap) {
    dotsWrap.innerHTML = Array.from({ length: total })
      .map(
        (_, i) => `
          <button
            type="button"
            class="${dotClassName}"
            data-slider-dot="${i}"
            aria-label="${i + 1}번 슬라이드"
          ></button>
        `
      )
      .join("");
  }

  const dots = dotsWrap
    ? Array.from(dotsWrap.querySelectorAll("[data-slider-dot]"))
    : [];

    function getCardMetrics() {
    const allItems = items();
    const firstCard = allItems[0];
    if (!firstCard) {
        return { width: 0, gap: 0, viewportWidth: 0 };
    }

    const trackStyle = window.getComputedStyle(track);
    const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || "0");

    const width = firstCard.offsetWidth;

    const viewportWidth = viewport.clientWidth;

    return { width, gap, viewportWidth };
    }

  function updateDots() {
    if (!dots.length) return;

    const realIndex = ((currentIndex - visibleCount) % total + total) % total;

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === realIndex);
    });
  }

  function updateActiveState() {
    const allItems = items();

    if (activeCardClass) {
      allItems.forEach(item => item.classList.remove(activeCardClass));

      const activeIndex = currentIndex + focusOffset;
      const activeItem = allItems[activeIndex];

      if (activeItem) {
        activeItem.classList.add(activeCardClass);
      }
    }

    if (onUpdate) {
      onUpdate({
        items: allItems,
        currentIndex,
        visibleCount,
        total,
      });
    }
  }

  function updatePosition(animate = true) {
    const { width, gap, viewportWidth } = getCardMetrics();

    const focusedIndex = currentIndex + focusOffset;
    const focusedCenter =
      focusedIndex * (width + gap) + (width / 2);

    const offset = focusedCenter - (viewportWidth / 2);

    track.style.transition = animate
      ? "transform .45s cubic-bezier(.22,1,.36,1)"
      : "none";

    track.style.transform = `translate3d(-${offset}px, 0, 0)`;

    updateDots();
    updateActiveState();
  }

  function moveTo(index) {
    if (isAnimating) return;

    isAnimating = true;
    currentIndex = index;
    updatePosition(true);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      moveTo(currentIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      moveTo(currentIndex + 1);
    });
  }

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      moveTo(index + visibleCount);
    });
  });

  track.addEventListener("transitionend", event => {
    if (event.propertyName !== "transform") return;

    if (currentIndex < visibleCount) {
      currentIndex = total + visibleCount - 1;
      updatePosition(false);
    }

    if (currentIndex >= total + visibleCount) {
      currentIndex = visibleCount;
      updatePosition(false);
    }

    isAnimating = false;
  });

  window.addEventListener(
    "resize",
    debounce(() => {
      updatePosition(false);
    }, 120)
  );

  updatePosition(false);
  return { root, track };
}

/* =========================
   VIDEO MODAL
========================= */

function initVideoModal() {
  if (document.querySelector("[data-video-modal]")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="video-modal" data-video-modal hidden>
        <div class="video-modal__backdrop" data-video-close></div>

        <div class="video-modal__dialog" role="dialog" aria-modal="true" aria-label="영상 보기">
          <button type="button" class="video-modal__close" data-video-close aria-label="닫기">×</button>

          <div class="video-modal__frame">
            <iframe
              data-video-iframe
              src=""
              title="YouTube video player"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowfullscreen
            ></iframe>
          </div>
        </div>
      </div>
    `
  );

  const modal = document.querySelector("[data-video-modal]");
  const iframe = modal.querySelector("[data-video-iframe]");
  const closeButtons = modal.querySelectorAll("[data-video-close]");

  document.addEventListener("click", event => {
    const card = event.target.closest(".rig-card");
    if (!card) return;

    openVideoModal(card.dataset.videoId);
  });

  document.addEventListener("keydown", event => {
    const card = event.target.closest?.(".rig-card");

    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openVideoModal(card.dataset.videoId);
      return;
    }

    if (event.key === "Escape" && !modal.hasAttribute("hidden")) {
      closeVideoModal();
    }
  });

  closeButtons.forEach(button => {
    button.addEventListener("click", closeVideoModal);
  });

  function openVideoModal(videoId) {
    if (!videoId) return;

    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    modal.hidden = false;
    document.body.classList.add("is-video-modal-open");
  }

  function closeVideoModal() {
    iframe.src = "";
    modal.hidden = true;
    document.body.classList.remove("is-video-modal-open");
  }
}

/* =========================
   FORM SECTION
========================= */

function renderFormSection(rows = []) {
  const normalizedRows = rows
    .map(normalizeFormCalcRow)
    .filter(row => row.group && row.label);

  const grouped = groupBy(normalizedRows, row => row.group);

  const baseGroups = Object.keys(grouped).filter(
    group => group !== "추가 옵션" && group !== "할인 옵션"
  );

  const optionRows = grouped["추가 옵션"] || [];
  const discountRows = grouped["할인 옵션"] || [];

  const html = `
    <div class="form-wrap" data-form-section>
      <div class="form-stack">

        <section class="form-card">
          <div class="form-card__inner">
            <div class="form-card__head">
              <h3 class="form-card__title">신청 양식</h3>
            </div>

            <p class="form-card__desc">
              아래 내용을 입력한 뒤 복사 버튼을 누르면, 선택한 견적 내용까지 함께 복사됩니다.
            </p>

            <div class="form-fields">
              <div class="form-field">
                <label class="form-label" for="form-activity-name">활동명</label>
                <input
                  type="text"
                  id="form-activity-name"
                  class="form-input"
                  data-form-activity
                  placeholder="활동명을 입력해 주세요"
                >
              </div>

              <div class="form-field">
                <label class="form-label" for="form-character-data">캐릭터 자료</label>
                <textarea
                  id="form-character-data"
                  class="form-textarea"
                  data-form-character
                  placeholder="자료 링크, 설명, 참고 사항 등을 입력해 주세요."
                ></textarea>
              </div>

              <div class="form-field">
                <label class="form-label" for="form-features">특징</label>
                <textarea
                  id="form-features"
                  class="form-textarea"
                  data-form-features
                  placeholder="성격, 분위기, 표정, 포인트 요소 등을 적어 주세요."
                ></textarea>
              </div>

              <div class="form-field">
                <label class="form-label" for="form-request">추가 요청사항</label>
                <textarea
                  id="form-request"
                  class="form-textarea"
                  data-form-request
                  placeholder="추가로 전달하고 싶은 요청사항을 적어 주세요."
                ></textarea>
              </div>

              <div class="form-inline">
                <div class="form-field">
                  <label class="form-label" for="form-review-event">리뷰 이벤트 참여 여부</label>
                  <select
                    id="form-review-event"
                    class="form-select"
                    data-form-review
                  >
                    <option value="">선택해 주세요</option>
                    <option value="O">O</option>
                    <option value="X">X</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="form-copy-btn" data-form-copy>
                양식 + 견적 복사하기
              </button>

              <p class="form-help">
                입력한 내용과 현재 선택한 견적 옵션이 함께 복사됩니다.
              </p>
            </div>
          </div>
        </section>

        <section class="form-card">
          <div class="form-card__inner">
            <div class="form-card__head">
              <h3 class="form-card__title">견적 계산기</h3>
            </div>

            <p class="form-card__desc">
              기본 작업과 추가 옵션을 선택하면 예상 금액을 바로 확인할 수 있습니다.
            </p>

            <div class="form-calc" data-form-calc>
              <div class="form-field">
                <label class="form-label" for="form-base-group">분류</label>
                <select class="form-select" id="form-base-group" data-calc-group>
                  <option value="">선택해 주세요</option>
                  ${baseGroups
                    .map(group => `<option value="${escapeAttribute(group)}">${escapeHtml(group)}</option>`)
                    .join("")}
                </select>
              </div>

              <div class="form-field">
                <label class="form-label" for="form-base-item">기본 작업</label>
                <select class="form-select" id="form-base-item" data-calc-base disabled>
                  <option value="">먼저 분류를 선택해 주세요</option>
                </select>
              </div>

              ${
                optionRows.length
                  ? `
                <div class="form-field">
                  <span class="form-label">추가 옵션</span>
                  <div class="form-option-list">
                    ${optionRows.map(renderFormOption).join("")}
                  </div>
                </div>
              `
                  : ""
              }

              ${
                discountRows.length
                  ? `
                <div class="form-field">
                  <span class="form-label">할인 옵션</span>
                  <div class="form-option-list">
                    ${discountRows.map(renderFormDiscount).join("")}
                  </div>
                </div>
              `
                  : ""
              }

              <div class="form-summary" data-calc-summary>
                <div class="form-summary__row">
                  <strong>기본 금액</strong>
                  <span data-summary-base>선택 전</span>
                </div>

                <div class="form-summary__row">
                  <strong>추가 옵션</strong>
                  <span data-summary-options>0원</span>
                </div>

                <div class="form-summary__row">
                  <strong>할인 금액</strong>
                  <span data-summary-discount>-0원</span>
                </div>

                <div class="form-summary__total">
                  <span class="form-summary__total-label">예상 견적</span>
                  <strong class="form-summary__total-value" data-summary-total>0원</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  `;

  appendToSectionPanel("form", html);
  initFormSection(normalizedRows);
}

function normalizeFormCalcRow(row = {}) {
  return {
    group: String(row.group || "").trim(),
    label: String(row.label || "").trim(),
    desc: String(row.desc || "").trim(),
    calctype: String(row.calctype || "").trim().toLowerCase(),
    price: Number(String(row.price || "0").replace(/[^\d.-]/g, "")) || 0,
  };
}

function renderFormOption(row) {
  if (row.calctype === "unit") {
    return `
      <div class="form-check">
        <span class="form-check__text">
          <span class="form-check__label">${escapeHtml(row.label)}</span>
          ${row.desc ? `<span class="form-check__desc">${escapeHtml(row.desc)}</span>` : ""}
          <span class="form-check__price">${formatPrice(row.price)} / 1개</span>
        </span>

        <input
          type="number"
          class="form-number"
          min="0"
          step="1"
          value="0"
          data-option-unit="${escapeAttribute(row.label)}"
          aria-label="${escapeAttribute(row.label)} 수량"
        >
      </div>
    `;
  }

  return `
    <label class="form-check">
      <input type="checkbox" data-option-add="${escapeAttribute(row.label)}">
      <span class="form-check__text">
        <span class="form-check__label">${escapeHtml(row.label)}</span>
        ${row.desc ? `<span class="form-check__desc">${escapeHtml(row.desc)}</span>` : ""}
        <span class="form-check__price">${formatPrice(row.price)}</span>
      </span>
    </label>
  `;
}

function renderFormDiscount(row) {
  return `
    <label class="form-check">
      <input type="checkbox" data-option-discount="${escapeAttribute(row.label)}">
      <span class="form-check__text">
        <span class="form-check__label">${escapeHtml(row.label)}</span>
        ${row.desc ? `<span class="form-check__desc">${escapeHtml(row.desc)}</span>` : ""}
        <span class="form-check__price">-${formatPrice(row.price)}</span>
      </span>
    </label>
  `;
}

function initFormSection(rows = []) {
  const root = document.querySelector("[data-form-section]");
  if (!root) return;

  const copyBtn = root.querySelector("[data-form-copy]");
  const groupSelect = root.querySelector("[data-calc-group]");
  const baseSelect = root.querySelector("[data-calc-base]");

  const activityInput = root.querySelector("[data-form-activity]");
  const characterInput = root.querySelector("[data-form-character]");
  const featuresInput = root.querySelector("[data-form-features]");
  const requestInput = root.querySelector("[data-form-request]");
  const reviewSelect = root.querySelector("[data-form-review]");

  const baseSummary = root.querySelector("[data-summary-base]");
  const optionSummary = root.querySelector("[data-summary-options]");
  const discountSummary = root.querySelector("[data-summary-discount]");
  const totalSummary = root.querySelector("[data-summary-total]");

  const baseRows = rows.filter(
    row => row.group !== "추가 옵션" && row.group !== "할인 옵션"
  );
  const optionRows = rows.filter(row => row.group === "추가 옵션");
  const discountRows = rows.filter(row => row.group === "할인 옵션");

  const groupedBase = groupBy(baseRows, row => row.group);

  function fillBaseOptions(group) {
    const items = groupedBase[group] || [];

    if (!items.length) {
      baseSelect.innerHTML = `<option value="">먼저 분류를 선택해 주세요</option>`;
      baseSelect.disabled = true;
      updateSummary();
      return;
    }

    baseSelect.innerHTML = `
      <option value="">선택해 주세요</option>
      ${items
        .map(
          item => `
            <option
              value="${escapeAttribute(item.label)}"
              data-price="${item.price}"
              data-group="${escapeAttribute(item.group)}"
            >
              ${escapeHtml(item.label)} (${formatPrice(item.price)})
            </option>
          `
        )
        .join("")}
    `;

    baseSelect.disabled = false;
    baseSelect.value = "";
    updateSummary();
  }

  function getBaseSelection() {
    const selected = baseSelect.selectedOptions?.[0];
    if (!selected || !selected.dataset.price) {
      return null;
    }

    return {
      group: selected.dataset.group || groupSelect.value || "",
      label: selected.value || "",
      price: Number(selected.dataset.price) || 0,
    };
  }

  function getCheckedOptions() {
    const result = [];

    optionRows.forEach(row => {
      if (row.calctype === "add") {
        const input = root.querySelector(`[data-option-add="${cssEscape(row.label)}"]`);
        if (input?.checked) {
          result.push({
            label: row.label,
            detail: "",
            price: row.price,
          });
        }
      }

      if (row.calctype === "unit") {
        const input = root.querySelector(`[data-option-unit="${cssEscape(row.label)}"]`);
        const count = Number(input?.value || 0);

        if (count > 0) {
          result.push({
            label: row.label,
            detail: `${count}개`,
            price: row.price * count,
          });
        }
      }
    });

    return result;
  }

  function getCheckedDiscounts() {
    const result = [];

    discountRows.forEach(row => {
      const input = root.querySelector(`[data-option-discount="${cssEscape(row.label)}"]`);
      if (input?.checked) {
        result.push({
          label: row.label,
          price: row.price,
        });
      }
    });

    return result;
  }

  function getOptionTotal() {
    return getCheckedOptions().reduce((sum, item) => sum + item.price, 0);
  }

  function getDiscountTotal() {
    return getCheckedDiscounts().reduce((sum, item) => sum + item.price, 0);
  }

  function updateSummary() {
    const base = getBaseSelection();
    const optionPrice = getOptionTotal();
    const discountPrice = getDiscountTotal();
    const total = Math.max(0, (base?.price || 0) + optionPrice - discountPrice);

    baseSummary.textContent = base ? formatPrice(base.price) : "선택 전";
    optionSummary.textContent = formatPrice(optionPrice);
    discountSummary.textContent = `-${formatPrice(discountPrice)}`;
    totalSummary.textContent = formatPrice(total);
  }

  function buildCopyText() {
    const activity = String(activityInput?.value || "").trim();
    const character = String(characterInput?.value || "").trim();
    const features = String(featuresInput?.value || "").trim();
    const request = String(requestInput?.value || "").trim();
    const review = String(reviewSelect?.value || "").trim();

    const base = getBaseSelection();
    const options = getCheckedOptions();
    const discounts = getCheckedDiscounts();
    const optionTotal = getOptionTotal();
    const discountTotal = getDiscountTotal();
    const total = Math.max(0, (base?.price || 0) + optionTotal - discountTotal);

    const extraOptionLines = [];

    if (base) {
      extraOptionLines.push(
        `- 기본 작업 : ${base.group} / ${base.label} (${formatPrice(base.price)})`
      );
    }

    options.forEach(item => {
      extraOptionLines.push(
        `- ${item.label}${item.detail ? ` (${item.detail})` : ""} (${formatPrice(item.price)})`
      );
    });

    discounts.forEach(item => {
      extraOptionLines.push(
        `- 할인 : ${item.label} (-${formatPrice(item.price)})`
      );
    });

    if (!extraOptionLines.length) {
      extraOptionLines.push("- 없음");
    }

    return [
      `활동명 : ${activity}`,
      ``,
      `캐릭터 자료 : ${character}`,
      `자세할수록 좋습니다. 준비하신 자료가 없으시다면 목소리를 녹음해서 들려주세요!`,
      `떠오르는 이미지를 토대로 상의 후 캐릭터 디자인을 도와드립니다.`,
      ``,
      `특징 : ${features}`,
      ``,
      `추가 요청사항 : ${request}`,
      ``,
      `추가옵션 :`,
      ...extraOptionLines,
      ``,
      `리뷰 이벤트 참여 여부 : ${review || "O / X"}`,
      ``,
      `[예상 견적]`,
      `- 추가 옵션 합계 : ${formatPrice(optionTotal)}`,
      `- 할인 합계 : -${formatPrice(discountTotal)}`,
      `- 총 예상 금액 : ${formatPrice(total)}`,
    ].join("\n");
  }

  async function handleCopy() {
    const value = buildCopyText();

    try {
      await navigator.clipboard.writeText(value);
      copyBtn.classList.add("is-done");
      copyBtn.textContent = "복사 완료!";
      setTimeout(() => {
        copyBtn.classList.remove("is-done");
        copyBtn.textContent = "양식 + 견적 복사하기";
      }, 1800);
    } catch (error) {
      const temp = document.createElement("textarea");
      temp.value = value;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();

      copyBtn.classList.add("is-done");
      copyBtn.textContent = "복사 완료!";
      setTimeout(() => {
        copyBtn.classList.remove("is-done");
        copyBtn.textContent = "양식 + 견적 복사하기";
      }, 1800);
    }
  }

  copyBtn?.addEventListener("click", handleCopy);

  groupSelect?.addEventListener("change", event => {
    fillBaseOptions(event.target.value);
  });

  baseSelect?.addEventListener("change", updateSummary);

  root.querySelectorAll("[data-option-add]").forEach(input => {
    input.addEventListener("change", updateSummary);
  });

  root.querySelectorAll("[data-option-unit]").forEach(input => {
    input.addEventListener("input", updateSummary);
  });

  root.querySelectorAll("[data-option-discount]").forEach(input => {
    input.addEventListener("change", updateSummary);
  });

  updateSummary();
}

function groupBy(rows = [], keyGetter) {
  return rows.reduce((acc, row) => {
    const key = keyGetter(row);
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
}

function formatPrice(value = 0) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function cssEscape(value = "") {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }

  return String(value).replace(/["\\]/g, "\\$&");
}