// ============================================================
//  components/trendingPanel.js  —  SKILL PULSE v2
//
//  A hyper-realistic sci-fi retractable left panel showing:
//    1. Live-updating skill demand rankings (with animated counters)
//    2. A stock-market-style SVG graph (multiple skill lines)
//    3. Rotating ticker messages
//    4. Pulsing, glowing HUD aesthetics
//
//  No Firebase. All data is simulated.
//  Exports:  mountTrendingPanel()
//            unmountTrendingPanel()
//            getTopSkills(n)
// ============================================================

// ══════════════════════════════════════════════════════════
//  SKILL DATA POOL
//  Each skill has a "base" weight (roughly its market demand)
// ══════════════════════════════════════════════════════════

const SKILL_POOL = [
  { name: "Python", base: 1200, color: "#00ffc8" },
  { name: "React", base: 940, color: "#61dafb" },
  { name: "UI/UX Design", base: 810, color: "#c084fc" },
  { name: "Node.js", base: 780, color: "#86efac" },
  { name: "Video Editing", base: 720, color: "#fb923c" },
  { name: "Figma", base: 870, color: "#f472b6" },
  { name: "TypeScript", base: 610, color: "#38bdf8" },
  { name: "SQL", base: 670, color: "#fbbf24" },
  { name: "Flutter", base: 490, color: "#67e8f9" },
  { name: "MongoDB", base: 520, color: "#4ade80" },
  { name: "AWS", base: 480, color: "#fb7185" },
  { name: "Django", base: 560, color: "#a3e635" },
];

// ══════════════════════════════════════════════════════════
//  GRAPH CONFIGURATION
// ══════════════════════════════════════════════════════════

const GRAPH_HISTORY = 40; // Number of data points visible in graph
const GRAPH_LINES = 5; // How many skills to plot simultaneously
const TICK_INTERVAL = 1800; // ms between data updates
const TICKER_INTERVAL = 3200; // ms between ticker message rotations

// ══════════════════════════════════════════════════════════
//  MODULE STATE
// ══════════════════════════════════════════════════════════

let panelOpen = false;
let panelMounted = false;
let tickInterval = null;
let tickerInterval = null;
let animFrame = null;

// Live skill data (top 10 ranked)
let skillData = [];

// Graph history: skillData[i].history = array of last GRAPH_HISTORY values
// We track the top GRAPH_LINES skills for the chart

// ══════════════════════════════════════════════════════════
//  INIT DATA
// ══════════════════════════════════════════════════════════

function initSkillData() {
  skillData = SKILL_POOL.map((skill) => ({
    ...skill,
    current: skill.base + Math.floor(Math.random() * 200 - 80),
    delta: 0,
    trend: "neutral",
    // Pre-fill history with realistic starting values
    history: Array.from({ length: GRAPH_HISTORY }, (_, i) => {
      const noise = Math.sin(i * 0.3) * 80 + Math.random() * 60 - 30;
      return Math.max(100, skill.base + noise);
    }),
  }));
  sortSkillData();
}

function sortSkillData() {
  skillData.sort((a, b) => b.current - a.current);
  skillData = skillData.slice(0, 10);
}

// ══════════════════════════════════════════════════════════
//  TICK — mutate data every TICK_INTERVAL ms
// ══════════════════════════════════════════════════════════

function tick() {
  skillData = skillData.map((skill) => {
    // Randomized change biased slightly upward (market drift)
    const change = Math.floor(Math.random() * 52 - 18);
    const newVal = Math.max(100, skill.current + change);

    // Append new value to history, remove oldest
    const newHistory = [...skill.history.slice(1), newVal];

    return {
      ...skill,
      current: newVal,
      delta: change,
      trend: change > 4 ? "up" : change < -4 ? "down" : "neutral",
      history: newHistory,
    };
  });

  // Occasionally swap adjacent ranks to simulate volatility
  if (Math.random() < 0.25) {
    const i = Math.floor(Math.random() * (skillData.length - 1));
    [skillData[i], skillData[i + 1]] = [skillData[i + 1], skillData[i]];
  }

  // Update the DOM
  updateRankRows();
  redrawGraph();
}

// ══════════════════════════════════════════════════════════
//  MOUNT — inject panel HTML into body
// ══════════════════════════════════════════════════════════

export function mountTrendingPanel() {
  if (panelMounted) return;
  panelMounted = true;
  initSkillData();

  document.body.insertAdjacentHTML("beforeend", buildPanelHTML());

  // Initial renders
  renderRankRows();
  redrawGraph();
  startTicker();

  // Wire toggle button
  document
    .getElementById("tp-toggle-btn")
    .addEventListener("click", togglePanel);

  // Start live tick
  tickInterval = setInterval(tick, TICK_INTERVAL);
}

