// ═══════════════════════════════════════════════════════════════
// main.js  —  Application state, rendering, interactivity
// Depends on: d3 (CDN), data.js (FOODS, METRICS, SUBS)
// ═══════════════════════════════════════════════════════════════

// ── APPLICATION STATE ─────────────────────────────────────────
const DEFAULT_SERVING = 3;

const S = {
  selected:    new Set(['beef-beef-herd', 'pig-meat', 'other-vegetables']),
  servings:    {},
  metrics:     new Set(['ghg', 'land', 'feed', 'process', 'eutro']),
  highlighted: null,   // food id currently highlighted (hover or 3D click)
  /** Pinned food on parallel sets: all its metric ribbons stay emphasized until toggled off. */
  psPinnedFood: null,  // null | food id string
  /** Food id while pointer is over a parallel-sets ribbon (vs sidebar-only highlight). */
  psRibbonHoveredFood: null,
  activeView:  'v1',
};

// 3D scene state (isolated from main app state)
const scene3dState = {
  rotY: 0.5, rotX: 0.35,
  /** Perspective scale multiplier (scroll wheel). */
  zoom: 1,
  dragging: false, lastX: 0, lastY: 0,
  clickedFood: null,
  canvas: null, ctx: null,
};

/** Lower = can zoom out further (smaller landscape on canvas). */
const SCENE3D_ZOOM_MIN = 0.14;
const SCENE3D_ZOOM_MAX = 2.85;

function scene3DProjParams(canvas) {
  const W = canvas.width, H = canvas.height;
  const rx = scene3dState.rotX, ry = scene3dState.rotY;
  const cx = W * 0.5, cy = H * 0.52;
  const scale = Math.min(W, H) * 0.74 * scene3dState.zoom;
  const proj = (x, y, z) => project3D(x, y, z, rx, ry, cx, cy, scale);
  return { W, H, cx, cy, scale, proj };
}

// ── TOOLTIP ───────────────────────────────────────────────────
const tipEl = document.getElementById('tip');

function showTip(html, e) {
  tipEl.innerHTML = html;
  tipEl.style.opacity = 1;
  placeTip(e);
}
function placeTip(e) {
  tipEl.style.left = Math.min(e.clientX + 16, window.innerWidth - 240) + 'px';
  tipEl.style.top  = (e.clientY - 10) + 'px';
}
function hideTip() { tipEl.style.opacity = 0; }

// ── HELPERS ───────────────────────────────────────────────────
function getSelected()   { return FOODS.filter(f => S.selected.has(f.id)); }

/** Selected foods in category order, then name (matches sidebar grouping). */
function getSelectedSorted() {
  const sel = getSelected();
  const order = new Map((typeof FOOD_CATEGORIES !== 'undefined' ? FOOD_CATEGORIES : []).map((c, i) => [c.id, i]));
  return [...sel].sort((a, b) => {
    const ca = order.get(a.category) ?? 999;
    const cb = order.get(b.category) ?? 999;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });
}
function getMetrics() {
  return METRICS.filter(m => S.metrics.has(m.key));
}
function ensureServing(id) {
  if (S.servings[id] == null || S.servings[id] < 1) S.servings[id] = DEFAULT_SERVING;
  return S.servings[id];
}

function scaledVal(food, metricKey) { return food[metricKey] * ensureServing(food.id); }

/** Usable width for Breakdown charts when the parent may report 0 (panel hidden on another tab). */
function breakdownContentWidth(svgEl, inset) {
  const parent = svgEl?.parentElement;
  const inner = (parent?.offsetWidth ?? 0) - inset;
  if (inner >= 160) return inner;
  const aside = document.querySelector('.sidebar');
  const aw = aside?.getBoundingClientRect?.().width ?? 260;
  return Math.max(280, Math.floor(window.innerWidth - aw - inset - 72));
}