// ══════════════════════════════════════════════════════════
//  BUILD PANEL HTML
// ══════════════════════════════════════════════════════════

function buildPanelHTML() {
  return `
  <div id="trending-panel" class="tp-panel tp-closed">

    <!-- ── Toggle tab (always visible on left edge) ── -->
     <button id="tp-toggle-btn" class="tp-toggle-tab" title="Skill Pulse — Live Market">
  <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;">
    <span class="tp-toggle-arrow" id="tp-toggle-arrow" style="font-size:24px;">◀</span>
    <span class="tp-toggle-word" style="font-size:16px; font-weight:900;">S</span>
    <span class="tp-toggle-word" style="font-size:16px; font-weight:900;">K</span>
    <span class="tp-toggle-word" style="font-size:16px; font-weight:900;">I</span>
    <span class="tp-toggle-word" style="font-size:16px; font-weight:900;">L</span>
    <span class="tp-toggle-word" style="font-size:16px; font-weight:900;">L</span>
    <span class="tp-live-dot" style="width:12px; height:12px;"></span>
  </div>
</button>
    <!-- ── Panel inner body ── -->
    <div class="tp-body">

      <!-- Scanline overlay -->
      <div class="tp-scanlines"></div>

      <!-- ── TOP HEADER ── -->
      <div class="tp-hud-header">
        <div class="tp-hud-title-row">
          <span class="tp-pulse-ring"></span>
          <span class="tp-hud-title">SKILL PULSE</span>
          <span class="tp-pulse-ring"></span>
        </div>
        <div class="tp-hud-subtitle">NEURAL MARKET INDEX v2.4</div>
        <div class="tp-hud-line"></div>
      </div>

      <!-- ── LIVE TICKER ── -->
      <div class="tp-ticker-bar">
        <span class="tp-live-badge">◉ LIVE</span>
        <div class="tp-ticker-track">
          <span class="tp-ticker-msg" id="tp-ticker-msg">Indexing 2,847 profiles...</span>
        </div>
      </div>

      <!-- ── GRAPH SECTION ── -->
      <div class="tp-graph-section">
        <div class="tp-graph-header">
          <span class="tp-graph-label">DEMAND INDEX — 40s WINDOW</span>
          <span class="tp-graph-tag" id="tp-graph-peak">PEAK: —</span>
        </div>

        <!-- Legend: which color = which skill -->
        <div class="tp-legend" id="tp-legend">
          <!-- Injected by JS -->
        </div>

        <!-- SVG Chart canvas -->
        <div class="tp-chart-wrap">
          <svg id="tp-chart-svg" class="tp-chart-svg" viewBox="0 0 280 160" preserveAspectRatio="none">
            <!-- Grid lines -->
            <g class="tp-grid-group" id="tp-grid-group"></g>
            <!-- Y-axis labels -->
            <g class="tp-yaxis-group" id="tp-yaxis-group"></g>
            <!-- Skill lines (drawn last so they're on top) -->
            <g class="tp-lines-group" id="tp-lines-group"></g>
            <!-- Glow filter -->
            <defs>
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-filter-strong" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>
      </div>

      <!-- ── DIVIDER ── -->
      <div class="tp-section-divider">
        <span class="tp-divider-label">RANK FEED</span>
      </div>

      <!-- ── RANK ROWS ── -->
      <div class="tp-ranks" id="tp-ranks">
        <!-- Injected by renderRankRows() -->
      </div>

      <!-- ── BOTTOM FOOTER ── -->
      <div class="tp-footer">
        <div class="tp-footer-glow"></div>
        <span class="tp-footer-brand">StudentWork Neural Index™</span>
        <span class="tp-footer-id">NODE-7734-ALPHA</span>
      </div>

    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
//  GRAPH DRAWING
// ══════════════════════════════════════════════════════════

const CHART_W = 280;
const CHART_H = 160;
const PAD_L = 28; // Left padding for Y-axis labels
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 14; // Bottom padding for X-axis hint

function redrawGraph() {
  const svg = document.getElementById("tp-chart-svg");
  if (!svg) return;

  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  // ── Determine global min/max across all visible skill histories
  const visibleSkills = skillData.slice(0, GRAPH_LINES);
  let globalMin = Infinity,
    globalMax = -Infinity;
  visibleSkills.forEach((s) => {
    s.history.forEach((v) => {
      if (v < globalMin) globalMin = v;
      if (v > globalMax) globalMax = v;
    });
  });
  // Add 5% padding to prevent lines hitting edges
  const range = globalMax - globalMin || 1;
  const padded = range * 0.12;
  const yMin = globalMin - padded;
  const yMax = globalMax + padded;
  const yRange = yMax - yMin;

  // Map value → SVG Y coordinate
  const toY = (v) => PAD_T + plotH - ((v - yMin) / yRange) * plotH;
  // Map index → SVG X coordinate
  const toX = (i) => PAD_L + (i / (GRAPH_HISTORY - 1)) * plotW;

  // ── Draw grid lines ───────────────────────────────────
  const gridGroup = document.getElementById("tp-grid-group");
  const yAxisGroup = document.getElementById("tp-yaxis-group");
  if (gridGroup) {
    const gridLines = 4;
    let gridHTML = "";
    let yAxisHTML = "";
    for (let g = 0; g <= gridLines; g++) {
      const ratio = g / gridLines;
      const y = PAD_T + plotH * ratio;
      const val = Math.round(yMax - ratio * yRange);
      gridHTML += `<line x1="${PAD_L}" y1="${y}" x2="${CHART_W - PAD_R}" y2="${y}"
        stroke="rgba(0,255,200,0.07)" stroke-width="0.5" />`;
      yAxisHTML += `<text x="${PAD_L - 3}" y="${y + 3.5}" 
        fill="rgba(0,255,200,0.35)" font-size="7" text-anchor="end"
        font-family="Courier New,monospace">${formatK(val)}</text>`;
    }
    // Vertical grid lines (time markers)
    for (let g = 0; g <= 4; g++) {
      const x = PAD_L + (g / 4) * plotW;
      gridHTML += `<line x1="${x}" y1="${PAD_T}" x2="${x}" y2="${PAD_T + plotH}"
        stroke="rgba(0,255,200,0.05)" stroke-width="0.5" stroke-dasharray="2,3"/>`;
    }
    gridGroup.innerHTML = gridHTML;
    yAxisGroup.innerHTML = yAxisHTML;
  }

  // ── Draw skill lines ─────────────────────────────────
  const linesGroup = document.getElementById("tp-lines-group");
  if (!linesGroup) return;
  let linesHTML = "";

  // Update peak label
  const peakEl = document.getElementById("tp-graph-peak");
  if (peakEl && visibleSkills.length) {
    peakEl.textContent = `↑ ${visibleSkills[0].name.toUpperCase()}`;
    peakEl.style.color = visibleSkills[0].color;
  }

  visibleSkills.forEach((skill, si) => {
    const pts = skill.history
      .map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      .join(" ");

    // Area fill (gradient below line)
    const areaPoints = [
      `${toX(0).toFixed(1)},${(PAD_T + plotH).toFixed(1)}`,
      ...skill.history.map(
        (v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`,
      ),
      `${toX(GRAPH_HISTORY - 1).toFixed(1)},${(PAD_T + plotH).toFixed(1)}`,
    ].join(" ");

    // Build gradient ID per skill
    const gradId = `grad-${si}`;
    linesHTML += `
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${skill.color}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="${skill.color}" stop-opacity="0.01"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#${gradId})" />
      <polyline points="${pts}"
        fill="none"
        stroke="${skill.color}"
        stroke-width="${si === 0 ? 1.8 : 1.1}"
        stroke-linejoin="round"
        stroke-linecap="round"
        filter="url(#glow-filter)"
        opacity="${si === 0 ? 1 : 0.65}"
      />`;

    // Current value dot at end of line
    const lastX = toX(GRAPH_HISTORY - 1);
    const lastY = toY(skill.history[GRAPH_HISTORY - 1]);
    linesHTML += `
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.5"
        fill="${skill.color}" filter="url(#glow-filter-strong)" />`;
  });

  linesGroup.innerHTML = linesHTML;

  // ── Update legend ─────────────────────────────────────
  const legendEl = document.getElementById("tp-legend");
  if (legendEl) {
    legendEl.innerHTML = visibleSkills
      .map(
        (s) => `
      <span class="tp-legend-item">
        <span class="tp-legend-dot" style="background:${s.color};
          box-shadow:0 0 5px ${s.color}88"></span>
        <span class="tp-legend-name">${s.name}</span>
      </span>`,
      )
      .join("");
  }
}

// ══════════════════════════════════════════════════════════
//  RANK ROWS — initial render
// ══════════════════════════════════════════════════════════

function renderRankRows() {
  const container = document.getElementById("tp-ranks");
  if (!container) return;
  container.innerHTML = skillData
    .map((s, i) => buildRankRowHTML(s, i))
    .join("");
}

function buildRankRowHTML(skill, i) {
  const maxVal = skillData[0].current || 1;
  const pct = Math.round((skill.current / maxVal) * 100);
  const arrow = skill.trend === "up" ? "▲" : skill.trend === "down" ? "▼" : "—";
  const arrowClass = `tp-arrow tp-arrow-${skill.trend}`;

  return `
  <div class="tp-rank-row" data-skill="${skill.name}">
    <span class="tp-rank-num" style="color:${skill.color}88">#${i + 1}</span>
    <div class="tp-rank-main">
      <div class="tp-rank-top">
        <span class="tp-rank-name">${skill.name}</span>
        <div class="tp-rank-right">
          <span class="${arrowClass}" id="tp-arr-${skill.name.replace(/[^a-z]/gi, "")}">${arrow}</span>
          <span class="tp-rank-val" id="tp-val-${skill.name.replace(/[^a-z]/gi, "")}">${skill.current.toLocaleString()}</span>
        </div>
      </div>
      <div class="tp-bar-track">
        <div class="tp-bar-fill" id="tp-bar-${skill.name.replace(/[^a-z]/gi, "")}"
          style="width:${pct}%;background:${skill.color};box-shadow:0 0 6px ${skill.color}88"></div>
      </div>
    </div>
  </div>`;
}