/** Resolve a CSS variable string like 'var(--c-beef)' to its hex value */
function resolveColor(colorStr) {
  if (!colorStr.includes('var(')) return colorStr;
  const varName = colorStr.replace('var(', '').replace(')', '').trim();
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/** Darken / lighten a #rrggbb color for 3D face shading */
function shadeHex(hex, factor) {
  const h = String(hex).trim();
  if (!h.startsWith('#') || h.length < 7) return h;
  const clamp = v => Math.max(0, Math.min(255, Math.round(v * factor)));
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

// ── SIDEBAR ───────────────────────────────────────────────────
const FOOD_CAT_OPEN_KEY = 'dnd_food_cat_open_v1';

function loadFoodCatOpenState() {
  try {
    const o = JSON.parse(localStorage.getItem(FOOD_CAT_OPEN_KEY) || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function saveFoodCatOpenState(catId, open) {
  const s = loadFoodCatOpenState();
  s[catId] = open;
  localStorage.setItem(FOOD_CAT_OPEN_KEY, JSON.stringify(s));
}

function buildSidebar() {
  buildFoodList();
  buildSelectedFoodsTable();
  buildMetricFilters();
  buildServings();
}

function selectAllFoods() {
  FOODS.forEach(f => {
    S.selected.add(f.id);
    ensureServing(f.id);
  });
  buildSidebar();
  renderAll();
}

function deselectAllFoods() {
  S.selected.clear();
  S.highlighted = null;
  S.psPinnedFood = null;
  S.psRibbonHoveredFood = null;
  scene3dState.clickedFood = null;
  buildSidebar();
  renderAll();
}

function buildFoodList() {
  const fl = document.getElementById('food-list');
  fl.innerHTML = '';
  const groups = typeof foodsGroupedByCategory === 'function'
    ? foodsGroupedByCategory()
    : [{ id: '_all', label: 'Foods', foods: FOODS }];
  const openState = loadFoodCatOpenState();

  groups.forEach(group => {
    const catId = group.id || '_misc';
    const det = document.createElement('details');
    det.className = 'food-cat';
    if (openState[catId] === false) det.removeAttribute('open');
    else det.setAttribute('open', '');

    const sum = document.createElement('summary');
    sum.className = 'food-cat-label';
    sum.textContent = group.label;
    det.appendChild(sum);

    const body = document.createElement('div');
    body.className = 'food-cat-body';

    group.foods.forEach(f => {
      const el = document.createElement('div');
      el.className = 'food-item' + (S.selected.has(f.id) ? ' active' : '');
      el.id = 'fi-' + f.id;
      el.style.setProperty('--food-color', f.color);
      el.innerHTML = `
      <span class="food-icon-wrap" aria-hidden="true">${typeof foodIconHtml === 'function' ? foodIconHtml(f.id, 22) : ''}</span>
      <div class="food-label">
        <div class="food-name">${f.name}</div>
        <div class="food-sub">${f.ghg} kg CO₂/kg</div>
      </div>
      <div class="food-toggle"></div>
    `;
      el.addEventListener('click', () => toggleFood(f.id));
      el.addEventListener('mouseenter', () => {
        if (S.activeView !== 'v2') highlightFood(f.id);
      });
      el.addEventListener('mouseleave', () => {
        if (S.activeView !== 'v2') highlightFood(null);
      });
      body.appendChild(el);
    });

    det.appendChild(body);
    det.addEventListener('toggle', () => saveFoodCatOpenState(catId, det.open));
    fl.appendChild(det);
  });
}

function buildSelectedFoodsTable() {
  const root = document.getElementById('selected-foods-table');
  if (!root) return;
  const sel = getSelectedSorted();
  if (!sel.length) {
    root.innerHTML = '<div class="sidebar-selected-empty">No foods selected. Tap items above.</div>';
    return;
  }
  const tbody = document.createElement('tbody');
  sel.forEach(f => {
    const tr = document.createElement('tr');
    tr.dataset.foodId = f.id;
    const tdFood = document.createElement('td');
    tdFood.className = 'sft-food-cell';
    const foodWrap = document.createElement('div');
    foodWrap.className = 'sft-food';
    foodWrap.style.setProperty('--food-color', f.color);
    if (typeof foodIconHtml === 'function') {
      const iconHolder = document.createElement('span');
      iconHolder.className = 'sft-icon';
      iconHolder.innerHTML = foodIconHtml(f.id, 16);
      foodWrap.appendChild(iconHolder);
    }
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sft-name';
    nameSpan.textContent = f.name;
    foodWrap.appendChild(nameSpan);
    tdFood.appendChild(foodWrap);

    const tdGhg = document.createElement('td');
    tdGhg.className = 'sft-num';
    tdGhg.textContent = Number(f.ghg.toFixed(2));

    const tdSrv = document.createElement('td');
    tdSrv.className = 'sft-num sft-serving';
    tdSrv.textContent = String(ensureServing(f.id));

    tr.appendChild(tdFood);
    tr.appendChild(tdGhg);
    tr.appendChild(tdSrv);

    tr.addEventListener('mouseenter', () => {
      if (S.activeView !== 'v2') highlightFood(f.id);
    });
    tr.addEventListener('mouseleave', () => {
      if (S.activeView !== 'v2') highlightFood(null);
    });
    tbody.appendChild(tr);
  });

  const table = document.createElement('table');
  table.className = 'sidebar-selected-table';
  table.innerHTML = '<thead><tr><th scope="col">Food</th><th scope="col">CO₂/kg</th><th scope="col">/wk</th></tr></thead>';
  table.appendChild(tbody);

  root.innerHTML = '';
  const scroll = document.createElement('div');
  scroll.className = 'sidebar-selected-table-scroll';
  scroll.appendChild(table);
  root.appendChild(scroll);
}

function buildMetricFilters() {
  const mf = document.getElementById('metric-filters');
  mf.innerHTML = '';
  METRICS.forEach(m => {
    const el = document.createElement('div');
    el.className = 'food-item' + (S.metrics.has(m.key) ? ' active' : '');
    el.id = 'mf-' + m.key;
    el.style.setProperty('--food-color', m.color);
    el.innerHTML = `
      <span class="food-icon-wrap" aria-hidden="true"><span class="metric-type-dot"></span></span>
      <div class="food-label">
        <div class="food-name">${m.full}</div>
        <div class="food-sub">${m.unit}</div>
      </div>
      <div class="food-toggle"></div>
    `;
    el.addEventListener('click', () => toggleMetric(m.key));
    mf.appendChild(el);
  });
}

function buildServings() {
  const area = document.getElementById('servings-area');
  const sel = getSelectedSorted();
  if (!sel.length) {
    area.innerHTML = '<div style="font-size:11px;color:var(--ink3);font-style:italic">Select a food above</div>';
    return;
  }
  area.innerHTML = '';
  sel.forEach(f => {
    const row = document.createElement('div');
    row.className = 'serving-row';
    row.style.setProperty('--food-color', f.color);
    row.innerHTML = `
      <span class="serving-name"><span class="serving-icon">${typeof foodIconHtml === 'function' ? foodIconHtml(f.id, 17) : ''}</span> ${f.name}</span>
      <div class="serving-ctrl">
        <button class="s-btn" onclick="changeServing('${f.id}', -1)">−</button>
        <span class="s-val" id="sval-${f.id}">${ensureServing(f.id)}</span>
        <button class="s-btn" onclick="changeServing('${f.id}', 1)">+</button>
      </div>
    `;
    area.appendChild(row);
  });
}

// Exposed globally for inline onclick handlers in dynamically-built HTML
window.changeServing = function(id, delta) {
  const cur = ensureServing(id);
  S.servings[id] = Math.max(1, Math.min(14, cur + delta));
  const el = document.getElementById('sval-' + id);
  if (el) el.textContent = S.servings[id];
  const row = document.querySelector(`#selected-foods-table tr[data-food-id="${CSS.escape(id)}"]`);
  const srvCell = row?.querySelector('.sft-serving');
  if (srvCell) srvCell.textContent = String(S.servings[id]);
  renderAll();
};

// ── FOOD / METRIC TOGGLE ──────────────────────────────────────
function toggleFood(id) {
  if (S.selected.has(id)) S.selected.delete(id);
  else {
    S.selected.add(id);
    ensureServing(id);
  }
  document.getElementById('fi-' + id).classList.toggle('active', S.selected.has(id));
  buildSelectedFoodsTable();
  buildServings();
  renderAll();
}

function toggleMetric(key) {
  if (S.metrics.has(key)) {
    if (S.metrics.size <= 1) return; // always keep at least 1 metric
    S.metrics.delete(key);
  } else {
    S.metrics.add(key);
  }
  document.getElementById('mf-' + key).classList.toggle('active', S.metrics.has(key));
  renderAll();
}

// ── LINKED HIGHLIGHTING ───────────────────────────────────────
/** Food used to dim sidebar / matrix / donut / area (hover wins over pinned ribbon’s food). */
function linkedDimFoodId() {
  return S.highlighted || S.psPinnedFood || null;
}

function applyPsRibbonOpacities() {
  if (S.activeView !== 'v1') return;
  d3.selectAll('.ps-ribbon').attr('opacity', function() {
    const fid = this.getAttribute('data-food-id');
    if (S.psRibbonHoveredFood) {
      return fid === S.psRibbonHoveredFood ? 1 : 0.09;
    }
    if (S.highlighted) {
      return fid === S.highlighted ? 1 : 0.09;
    }
    if (S.psPinnedFood) {
      return fid === S.psPinnedFood ? 1 : 0.11;
    }
    return 1;
  });
}

function refreshMatrixDonutIfV1() {
  if (S.activeView === 'v1') {
    renderMatrix();
    renderDonut();
  }
}

function highlightFood(id) {
  S.highlighted = id;
  // 3D tab: no hover-linked dimming; foods stay full opacity; meter uses click only
  if (S.activeView === 'v2') {
    FOODS.forEach(f => {
      const el = document.getElementById('fi-' + f.id);
      if (el) el.style.opacity = 1;
    });
    renderImpactMeter();
    return;
  }
  const dimId = linkedDimFoodId();
  FOODS.forEach(f => {
    const el = document.getElementById('fi-' + f.id);
    if (el) el.style.opacity = (!dimId || dimId === f.id) ? 1 : 0.35;
  });
  applyPsRibbonOpacities();
}

// ── VIEW NAVIGATION ───────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.view;
    S.activeView = v;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(v).classList.add('active');
    if (v === 'v2') {
      S.highlighted = null;
      FOODS.forEach(f => {
        const el = document.getElementById('fi-' + f.id);
        if (el) el.style.opacity = 1;
      });
      setTimeout(() => initCanvas3D(), 50);
    }
    renderAll();
  });
});

// ── MASTER RENDER ─────────────────────────────────────────────
function renderAll() {
  // Breakdown (v1) charts follow sidebar selections even when another tab is visible,
  // so switching back to Breakdown never shows a stale matrix / parallel sets / donut.
  renderStacked();
  renderMatrix();
  renderDonut();
  renderMetricLegend();

  if (S.activeView === 'v2') {
    paint3D();
    renderRadar();
    renderImpactMeter();
  } else if (S.activeView === 'v3') {
    renderArea();
    renderSubs();
  } else if (S.activeView === 'v4') {
    if (typeof renderAccountDashboard === 'function') renderAccountDashboard();
  }
}

// ═══════════════════════════════════════════════════════════════
// VIEW 1 — PARALLEL SETS (foods left → metrics right, gradient fills)
// ═══════════════════════════════════════════════════════════════
function psRibbonPathLR(y0L, y1L, y0R, y1R, xL, xR) {
  const xm = (xL + xR) / 2;
  return `M ${xL} ${y0L} L ${xL} ${y1L} C ${xm} ${y1L} ${xm} ${y1R} ${xR} ${y1R} L ${xR} ${y0R} C ${xm} ${y0R} ${xm} ${y0L} ${xL} ${y0L} Z`;
}

function psGradientId(fId, mKey, scope = '') {
  const p = scope ? `${String(scope).replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  return `psg_${p}${String(fId).replace(/[^a-zA-Z0-9_-]/g, '_')}_${String(mKey).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function psParallelRowKey(row) {
  return row.f.id;
}

function psRowMetric(row, met) {
  return scaledVal(row.f, met.key);
}

/** Visual weight for parallel-set band heights (sublinear so large contributions are not huge ribbons). */
function psLayoutWeight(actualWeekly) {
  const v = Number(actualWeekly);
  if (!(v > 0)) return 0;
  return Math.sqrt(v);
}

function psRowMetricLayout(row, met) {
  return psLayoutWeight(psRowMetric(row, met));
}

/**
 * rows: { kind:'food', f }
 * opts.emptyMessage — draw only a hint
 * opts.subtitle — optional chart title (italic line)
 * opts.compactTitle — slightly smaller top margin when true
 */
function renderParallelSetsIntoSvg(svgEl, rows, mets, opts = {}) {
  const W = breakdownContentWidth(svgEl, 48);
  const mg = { t: 8, r: 16, b: 12, l: 16 };

  if (opts.emptyMessage) {
    const H = 200;
    const h = H - mg.t - mg.b;
    const w = W - mg.l - mg.r;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.innerHTML = '';
    d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`)
      .append('text').attr('x', w / 2).attr('y', h / 2)
      .attr('text-anchor', 'middle').attr('fill', 'var(--ink3)').attr('font-size', 12)
      .text(opts.emptyMessage);
    return;
  }

  if (!rows.length || !mets.length) return;

  const gradScope = opts.gradientScope || `g${Math.random().toString(36).slice(2, 11)}`;

  const nR = rows.length;
  const nMet = mets.length;
  const foodTight = Math.min(1, Math.max(0, (nR - 4) / 28));
  const metTight = Math.min(1, Math.max(0, (nMet - 3) / 5));
  const minPxPerFood = Math.max(34, Math.round(80 - 38 * foodTight));
  const minPxPerMetric = Math.max(78, Math.round(162 - 52 * metTight));
  const minFoodBand = Math.max(11, Math.round(24 - 7 * foodTight));
  const minMetricBand = Math.max(11, Math.round(20 - 5 * metTight));
  const selectionFloor = Math.max(90, Math.round(26 + 34 * nR + 22 * nMet));
  let innerH = Math.max(
    selectionFloor,
    nR * minPxPerFood,
    nMet * minPxPerMetric,
  );
  const yTitle = opts.compactTitle ? 8 : 12;
  const yTop = opts.compactTitle ? 28 : 36;
  const bottomPad = 12;

  const longestLeft = d3.max(rows, r => r.f.name.length) || 8;
  const labelPadL = Math.min(124, Math.max(58, Math.round(longestLeft * 4.9 + 26)));
  const labelPadR = Math.min(100, Math.max(58, Math.round(52 + 8 * nMet)));

  const sumMetric = met => d3.sum(rows, r => psRowMetricLayout(r, met));
  const sumRow = r => d3.sum(mets, m => psRowMetricLayout(r, m));
  const T = d3.sum(mets, sumMetric);
  if (T <= 0 || innerH <= 0) {
    const h0 = innerH + yTop + bottomPad;
    const H0 = h0 + mg.t + mg.b;
    const w0 = W - mg.l - mg.r;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H0}`);
    svgEl.innerHTML = '';
    d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`)
      .append('text').attr('x', w0 / 2).attr('y', h0 / 2)
      .attr('text-anchor', 'middle').attr('fill', 'var(--ink3)').attr('font-size', 12)
      .text('No impact data for current selection');
    return;
  }

  for (let k = 0; k < 56; k++) {
    const hfT = rows.map(r => Math.max((sumRow(r) / T) * innerH, minFoodBand));
    const gmT = mets.map(m => Math.max((sumMetric(m) / T) * innerH, minMetricBand));
    const need = Math.max(d3.sum(hfT), d3.sum(gmT));
    if (need <= innerH + 0.5) break;
    innerH = need;
  }
  let hf = rows.map(r => Math.max((sumRow(r) / T) * innerH, minFoodBand));
  let gm = mets.map(m => Math.max((sumMetric(m) / T) * innerH, minMetricBand));
  let sF = d3.sum(hf);
  let sM = d3.sum(gm);
  innerH = Math.max(sF, sM, innerH);
  if (sF < innerH - 1e-6) {
    const slack = innerH - sF;
    hf = hf.map((hh, i) => hh + slack * (sumRow(rows[i]) / T));
  }
  if (sM < innerH - 1e-6) {
    const slack = innerH - sM;
    gm = gm.map((hh, i) => hh + slack * (sumMetric(mets[i]) / T));
  }

  const h = innerH + yTop + bottomPad;
  const H = h + mg.t + mg.b;
  const w = W - mg.l - mg.r;
  const yBottom = h - bottomPad;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const root = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const xL = labelPadL;
  const xR = w - labelPadR;

  const leftBlock = {};
  let y = yTop;
  rows.forEach((r, i) => {
    const bh = hf[i];
    const key = psParallelRowKey(r);
    leftBlock[key] = { y0: y, y1: y + bh, Tr: sumRow(r) };
    y += bh;
  });

  const rightBlock = {};
  y = yTop;
  mets.forEach((m, i) => {
    const bh = gm[i];
    rightBlock[m.key] = { y0: y, y1: y + bh, Tm: sumMetric(m) };
    y += bh;
  });

  const leftSeg = {};
  rows.forEach(r => {
    const key = psParallelRowKey(r);
    leftSeg[key] = {};
    const blk = leftBlock[key];
    const bh = blk.y1 - blk.y0;
    const Tr = blk.Tr;
    let yy = blk.y0;
    mets.forEach(m => {
      const v = psRowMetricLayout(r, m);
      const segH = Tr > 0 ? (v / Tr) * bh : 0;
      leftSeg[key][m.key] = { y0: yy, y1: yy + segH };
      yy += segH;
    });
  });

  const rightSeg = {};
  mets.forEach(m => {
    rightSeg[m.key] = {};
    const blk = rightBlock[m.key];
    const bh = blk.y1 - blk.y0;
    const Tm = blk.Tm;
    let yy = blk.y0;
    rows.forEach(r => {
      const key = psParallelRowKey(r);
      const v = psRowMetricLayout(r, m);
      const segH = Tm > 0 ? (v / Tm) * bh : 0;
      rightSeg[m.key][key] = { y0: yy, y1: yy + segH };
      yy += segH;
    });
  });

  const links = [];
  mets.forEach(m => {
    rows.forEach(r => {
      const v = psRowMetric(r, m);
      if (v <= 0) return;
      const key = psParallelRowKey(r);
      const L = leftSeg[key][m.key];
      const R = rightSeg[m.key][key];
      links.push({ m, r, v, L, R, key });
    });
  });

  links.sort((a, b) => b.v - a.v);

  const defs = root.append('defs');
  links.forEach(({ m, r, key }) => {
    const gid = psGradientId(key, m.key, gradScope);
    const leftColor = resolveColor(r.f.color);
    const g = defs.append('linearGradient')
      .attr('id', gid)
      .attr('gradientUnits', 'objectBoundingBox')
      .attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 0);
    g.append('stop').attr('offset', '0%').attr('stop-color', leftColor);
    g.append('stop').attr('offset', '100%').attr('stop-color', resolveColor(m.color));
  });

  if (opts.subtitle) {
    root.append('text')
      .attr('x', 2).attr('y', yTitle)
      .attr('fill', 'var(--ink2)')
      .attr('font-size', opts.compactTitle ? '11px' : '13px')
      .attr('font-family', 'var(--serif)')
      .attr('font-style', 'italic')
      .text(opts.subtitle);
  }

  root.append('line')
    .attr('x1', xL).attr('x2', xL).attr('y1', yTop).attr('y2', yBottom)
    .attr('stroke', 'var(--border)').attr('stroke-opacity', 0.55);
  root.append('line')
    .attr('x1', xR).attr('x2', xR).attr('y1', yTop).attr('y2', yBottom)
    .attr('stroke', 'var(--border)').attr('stroke-opacity', 0.55);

  rows.forEach(r => {
    const key = psParallelRowKey(r);
    const blk = leftBlock[key];
    const cy = (blk.y0 + blk.y1) / 2;
    const bandH = blk.y1 - blk.y0;
    const fs = Math.max(7.5, Math.min(11, bandH * 0.42 + 3));
    const rawLabel = r.f.name;
    let label = rawLabel;
    const maxLen = bandH < 20 ? 18 : bandH < 30 ? 28 : bandH < 42 ? 40 : 200;
    if (label.length > maxLen) label = `${label.slice(0, Math.max(1, maxLen - 1))}…`;
    const fill = resolveColor(r.f.color);
    const tEl = root.append('text')
      .attr('x', xL - 8)
      .attr('y', cy)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', fill)
      .attr('font-size', `${fs}px`)
      .attr('font-weight', '600')
      .attr('font-family', 'var(--sans)')
      .text(label);
    tEl.append('title').text(rawLabel);
  });

  mets.forEach(m => {
    const blk = rightBlock[m.key];
    const cy = (blk.y0 + blk.y1) / 2;
    const bandH = blk.y1 - blk.y0;
    const fs = Math.max(7.5, Math.min(11, bandH * 0.42 + 3));
    const tEl = root.append('text')
      .attr('x', xR + 8)
      .attr('y', cy)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .attr('fill', resolveColor(m.color))
      .attr('font-size', `${fs}px`)
      .attr('font-weight', '600')
      .attr('font-family', 'var(--sans)')
      .text(m.label);
    tEl.append('title').text(m.full);
  });

  links.forEach(({ m, r, v, L, R, key }) => {
    const path = psRibbonPathLR(L.y0, L.y1, R.y0, R.y1, xL, xR);
    const gid = psGradientId(key, m.key, gradScope);
    const f = r.f;
    const tip = `<b>${f.name}</b> → <b>${m.full}</b><br>${v.toFixed(2)} ${m.unit} · ${ensureServing(f.id)}×/wk`;
    root.append('path')
      .attr('class', 'ps-ribbon')
      .attr('data-food-id', f.id)
      .attr('data-metric-key', m.key)
      .attr('d', path)
      .attr('fill', `url(#${gid})`)
      .attr('fill-opacity', 0.72)
      .attr('stroke', 'rgba(0,0,0,0.2)')
      .attr('stroke-width', 0.35)
      .attr('opacity', 1)
      .style('cursor', 'pointer')
      .on('mousemove', ev => {
        S.psRibbonHoveredFood = f.id;
        showTip(tip, ev);
        highlightFood(f.id);
      })
      .on('mouseleave', () => {
        hideTip();
        S.psRibbonHoveredFood = null;
        highlightFood(null);
        refreshMatrixDonutIfV1();
      })
      .on('click', ev => {
        ev.stopPropagation();
        if (S.psPinnedFood === f.id) S.psPinnedFood = null;
        else S.psPinnedFood = f.id;
        highlightFood(null);
        refreshMatrixDonutIfV1();
      });
  });

  applyPsRibbonOpacities();
}

function renderStacked() {
  const svgEl = document.getElementById('stacked-svg');
  if (!svgEl) return;

  const sel = getSelectedSorted();
  const mets = getMetrics();

  if (!sel.length) {
    renderParallelSetsIntoSvg(svgEl, [], mets, { emptyMessage: '← select foods from the sidebar' });
    return;
  }

  if (!mets.length) {
    renderParallelSetsIntoSvg(svgEl, [], mets, { emptyMessage: '← enable at least one metric in the sidebar' });
    return;
  }

  if (S.psPinnedFood && !sel.some(x => x.id === S.psPinnedFood)) {
    S.psPinnedFood = null;
  }

  const foodRows = sel.map(f => ({ kind: 'food', f }));
  renderParallelSetsIntoSvg(svgEl, foodRows, mets, {
    subtitle: 'Parallel sets: foods → impact types',
  });
  applyPsRibbonOpacities();
}

// ── MATRIX HEATMAP ────────────────────────────────────────────
function renderMatrix() {
  const svgEl = document.getElementById('matrix-svg');
  if (!svgEl) return;

  const scrollWrap = svgEl.closest('.matrix-scroll');
  const box = scrollWrap || svgEl.parentElement;
  const fromBox = Math.max(0, (box?.clientWidth ?? 0) - 4);
  const containerW = fromBox >= 120 ? fromBox : Math.max(260, breakdownContentWidth(svgEl, 4));

  const sel  = getSelected();
  const mets = getMetrics();

  const emptyMatrix = msg => {
    const Wm = Math.max(280, containerW);
    const Hm = 120;
    svgEl.setAttribute('viewBox', `0 0 ${Wm} ${Hm}`);
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgEl.innerHTML = '';
    d3.select(svgEl)
      .append('text')
      .attr('x', Wm / 2)
      .attr('y', Hm / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--ink3)')
      .attr('font-size', 12)
      .text(msg);
  };

  if (!sel.length) {
    emptyMatrix('← Select foods from the sidebar');
    return;
  }
  if (!mets.length) {
    emptyMatrix('← Enable at least one impact type');
    return;
  }

  const nF = sel.length;
  const nM = mets.length;
  const foodRowTight = Math.min(1, Math.max(0, (nF - 5) / 30));
  const minFoodRowPx = Math.max(17, Math.round(38 - 18 * foodRowTight));
  const metColTight = Math.min(1, Math.max(0, (nM - 3) / 10));
  const longestMetChars = d3.max(mets, m => (METRICS.find(x => x.key === m.key)?.label || '').length) || 6;
  const minMetricColPx = Math.max(34, Math.round(longestMetChars * 5.2 + 12 - 11 * metColTight));
  const longestName = d3.max(sel, f => f.name.length) || 12;
  const bottomForMetrics = 52 + Math.min(36, Math.ceil(longestMetChars * 2.2));
  const nameMarginTight = Math.min(1, Math.max(0, (nF - 8) / 28));
  const mg = {
    t: 12,
    r: 24,
    b: bottomForMetrics,
    l: Math.min(
      220,
      Math.max(96, Math.round(longestName * (5.6 - 1.1 * nameMarginTight) + 32)),
    ),
  };

  const availW = Math.max(120, containerW - mg.l - mg.r);
  const w = Math.max(availW, Math.ceil(nM * minMetricColPx * 1.14));
  const rowStackH = Math.ceil(nF * minFoodRowPx * 1.06);
  const hMinForAxes = Math.round(40 + 11 * Math.min(nF, 6));
  const h = Math.max(hMinForAxes, rowStackH);
  const W = w + mg.l + mg.r;
  const H = h + mg.t + mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const xScale = d3.scaleBand().domain(mets.map(m => m.key)).range([0, w]).padding(0.125);
  const yScale = d3.scaleBand().domain(sel.map(f => f.id)).range([0, h]).padding(0.05);
  const bw = xScale.bandwidth();
  const bh = yScale.bandwidth();

  // Per-metric max for normalizing cell opacity
  const metMaxes = {};
  mets.forEach(met => {
    metMaxes[met.key] = d3.max(sel, f => scaledVal(f, met.key)) || 1;
  });

  const dimFood = linkedDimFoodId();
  sel.forEach(f => {
    mets.forEach(met => {
      const norm  = scaledVal(f, met.key) / metMaxes[met.key];
      const isDim = dimFood && dimFood !== f.id;

      svg.append('rect')
        .attr('x',      xScale(met.key))
        .attr('y',      yScale(f.id))
        .attr('width',  xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('rx', 2)
        .attr('fill',    met.color)
        .attr('opacity', isDim ? 0.05 : 0.08 + norm * 0.85)
        .on('mousemove', ev => {
          showTip(`<b>${f.name}</b><br>${met.full}: ${scaledVal(f, met.key).toFixed(2)} ${met.unit}`, ev);
          highlightFood(f.id);
        })
        .on('mouseleave', () => { hideTip(); highlightFood(null); });

      if (norm > 0.05 && bw >= 20 && bh >= 16) {
        const fs = bh < 22 ? 7.5 : bw < 30 ? 8 : 9;
        svg.append('text')
          .attr('x', xScale(met.key) + bw / 2)
          .attr('y', yScale(f.id) + bh / 2)
          .attr('dy', '0.35em').attr('text-anchor', 'middle')
          .attr('font-size', fs).attr('font-family', 'var(--mono)')
          .attr('fill', 'var(--ink)')
          .attr('opacity', isDim ? 0.1 : 0.6)
          .text(scaledVal(f, met.key).toFixed(1));
      }
    });
  });

  const fsBottom = nM > 8 ? 8 : nM > 5 ? 9 : 10;
  const fsLeft = nF > 28 ? 7 : nF > 18 ? 8 : nF > 12 ? 9 : 10;

  svg.append('g').attr('class', 'd3-axis matrix-axis-x').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(xScale).tickFormat(k => METRICS.find(m => m.key === k)?.label || k))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text')
    .style('fill', 'var(--ink2)')
    .style('font-size', `${fsBottom}px`)
    .attr('transform', 'rotate(-38)')
    .style('text-anchor', 'end')
    .attr('dx', '-0.35em')
    .attr('dy', '0.15em');

  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(yScale).tickFormat(id => FOODS.find(f => f.id === id)?.name || id))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text')
    .style('fill', 'var(--ink2)')
    .style('font-size', `${fsLeft}px`);
}

// ── DONUT CHART ───────────────────────────────────────────────
function renderDonut() {
  const svgEl = document.getElementById('donut-svg');
  if (!svgEl) return;
  const W = breakdownContentWidth(svgEl, 48);
  const H = 220;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';

  const sel  = getSelected();
  const mets = getMetrics();
  if (!sel.length) return;

  const r   = Math.min(W, H) / 2 - 16;
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${W / 2},${H / 2})`);

  const data = sel.map(f => ({
    id:    f.id,
    name:  f.name,
    color: f.color,
    value: d3.sum(mets, m => scaledVal(f, m.key)),
  }));

  const pie  = d3.pie().value(d => d.value).sort(null);
  const arc  = d3.arc().innerRadius(r * 0.52).outerRadius(r);
  const arcH = d3.arc().innerRadius(r * 0.50).outerRadius(r + 5);

  const dimFoodDonut = linkedDimFoodId();
  svg.selectAll('.arc').data(pie(data)).enter().append('g')
    .append('path')
    .attr('fill',         d => d.data.color)
    .attr('opacity',      d => dimFoodDonut && dimFoodDonut !== d.data.id ? 0.12 : 0.85)
    .attr('stroke',       'var(--bg2)')
    .attr('stroke-width', 2)
    .attr('d', arc)
    .on('mousemove', (ev, d) => {
      const share = (d.data.value / d3.sum(data, x => x.value) * 100).toFixed(0);
      showTip(`<b>${d.data.name}</b><br>Total: ${d.data.value.toFixed(1)}<br>${share}% of diet impact`, ev);
      highlightFood(d.data.id);
    })
    .on('mouseenter', function() { d3.select(this).attr('d', arcH); })
    .on('mouseleave', function() { d3.select(this).attr('d', arc); hideTip(); highlightFood(null); })
    .transition().duration(700)
    .attrTween('d', function(d) {
      const interp = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return t => arc(interp(t));
    });

  // Center total label
  const total = d3.sum(data, d => d.value);
  svg.append('text').attr('text-anchor', 'middle').attr('dy', '-0.15em')
    .attr('font-family', 'var(--serif)').attr('font-size', 20).attr('fill', 'var(--ink)')
    .text(total.toFixed(0));
  svg.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
    .attr('font-size', 9).attr('font-family', 'var(--mono)').attr('fill', 'var(--ink3)')
    .text('total/week');
}

// ── METRIC LEGEND (View 1) ────────────────────────────────────
function renderMetricLegend() {
  const el = document.getElementById('metric-legend');
  if (!el) return;
  el.innerHTML = '';
  METRICS.forEach(m => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.style.opacity = S.metrics.has(m.key) ? 1 : 0.3;
    item.innerHTML = `
      <div class="legend-dot" style="background:${m.color}"></div>
      ${m.full}
      <span style="color:var(--ink3);font-family:var(--mono);font-size:9px;margin-left:3px">${m.unit}</span>
    `;
    item.addEventListener('click', () => toggleMetric(m.key));
    el.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════════
// VIEW 2 — 3D RIDGELINE LANDSCAPE  (Innovative View)
//
// Joyplot-style surface: X = metrics along each ridge, Z = foods in
// depth, Y = normalized impact height. Filled segments use a viridis-
// like palette by magnitude. Canvas 2D + perspective projection +
// painter's sort on food slices. No WebGL.
// ═══════════════════════════════════════════════════════════════

function initCanvas3D() {
  const wrap   = document.getElementById('scene3d');
  const canvas = document.getElementById('canvas3d');
  canvas.width  = wrap.offsetWidth;
  canvas.height = wrap.offsetHeight;
  scene3dState.canvas = canvas;
  scene3dState.ctx    = canvas.getContext('2d');

  // Remove old listeners by cloning
  const fresh = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(fresh, canvas);
  scene3dState.canvas = fresh;
  scene3dState.ctx    = fresh.getContext('2d');

  fresh.addEventListener('mousedown', e => {
    scene3dState.dragging = true;
    scene3dState.lastX    = e.clientX;
    scene3dState.lastY    = e.clientY;
    wrap.classList.add('dragging');
  });
  fresh.addEventListener('mousemove', e => {
    if (!scene3dState.dragging) return;
    scene3dState.rotY += (e.clientX - scene3dState.lastX) * 0.012;
    scene3dState.rotX += (e.clientY - scene3dState.lastY) * 0.008;
    scene3dState.rotX  = Math.max(-0.1, Math.min(0.9, scene3dState.rotX));
    scene3dState.lastX = e.clientX;
    scene3dState.lastY = e.clientY;
    paint3D();
  });
  fresh.addEventListener('mouseup',    () => { scene3dState.dragging = false; wrap.classList.remove('dragging'); });
  fresh.addEventListener('mouseleave', () => { scene3dState.dragging = false; wrap.classList.remove('dragging'); });
  fresh.addEventListener('click', e => {
    const rect = fresh.getBoundingClientRect();
    pick3D(e.clientX - rect.left, e.clientY - rect.top);
  });
  fresh.addEventListener('wheel', e => {
    e.preventDefault();
    const z = scene3dState.zoom * Math.exp(-e.deltaY * 0.0014);
    scene3dState.zoom = Math.min(SCENE3D_ZOOM_MAX, Math.max(SCENE3D_ZOOM_MIN, z));
    paint3D();
  }, { passive: false });

  paint3D();
}

/** Project a 3D point (x,y,z) to 2D canvas coordinates */
function project3D(x, y, z, rx, ry, cx, cy, scale) {
  // Rotate Y
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const x2 = x * cosY - z * sinY;
  const z2 = x * sinY + z * cosY;
  // Rotate X
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const y2 = y * cosX - z2 * sinX;
  const z3 = y * sinX + z2 * cosX;
  // Perspective divide
  const fov  = 6;
  const sx   = cx + (x2 / (z3 + fov)) * scale * fov;
  const sy   = cy + (y2 / (z3 + fov)) * scale * fov;
  return [sx, sy];
}

/** Viridis-like palette (low → high): purple → teal → yellow */
function colorViridis(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [
    [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142],
    [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89],
    [183, 222, 39], [253, 231, 37],
  ];
  const n = stops.length - 1;
  const f = t * n;
  const i = Math.min(Math.floor(f), n - 1);
  const u = f - i;
  const a = stops[i];
  const b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * u);
  const g = Math.round(a[1] + (b[1] - a[1]) * u);
  const bl = Math.round(a[2] + (b[2] - a[2]) * u);
  return `rgb(${r},${g},${bl})`;
}

function paint3D() {
  const canvas = scene3dState.canvas || document.getElementById('canvas3d');
  const ctx    = scene3dState.ctx    || canvas.getContext('2d');
  const sel    = getSelected();
  const mets   = getMetrics();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!sel.length) {
    const EW = canvas.width, EH = canvas.height;
    const eg = ctx.createLinearGradient(0, 0, 0, EH);
    eg.addColorStop(0, 'rgba(22, 14, 36, 0.98)');
    eg.addColorStop(1, 'rgba(4, 2, 10, 0.99)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, EW, EH);
    ctx.fillStyle   = 'rgba(180, 170, 200, 0.75)';
    ctx.font        = '13px JetBrains Mono, monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('← Select foods to see the 3D ridgelines', EW / 2, EH / 2);
    return;
  }

  const { W, H, cx, cy, proj } = scene3DProjParams(canvas);
  const ry = scene3dState.rotY;

  const maxVal = d3.max(sel, f => d3.max(mets, m => scaledVal(f, m.key))) || 0;
  const nF     = sel.length;
  const nM     = mets.length;
  const mSpacing = 0.55;
  const fSpacing = 0.22;
  const heightScale = 0.7;
  const xMet = mi => (mi - (nM - 1) / 2) * mSpacing;
  const zFood = fi => (fi - (nF - 1) / 2) * fSpacing;
  const fx0 = xMet(0) - mSpacing * 0.5;
  const fx1 = xMet(Math.max(0, nM - 1)) + mSpacing * 0.5;
  const fz0 = zFood(0) - fSpacing * 0.5;
  const fz1 = zFood(Math.max(0, nF - 1)) + fSpacing * 0.5;

  // Dark void backdrop (ridgeline / surface aesthetic)
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, 'rgba(18, 10, 32, 0.97)');
  sky.addColorStop(0.45, 'rgba(6, 4, 14, 0.92)');
  sky.addColorStop(1, 'rgba(2, 2, 6, 0.99)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const halo = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy * 0.85, Math.max(W, H) * 0.58);
  halo.addColorStop(0, 'rgba(80, 40, 120, 0.12)');
  halo.addColorStop(0.5, 'rgba(30, 20, 60, 0.04)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Floor plate
  const floorCorners = [
    proj(fx0, 0, fz0), proj(fx1, 0, fz0),
    proj(fx1, 0, fz1), proj(fx0, 0, fz1),
  ];
  ctx.beginPath();
  floorCorners.forEach(([px, py], i) => { if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
  ctx.closePath();
  const [f0x, f0y] = floorCorners[0];
  const [f2x, f2y] = floorCorners[2];
  const flG = ctx.createLinearGradient(f0x, f0y, f2x, f2y);
  flG.addColorStop(0, 'rgba(28, 22, 42, 0.82)');
  flG.addColorStop(0.5, 'rgba(14, 12, 24, 0.72)');
  flG.addColorStop(1, 'rgba(10, 8, 20, 0.85)');
  ctx.fillStyle = flG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 90, 140, 0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Floor grid
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.65;
  for (let i = 0; i <= nM; i++) {
    const gx = xMet(0) - mSpacing * 0.5 + i * mSpacing;
    const major = i === 0 || i === nM;
    ctx.strokeStyle = major ? 'rgba(140, 130, 180, 0.16)' : 'rgba(70, 60, 100, 0.1)';
    const [x1, y1] = proj(gx, 0, fz0);
    const [x2, y2] = proj(gx, 0, fz1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  for (let j = 0; j <= nF; j++) {
    const gz = zFood(0) - fSpacing * 0.5 + j * fSpacing;
    const major = j === 0 || j === nF;
    ctx.strokeStyle = major ? 'rgba(140, 130, 180, 0.14)' : 'rgba(70, 60, 100, 0.08)';
    const [x1, y1] = proj(fx0, 0, gz);
    const [x2, y2] = proj(fx1, 0, gz);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // One 3D ridgeline per food: X = metrics, Z = depth, Y = impact height; color by magnitude
  const ridges = sel.map((f, fi) => {
    const bz = zFood(fi);
    const depth = bz * Math.cos(ry);
    const heights = mets.map(met =>
      (maxVal > 0 ? scaledVal(f, met.key) / maxVal : 0) * heightScale);
    return { f, fi, bz, depth, heights };
  });
  ridges.sort((a, b) => a.depth - b.depth);

  ridges.forEach(({ f, fi, bz, heights }) => {
    const alpha = 0.94;

    const drawSegment = (x1, x2, h1, h2) => {
      if (h1 < 0.0005 && h2 < 0.0005) return;
      const quad = [
        proj(x1, 0, bz), proj(x2, 0, bz),
        proj(x2, -h2, bz), proj(x1, -h1, bz),
      ];
      const t = heightScale > 0 ? Math.min(1, ((h1 + h2) / 2) / heightScale) : 0;
      const fill = colorViridis(t);
      ctx.beginPath();
      quad.forEach(([px, py], idx) => {
        if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    if (nM >= 2) {
      for (let mi = 0; mi < nM - 1; mi++) {
        drawSegment(xMet(mi), xMet(mi + 1), heights[mi], heights[mi + 1]);
      }
    } else if (nM === 1) {
      const hw = mSpacing * 0.32;
      const xc = xMet(0);
      const h0 = heights[0];
      drawSegment(xc - hw, xc + hw, h0, h0);
    }

    // Sharp ridgeline on top (segmented polyline)
    ctx.beginPath();
    heights.forEach((h, mi) => {
      const [px, py] = proj(xMet(mi), -h, bz);
      if (mi === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = 'rgba(255, 255, 235, 0.48)';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Food icon above peak
    if (typeof getFoodIconImage === 'function') {
      let peakMi = 0;
      let peakH = heights[0] || 0;
      heights.forEach((h, mi) => { if (h > peakH) { peakH = h; peakMi = mi; } });
      const [lx, ly] = proj(xMet(peakMi), -peakH - 0.055, bz);
      ctx.globalAlpha = 1;
      const sz = 17;
      const img = getFoodIconImage(f.id, resolveColor(f.color));
      if (img.complete && img.naturalWidth) {
        ctx.drawImage(img, lx - sz / 2, ly - sz / 2, sz, sz);
      } else {
        img.onload = () => { if (typeof S !== 'undefined' && S.activeView === 'v2') paint3D(); };
        ctx.fillStyle = resolveColor(f.color);
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  });

  // Metric labels along X (impact categories along the ridge)
  const axisOut = 0.1;
  const metLabelZ = fz1 + axisOut;
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  mets.forEach((met, mi) => {
    const [lx, ly] = proj(xMet(mi), 0, metLabelZ);
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = resolveColor(met.color);
    ctx.fillText(met.label, lx, ly + 4);
    ctx.globalAlpha = 1;
  });

  // Food labels along depth (Z)
  const foodLabelX = fx0 - axisOut;
  ctx.font = '600 10px Syne, sans-serif';
  ctx.textAlign = 'right';
  sel.forEach((f, fi) => {
    const [lx, ly] = proj(foodLabelX, 0, zFood(fi));
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = resolveColor(f.color);
    ctx.fillText(f.name, lx, ly + 4);
    ctx.globalAlpha = 1;
  });

  const hint = document.getElementById('scene-hint');
  if (hint) {
    const zPct = Math.round(scene3dState.zoom * 100);
    hint.textContent = scene3dState.clickedFood
      ? `Selected: ${FOODS.find(f => f.id === scene3dState.clickedFood)?.name} · ${zPct}% zoom`
      : `Scroll to zoom · Drag to rotate · Click a food name · ${zPct}%`;
  }
}

/**
 * Hit-test food name labels (same layout as paint3D). Returns food id or null.
 * Iterates front-to-back in draw order so overlapping labels prefer the topmost.
 */
function pick3DFoodLabel(mx, my, canvas, sel, mets, proj) {
  const nF = sel.length;
  const nM = mets.length;
  if (!nF || !nM) return null;

  const mSpacing = 0.55;
  const fSpacing = 0.22;
  const xMet = mi => (mi - (nM - 1) / 2) * mSpacing;
  const zFood = fi => (fi - (nF - 1) / 2) * fSpacing;
  const fx0 = xMet(0) - mSpacing * 0.5;
  const axisOut = 0.1;
  const foodLabelX = fx0 - axisOut;

  const ctx = canvas.getContext('2d');
  ctx.font = '600 10px Syne, sans-serif';
  ctx.textAlign = 'right';

  const pad = 6;
  for (let fi = nF - 1; fi >= 0; fi--) {
    const f = sel[fi];
    const [lx, ly] = proj(foodLabelX, 0, zFood(fi));
    const baselineY = ly + 4;
    const tm = ctx.measureText(f.name);
    const tw = tm.width;
    const left = lx - tw;
    const right = lx;
    let top; let bottom;
    if (tm.actualBoundingBoxAscent != null && tm.actualBoundingBoxDescent != null) {
      top = baselineY - tm.actualBoundingBoxAscent;
      bottom = baselineY + tm.actualBoundingBoxDescent;
    } else {
      top = baselineY - 10;
      bottom = baselineY + 3;
    }
    if (mx >= left - pad && mx <= right + pad && my >= top - pad && my <= bottom + pad) {
      return f.id;
    }
  }
  return null;
}

/** Click on a food name label selects that food for radar + metric breakdown. */
function pick3D(mx, my) {
  const sel  = getSelected();
  const mets = getMetrics();
  if (!sel.length || !mets.length || !scene3dState.canvas) return;

  const { proj } = scene3DProjParams(scene3dState.canvas);
  const labelId = pick3DFoodLabel(mx, my, scene3dState.canvas, sel, mets, proj);
  if (!labelId) return;

  scene3dState.clickedFood = scene3dState.clickedFood === labelId ? null : labelId;
  S.highlighted = scene3dState.clickedFood;
  highlightFood(S.highlighted);
  paint3D();
  renderRadar();
  renderImpactMeter();
}

// ── RADAR CHART (View 2) ──────────────────────────────────────
function renderRadar() {
  const svgEl = document.getElementById('radar-svg');
  if (!svgEl) return;
  const W = svgEl.parentElement.offsetWidth - 48;
  const H = 220;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';

  const sel  = getSelected();
  const mets = getMetrics();
  if (!sel.length || mets.length < 3) return;

  const r   = Math.min(W, H) / 2 - 28;
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${W / 2},${H / 2})`);
  const n   = mets.length;
  const angles = mets.map((_, i) => (i / n) * Math.PI * 2 - Math.PI / 2);

  const metMaxes = {};
  mets.forEach(m => { metMaxes[m.key] = d3.max(sel, f => scaledVal(f, m.key)) || 1; });

  // Grid rings
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    const pts = angles.map(a => [Math.cos(a) * r * frac, Math.sin(a) * r * frac]);
    svg.append('polygon')
      .attr('points', pts.map(p => p.join(',')).join(' '))
      .attr('fill', 'none').attr('stroke', 'var(--border)').attr('stroke-width', 0.5);
  });

  // Axis spokes + labels
  angles.forEach((a, i) => {
    svg.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', Math.cos(a) * r).attr('y2', Math.sin(a) * r)
      .attr('stroke', 'var(--border)').attr('stroke-width', 0.5);
    svg.append('text')
      .attr('x', Math.cos(a) * (r + 14))
      .attr('y', Math.sin(a) * (r + 14))
      .attr('dy', '0.35em').attr('text-anchor', 'middle')
      .attr('font-size', 9).attr('font-family', 'var(--mono)').attr('fill', 'var(--ink3)')
      .text(mets[i].label);
  });

  // Average polygon (dashed)
  const avgPts = angles.map((a, i) => {
    const avg = d3.mean(sel, f => scaledVal(f, mets[i].key) / metMaxes[mets[i].key]);
    return [Math.cos(a) * r * avg, Math.sin(a) * r * avg];
  });
  svg.append('polygon')
    .attr('points', avgPts.map(p => p.join(',')).join(' '))
    .attr('fill', 'var(--ink3)').attr('fill-opacity', 0.08)
    .attr('stroke', 'var(--ink3)').attr('stroke-width', 1).attr('stroke-dasharray', '3 2');

  // Per-food polygon (selected food or all if none selected)
  const target      = scene3dState.clickedFood || (sel.length === 1 ? sel[0].id : null);
  const renderFoods = target ? sel.filter(f => f.id === target) : sel;

  renderFoods.forEach(f => {
    const pts = angles.map((a, i) => {
      const norm = scaledVal(f, mets[i].key) / metMaxes[mets[i].key];
      return [Math.cos(a) * r * norm, Math.sin(a) * r * norm];
    });
    const rawColor = resolveColor(f.color);
    svg.append('polygon')
      .attr('points', pts.map(p => p.join(',')).join(' '))
      .attr('fill', rawColor).attr('fill-opacity', 0.18)
      .attr('stroke', rawColor).attr('stroke-width', 1.5);
    pts.forEach(([px, py]) => {
      svg.append('circle').attr('cx', px).attr('cy', py).attr('r', 3).attr('fill', rawColor);
    });
  });
}

// ── IMPACT METER (View 2) ─────────────────────────────────────
function renderImpactMeter() {
  const wrap = document.getElementById('impact-meter');
  if (!wrap) return;

  const target = S.activeView === 'v2'
    ? scene3dState.clickedFood
    : (scene3dState.clickedFood || S.highlighted);
  const mets   = getMetrics();
  const sel    = getSelected();

  if (!target || !S.selected.has(target)) {
    wrap.innerHTML = `<div style="font-size:11px;color:var(--ink3);padding:20px;text-align:center">Click a food name in the 3D view to inspect</div>`;
    return;
  }

  const food = FOODS.find(f => f.id === target);
  const maxes = {};
  mets.forEach(m => { maxes[m.key] = d3.max(sel, f => scaledVal(f, m.key)) || 1; });

  const ic = typeof foodIconHtml === 'function' ? foodIconHtml(food.id, 18) : '';
  let html = `<div class="im-head" style="font-size:11px;color:var(--ink2);margin-bottom:12px;display:flex;align-items:center;gap:8px"><span class="im-head-icon" style="color:${resolveColor(food.color)}">${ic}</span><span><b>${food.name}</b>, ${ensureServing(food.id)}×/week</span></div>`;
  mets.forEach(met => {
    const val      = scaledVal(food, met.key);
    const pct      = val / maxes[met.key] * 100;
    const rawColor = resolveColor(met.color);
    html += `
      <div class="im-row">
        <div class="im-food-label">${met.label}</div>
        <div class="im-bars">
          <div class="im-bar-track">
            <div class="im-bar-fill" style="width:${pct}%;background:${rawColor}"></div>
          </div>
        </div>
        <div class="im-total">${val.toFixed(1)}<br><span style="font-size:8px;color:var(--ink3)">${met.unit}</span></div>
      </div>
    `;
  });
  wrap.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// VIEW 3 — CUMULATIVE AREA CHART
// ═══════════════════════════════════════════════════════════════
function renderArea() {
  const svgEl = document.getElementById('area-svg');
  const W     = svgEl.parentElement.offsetWidth - 48;
  const H     = 240;
  const mg    = { t: 10, r: 20, b: 40, l: 55 };
  const w     = W - mg.l - mg.r;
  const h     = H - mg.t - mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const sel  = getSelected();
  const mets = getMetrics();

  if (!sel.length) {
    svg.append('text').attr('x', w / 2).attr('y', h / 2)
      .attr('text-anchor', 'middle').attr('fill', 'var(--ink3)').attr('font-size', 12)
      .text('← Select foods');
    return;
  }

  // Build cumulative stacked layers per food
  const xScale  = d3.scaleBand().domain(mets.map(m => m.key)).range([0, w]).padding(0.125);
  const xPoint  = key => (xScale(key) || 0) + xScale.bandwidth() / 2;
  const layers  = [];
  const cumulative = Object.fromEntries(mets.map(m => [m.key, 0]));

  sel.forEach(f => {
    const prev = { ...cumulative };
    mets.forEach(met => { cumulative[met.key] += scaledVal(f, met.key); });
    layers.push({ food: f, lower: { ...prev }, upper: { ...cumulative } });
  });

  const maxY = d3.max(mets, met => cumulative[met.key]) * 1.1;
  const y    = d3.scaleLinear().domain([0, maxY]).range([h, 0]);

  // Grid + axes
  svg.append('g').attr('class', 'd3-grid')
    .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(''))
    .call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0f')))
    .call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'd3-axis').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(xScale).tickFormat(k => METRICS.find(m => m.key === k)?.full || k))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '9px');

  const area = d3.area()
    .x(d => xPoint(d.key))
    .y0(d => y(d.lower))
    .y1(d => y(d.upper))
    .curve(d3.curveCatmullRom);

  const dimFoodArea = linkedDimFoodId();
  layers.forEach(({ food, lower, upper }) => {
    const data     = mets.map(met => ({ key: met.key, lower: lower[met.key], upper: upper[met.key] }));
    const isDim    = dimFoodArea && dimFoodArea !== food.id;
    const rawColor = resolveColor(food.color);

    svg.append('path')
      .datum(data)
      .attr('fill', rawColor)
      .attr('opacity', isDim ? 0.05 : 0.35)
      .attr('d', area)
      .on('mousemove', ev => {
        const ti = typeof foodIconHtml === 'function' ? foodIconHtml(food.id, 16) : '';
        showTip(`<span class="tip-with-icon"><span style="color:${rawColor}">${ti}</span><b>${food.name}</b></span>`, ev);
        highlightFood(food.id);
      })
      .on('mouseleave', () => { hideTip(); highlightFood(null); });
  });

  // Top dashed line showing combined total
  const topData = mets.map(met => ({ key: met.key, val: cumulative[met.key] }));
  svg.append('path').datum(topData)
    .attr('fill', 'none').attr('stroke', 'var(--ink2)').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4 2')
    .attr('d', d3.line().x(d => xPoint(d.key)).y(d => y(d.val)).curve(d3.curveCatmullRom));
}