// ── Update rank rows in-place (no full re-render = no flicker)
function updateRankRows() {
  const container = document.getElementById("tp-ranks");
  if (!container) return;

  const maxVal = skillData[0].current || 1;

  skillData.forEach((skill, i) => {
    const safeKey = skill.name.replace(/[^a-z]/gi, "");
    const valEl = document.getElementById(`tp-val-${safeKey}`);
    const arrEl = document.getElementById(`tp-arr-${safeKey}`);
    const barEl = document.getElementById(`tp-bar-${safeKey}`);
    const rowEl = container.querySelector(`[data-skill="${skill.name}"]`);

    if (!valEl) {
      // Row not found (rank changed) — full re-render
      renderRankRows();
      return;
    }

    // Animate counter
    const oldVal =
      parseInt(valEl.textContent.replace(/,/g, "")) || skill.current;
    animateCounter(valEl, oldVal, skill.current);

    // Arrow
    if (arrEl) {
      arrEl.textContent =
        skill.trend === "up" ? "▲" : skill.trend === "down" ? "▼" : "—";
      arrEl.className = `tp-arrow tp-arrow-${skill.trend}`;
    }

    // Bar
    if (barEl) {
      barEl.style.width = `${Math.round((skill.current / maxVal) * 100)}%`;
    }

    // Rank number
    if (rowEl) {
      const rankEl = rowEl.querySelector(".tp-rank-num");
      if (rankEl) rankEl.textContent = `#${i + 1}`;
    }
  });
}

// ══════════════════════════════════════════════════════════
//  TICKER MESSAGES
// ══════════════════════════════════════════════════════════

const TICKER_MSGS = [
  "Indexing 2,847 active profiles...",
  "Python demand ↑ 12% this week",
  "React leads front-end sector",
  "34 new jobs posted today",
  "Figma surging in design sector",
  "SQL holds strong in fintech",
  "Flutter overtaking React Native",
  "Video Editing spike: Reels era",
  "TypeScript → 18% YoY growth",
  "1,204 freelancers online now",
  "AWS certifications in demand",
  "Django + Python combo trending",
  "UI/UX gap: 3× more demand than supply",
];

let tickerIdx = 0;
function startTicker() {
  tickerInterval = setInterval(() => {
    tickerIdx = (tickerIdx + 1) % TICKER_MSGS.length;
    const el = document.getElementById("tp-ticker-msg");
    if (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px)";
      setTimeout(() => {
        el.textContent = TICKER_MSGS[tickerIdx];
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 280);
    }
  }, TICKER_INTERVAL);
}

// ══════════════════════════════════════════════════════════
//  TOGGLE PANEL
// ══════════════════════════════════════════════════════════

function togglePanel() {
  const panel = document.getElementById("trending-panel");
  const arrow = document.getElementById("tp-toggle-arrow");
  panelOpen = !panelOpen;
  panel.classList.toggle("tp-closed", !panelOpen);
  panel.classList.toggle("tp-open", panelOpen);
  if (arrow) arrow.textContent = panelOpen ? "▶" : "◀";
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

// Smooth counter animation
function animateCounter(el, from, to) {
  const steps = 14;
  const diff = to - from;
  let step = 0;
  const id = setInterval(() => {
    step++;
    el.textContent = Math.round(from + (diff * step) / steps).toLocaleString();
    if (step >= steps) clearInterval(id);
  }, 35);
}

function formatK(val) {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val;
}

// ══════════════════════════════════════════════════════════
//  PUBLIC EXPORTS
// ══════════════════════════════════════════════════════════

// Called by dashboard to get live top skills
export function getTopSkills(n = 5) {
  return skillData.slice(0, n).map((s) => ({
    name: s.name,
    value: s.current,
    trend: s.trend,
    color: s.color,
  }));
}

// Called by app.js on logout
export function unmountTrendingPanel() {
  if (tickInterval) clearInterval(tickInterval);
  if (tickerInterval) clearInterval(tickerInterval);
  if (animFrame) cancelAnimationFrame(animFrame);
  document.getElementById("trending-panel")?.remove();
  panelMounted = false;
  panelOpen = false;
}