// ── SUBSTITUTION CARDS (View 3) ───────────────────────────────
function renderSubs() {
  const container = document.getElementById('sub-cards');
  container.innerHTML = '';

  const sel  = getSelected();
  const mets = getMetrics();
  const highImpact = sel.filter(f => SUBS[f.id]);

  if (!highImpact.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--ink3);padding:12px">Select high-impact foods to see substitution suggestions.</div>';
    return;
  }

  highImpact.forEach(f => {
    const sub    = SUBS[f.id];
    const toFood = FOODS.find(x => x.id === sub.to);
    if (!toFood) return;

    const savings = mets.map(m => {
      const orig = scaledVal(f, m.key);
      const alt  = toFood[m.key] * ensureServing(f.id);
      return { m, pct: orig > 0 ? Math.max(0, (orig - alt) / orig) : 0 };
    });
    const ghgSave = ((f.ghg - toFood.ghg) / Math.max(f.ghg, 0.01) * 100).toFixed(0);

    const card = document.createElement('div');
    card.className = 'sub-card';
    const icFrom = typeof foodIconHtml === 'function' ? foodIconHtml(f.id, 18) : '';
    const icTo = typeof foodIconHtml === 'function' ? foodIconHtml(toFood.id, 18) : '';
    card.innerHTML = `
      <div class="sub-from"><span style="color:${resolveColor(f.color)}">${icFrom}</span><span>${f.name}</span></div>
      <div class="sub-arrow">↓ swap for</div>
      <div class="sub-to"><span style="color:${resolveColor(toFood.color)}">${icTo}</span><span>${toFood.name}</span></div>
      <div class="sub-savings">${sub.reason} · ~${ghgSave}% less GHG</div>
      <div class="sub-bar-wrap">
        ${savings.map(({ m: met, pct }) =>
          `<div class="sub-mini-bar" style="background:${resolveColor(met.color)};opacity:0.7;width:${Math.min(100, (pct * 100).toFixed(0))}%"></div>`
        ).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
buildSidebar();
document.getElementById('food-bulk-all')?.addEventListener('click', selectAllFoods);
document.getElementById('food-bulk-none')?.addEventListener('click', deselectAllFoods);
if (typeof preloadFoodIcons === 'function') preloadFoodIcons();
renderAll();

window.addEventListener('resize', () => {
  if (S.activeView === 'v2') initCanvas3D();
  else if (S.activeView === 'v4' && typeof renderAccountDashboard === 'function') renderAccountDashboard();
  else renderAll();
});
