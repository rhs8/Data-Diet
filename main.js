// ═══════════════════════════════════════════════════════════════
// main.js  —  Application state, rendering, interactivity
// Depends on: d3 (CDN), data.js (FOODS, METRICS, SUBS)
// ═══════════════════════════════════════════════════════════════

// ── APPLICATION STATE ─────────────────────────────────────────
const S = {
  selected:    new Set(['beef', 'pork', 'vegetables']),
  servings:    { beef: 2, pork: 3, poultry: 3, milk: 5, rice: 4, vegetables: 5 },
  metrics:     new Set(['ghg', 'land', 'feed', 'process', 'eutro']),
  highlighted: null,   // food id currently highlighted (hover or 3D click)
  activeView:  'v1',
  /** When true and on Breakdown (v1), charts use GHG (kg CO₂) only for clearer storytelling. */
  exploreGhgOnly: false,
};

// 3D scene state (isolated from main app state)
const scene3dState = {
  rotY: 0.5, rotX: 0.35,
  dragging: false, lastX: 0, lastY: 0,
  clickedFood: null,
  canvas: null, ctx: null,
};

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
function getMetrics() {
  if (S.exploreGhgOnly && S.activeView === 'v1') return METRICS.filter(m => m.key === 'ghg');
  return METRICS.filter(m => S.metrics.has(m.key));
}
function scaledVal(food, metricKey) { return food[metricKey] * S.servings[food.id]; }

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
function buildSidebar() {
  buildFoodList();
  buildMetricFilters();
  buildServings();
}

function buildFoodList() {
  const fl = document.getElementById('food-list');
  fl.innerHTML = '';
  FOODS.forEach(f => {
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
    el.addEventListener('click',       () => toggleFood(f.id));
    el.addEventListener('mouseenter',  () => highlightFood(f.id));
    el.addEventListener('mouseleave',  () => highlightFood(null));
    fl.appendChild(el);
  });
}

function buildMetricFilters() {
  const mf = document.getElementById('metric-filters');
  mf.innerHTML = '';
  METRICS.forEach(m => {
    const el = document.createElement('div');
    el.className = 'metric-filter' + (S.metrics.has(m.key) ? ' active' : '');
    el.id = 'mf-' + m.key;
    el.style.setProperty('--mf-color', m.color);
    el.innerHTML = `
      <div class="mf-dot" style="background:${m.color}"></div>
      <span class="mf-name">${m.full}</span>
      <span class="mf-unit">${m.unit}</span>
    `;
    el.addEventListener('click', () => toggleMetric(m.key));
    mf.appendChild(el);
  });
}

function buildServings() {
  const area = document.getElementById('servings-area');
  const sel = getSelected();
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
        <span class="s-val" id="sval-${f.id}">${S.servings[f.id]}</span>
        <button class="s-btn" onclick="changeServing('${f.id}', 1)">+</button>
      </div>
    `;
    area.appendChild(row);
  });
}

// Exposed globally for inline onclick handlers in dynamically-built HTML
window.changeServing = function(id, delta) {
  S.servings[id] = Math.max(1, Math.min(14, S.servings[id] + delta));
  const el = document.getElementById('sval-' + id);
  if (el) el.textContent = S.servings[id];
  renderAll();
};

// ── FOOD / METRIC TOGGLE ──────────────────────────────────────
function toggleFood(id) {
  if (S.selected.has(id)) S.selected.delete(id);
  else S.selected.add(id);
  document.getElementById('fi-' + id).classList.toggle('active', S.selected.has(id));
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
function highlightFood(id) {
  S.highlighted = id;
  // Update sidebar opacity
  FOODS.forEach(f => {
    const el = document.getElementById('fi-' + f.id);
    if (el) el.style.opacity = (!id || id === f.id) ? 1 : 0.35;
  });
  // Update SVG bar opacity (without full re-render)
  d3.selectAll('[class^="bar-"]').each(function() {
    const foodId = this.getAttribute('class').replace('bar-', '');
    d3.select(this).attr('opacity', id && id !== foodId ? 0.1 : 0.85);
  });
  // Update impact meter if view 2 is active
  if (S.activeView === 'v2') renderImpactMeter();
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
    if (v === 'v2') setTimeout(() => initCanvas3D(), 50);
    renderAll();
  });
});

// ── MASTER RENDER ─────────────────────────────────────────────
function renderAll() {
  document.querySelector('.sidebar')?.classList.toggle('sidebar-ghg-pause', !!(S.exploreGhgOnly && S.activeView === 'v1'));
  if (S.activeView === 'v1') {
    syncExploreGhgCheckbox();
    renderStacked();
    renderMatrix();
    renderDonut();
    renderMetricLegend();
  } else if (S.activeView === 'v2') {
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
// VIEW 1 — STACKED BAR CHART
// ═══════════════════════════════════════════════════════════════
function renderStacked() {
  const svgEl = document.getElementById('stacked-svg');
  const W = svgEl.parentElement.offsetWidth - 48;
  const H = 280;
  const mg = { t: 10, r: 20, b: 50, l: 55 };
  const w = W - mg.l - mg.r;
  const h = H - mg.t - mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const sel  = getSelected();
  const mets = getMetrics();

  if (!sel.length) {
    svg.append('text').attr('x', w / 2).attr('y', h / 2)
      .attr('text-anchor', 'middle').attr('fill', 'var(--ink3)').attr('font-size', 12)
      .text('← select foods from the sidebar');
    return;
  }

  // Build flat data objects for d3.stack
  const data = sel.map(f => {
    const obj = { id: f.id, name: f.name };
    mets.forEach(m => { obj[m.key] = scaledVal(f, m.key); });
    return obj;
  });

  const stack = d3.stack().keys(mets.map(m => m.key))(data);
  const maxY  = d3.max(stack, s => d3.max(s, d => d[1]));

  const x = d3.scaleBand().domain(sel.map(f => f.id)).range([0, w]).padding(0.3);
  const y = d3.scaleLinear().domain([0, maxY * 1.1]).range([h, 0]);

  // Grid lines
  svg.append('g').attr('class', 'd3-grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''))
    .call(g => g.select('.domain').remove());

  // Y axis
  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0f')))
    .call(g => g.select('.domain').remove());

  // X axis
  svg.append('g').attr('class', 'd3-axis').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(id => FOODS.find(f => f.id === id)?.name || id))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '11px');

  // Stacked bars — one group per metric layer
  stack.forEach((series, si) => {
    const metric = mets[si];
    svg.append('g').selectAll('rect')
      .data(series)
      .enter().append('rect')
      .attr('class', d => `bar-${d.data.id}`)
      .attr('x',      d => x(d.data.id))
      .attr('width',  x.bandwidth())
      .attr('fill',   metric.color)
      .attr('opacity', d => S.highlighted && S.highlighted !== d.data.id ? 0.12 : 0.85)
      .attr('y', h).attr('height', 0)
      .on('mousemove', (ev, d) => {
        const food = FOODS.find(f => f.id === d.data.id);
        showTip(`<b>${food?.name}</b><br>${metric.full}: ${d.data[metric.key]?.toFixed(2)} ${metric.unit}`, ev);
        highlightFood(d.data.id);
      })
      .on('mouseleave', () => { hideTip(); highlightFood(null); })
      .transition().duration(500).delay((_, i) => i * 40).ease(d3.easeCubicOut)
      .attr('y',      d => y(d[1]))
      .attr('height', d => Math.max(0, y(d[0]) - y(d[1])));
  });

  sel.forEach(f => {
    const total = d3.sum(mets, m => scaledVal(f, m.key));
    const ix = x(f.id) + x.bandwidth() / 2 - 8;
    const iy = y(total) - 22;
    if (typeof foodIconDataUri === 'function') {
      svg.append('image')
        .attr('href', foodIconDataUri(f.id, resolveColor(f.color)))
        .attr('width', 16)
        .attr('height', 16)
        .attr('x', ix)
        .attr('y', iy)
        .attr('opacity', S.highlighted && S.highlighted !== f.id ? 0.15 : 1);
    }
  });
}

// ── MATRIX HEATMAP ────────────────────────────────────────────
function renderMatrix() {
  const svgEl = document.getElementById('matrix-svg');
  const W  = svgEl.parentElement.offsetWidth - 48;
  const H  = 220;
  const mg = { t: 10, r: 20, b: 50, l: 90 };
  const w  = W - mg.l - mg.r;
  const h  = H - mg.t - mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const sel  = getSelected();
  const mets = getMetrics();
  if (!sel.length) return;

  const xScale = d3.scaleBand().domain(sel.map(f => f.id)).range([0, w]).padding(0.05);
  const yScale = d3.scaleBand().domain(mets.map(m => m.key)).range([0, h]).padding(0.05);

  // Per-metric max for normalizing cell opacity
  const metMaxes = {};
  mets.forEach(met => {
    metMaxes[met.key] = d3.max(sel, f => scaledVal(f, met.key)) || 1;
  });

  sel.forEach(f => {
    mets.forEach(met => {
      const norm  = scaledVal(f, met.key) / metMaxes[met.key];
      const isDim = S.highlighted && S.highlighted !== f.id;

      svg.append('rect')
        .attr('x',      xScale(f.id))
        .attr('y',      yScale(met.key))
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

      // Value label inside cell when large enough
      if (norm > 0.05) {
        svg.append('text')
          .attr('x', xScale(f.id) + xScale.bandwidth() / 2)
          .attr('y', yScale(met.key) + yScale.bandwidth() / 2)
          .attr('dy', '0.35em').attr('text-anchor', 'middle')
          .attr('font-size', 9).attr('font-family', 'var(--mono)')
          .attr('fill', 'var(--ink)')
          .attr('opacity', isDim ? 0.1 : 0.6)
          .text(scaledVal(f, met.key).toFixed(1));
      }
    });
  });

  // Axes
  svg.append('g').attr('class', 'd3-axis').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(xScale).tickFormat(id => FOODS.find(f => f.id === id)?.name || id))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '10px');

  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(yScale).tickFormat(k => METRICS.find(m => m.key === k)?.label || k))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '10px');
}

// ── DONUT CHART ───────────────────────────────────────────────
function renderDonut() {
  const svgEl = document.getElementById('donut-svg');
  const W = svgEl.parentElement.offsetWidth - 48;
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

  svg.selectAll('.arc').data(pie(data)).enter().append('g')
    .append('path')
    .attr('fill',         d => d.data.color)
    .attr('opacity',      d => S.highlighted && S.highlighted !== d.data.id ? 0.12 : 0.85)
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
  el.innerHTML = '';
  const list = S.exploreGhgOnly && S.activeView === 'v1' ? METRICS.filter(m => m.key === 'ghg') : METRICS;
  list.forEach(m => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.style.opacity = S.metrics.has(m.key) ? 1 : 0.3;
    item.innerHTML = `
      <div class="legend-dot" style="background:${m.color}"></div>
      ${m.full}
      <span style="color:var(--ink3);font-family:var(--mono);font-size:9px;margin-left:3px">${m.unit}</span>
    `;
    if (!(S.exploreGhgOnly && S.activeView === 'v1')) {
      item.addEventListener('click', () => toggleMetric(m.key));
    } else {
      item.style.cursor = 'default';
    }
    el.appendChild(item);
  });
  if (S.exploreGhgOnly && S.activeView === 'v1') {
    const note = document.createElement('div');
    note.className = 'legend-ghg-note';
    note.textContent = 'Uncheck “GHG only” above to use sidebar metric toggles again.';
    el.appendChild(note);
  }
}

// ═══════════════════════════════════════════════════════════════
// VIEW 2 — 3D CANVAS LANDSCAPE  (Innovative View)
//
// Hybrid encoding: 3D spatial position (food × metric axes),
// bar height, and color all independently encode data dimensions.
// Hand-rolled isometric 3D renderer using Canvas 2D + painter's
// algorithm for depth sorting. No WebGL required.
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

function paint3D() {
  const canvas = scene3dState.canvas || document.getElementById('canvas3d');
  const ctx    = scene3dState.ctx    || canvas.getContext('2d');
  const sel    = getSelected();
  const mets   = getMetrics();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!sel.length) {
    const EW = canvas.width, EH = canvas.height;
    const eg = ctx.createLinearGradient(0, 0, 0, EH);
    eg.addColorStop(0, 'rgba(26, 34, 30, 0.95)');
    eg.addColorStop(1, 'rgba(8, 10, 9, 0.9)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, EW, EH);
    ctx.fillStyle   = 'rgba(140, 148, 140, 0.85)';
    ctx.font        = '13px JetBrains Mono, monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('← Select foods to see the 3D landscape', EW / 2, EH / 2);
    return;
  }

  const W = canvas.width, H = canvas.height;
  const rx    = scene3dState.rotX;
  const ry    = scene3dState.rotY;
  const cx    = W * 0.5, cy = H * 0.5;
  const scale = Math.min(W, H) * 0.74;
  const proj  = (x, y, z) => project3D(x, y, z, rx, ry, cx, cy, scale);

  const maxVal  = d3.max(sel, f => d3.max(mets, m => scaledVal(f, m.key)));
  const cols    = sel.length;
  const rows    = mets.length;
  const spacing = 0.22;
  const barW    = 0.14;
  const halfW   = barW / 2;
  const fx0     = -cols * spacing / 2;
  const fx1     = cols * spacing / 2;
  const fz0     = -rows * spacing / 2;
  const fz1     = rows * spacing / 2;

  // Ambient backdrop (depth)
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, 'rgba(26, 34, 30, 0.92)');
  sky.addColorStop(0.42, 'rgba(12, 16, 14, 0.35)');
  sky.addColorStop(1, 'rgba(6, 8, 7, 0.88)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const halo = ctx.createRadialGradient(cx, cy * 0.92, 0, cx, cy * 0.88, Math.max(W, H) * 0.55);
  halo.addColorStop(0, 'rgba(88, 120, 98, 0.14)');
  halo.addColorStop(0.55, 'rgba(40, 52, 46, 0.04)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Floor plate (ground plane)
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
  flG.addColorStop(0, 'rgba(34, 42, 38, 0.72)');
  flG.addColorStop(0.5, 'rgba(22, 28, 25, 0.55)');
  flG.addColorStop(1, 'rgba(14, 18, 16, 0.68)');
  ctx.fillStyle = flG;
  ctx.fill();
  ctx.strokeStyle = 'rgba(80, 92, 86, 0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Floor grid
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.65;
  for (let i = 0; i <= cols; i++) {
    const gx = (i - cols / 2) * spacing;
    const major = i === 0 || i === cols;
    ctx.strokeStyle = major ? 'rgba(120, 128, 120, 0.2)' : 'rgba(70, 78, 74, 0.14)';
    const [x1, y1] = proj(gx, 0, fz0);
    const [x2, y2] = proj(gx, 0, fz1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    const gz = (j - rows / 2) * spacing;
    const major = j === 0 || j === rows;
    ctx.strokeStyle = major ? 'rgba(120, 128, 120, 0.18)' : 'rgba(70, 78, 74, 0.12)';
    const [x1, y1] = proj(fx0, 0, gz);
    const [x2, y2] = proj(fx1, 0, gz);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // Build all bars with depth info for painter's sort
  const bars = [];
  sel.forEach((f, fi) => {
    mets.forEach((met, mi) => {
      const normH = maxVal > 0 ? scaledVal(f, met.key) / maxVal : 0;
      const bx    = (fi - (cols - 1) / 2) * spacing;
      const bz    = (mi - (rows - 1) / 2) * spacing;
      const bh    = normH * 0.65;
      const depth = bx * Math.sin(ry) + bz * Math.cos(ry);
      bars.push({ f, met, fi, mi, bx, bz, bh, normH, depth });
    });
  });

  // Painter's sort: back to front
  bars.sort((a, b) => a.depth - b.depth);

  bars.forEach(({ f, met, fi, mi, bx, bz, bh, normH }) => {
    const isHighlighted = S.highlighted === f.id || scene3dState.clickedFood === f.id;
    const isDim = (S.highlighted || scene3dState.clickedFood) &&
                  S.highlighted !== f.id && scene3dState.clickedFood !== f.id;
    const alpha    = isDim ? 0.15 : 0.9;
    const rawColor = resolveColor(met.color);

    // 8 corners: bottom face then top face
    const corners = [
      [bx - halfW, 0,   bz - halfW],
      [bx + halfW, 0,   bz - halfW],
      [bx + halfW, 0,   bz + halfW],
      [bx - halfW, 0,   bz + halfW],
      [bx - halfW, -bh, bz - halfW],
      [bx + halfW, -bh, bz - halfW],
      [bx + halfW, -bh, bz + halfW],
      [bx - halfW, -bh, bz + halfW],
    ].map(([cx2, cy2, cz2]) => proj(cx2, cy2, cz2));

    if (isHighlighted && bh > 0.05) {
      ctx.shadowColor = rawColor;
      ctx.shadowBlur  = 16;
    }

    // Three visible faces: front, right side, top (luminance via shadeHex)
    const faces = [
      { pts: [0, 1, 5, 4], shade: 0.78 },  // front
      { pts: [1, 2, 6, 5], shade: 0.52 },  // right
      { pts: [4, 5, 6, 7], shade: 1.06 },  // top
    ];

    faces.forEach(({ pts, shade }) => {
      if (bh < 0.002) return;
      ctx.beginPath();
      pts.forEach((ci, idx) => {
        const [px, py] = corners[ci];
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle   = shadeHex(rawColor, shade);
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth   = 0.45;
      ctx.globalAlpha = alpha * 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Top rim highlight
    if (bh > 0.01) {
      ctx.strokeStyle = shadeHex(rawColor, 1.18);
      ctx.lineWidth   = isHighlighted ? 1.35 : 0.65;
      ctx.globalAlpha = alpha * (isHighlighted ? 0.75 : 0.4);
      ctx.beginPath();
      [4, 5, 6, 7].forEach((ci, idx) => {
        const [px, py] = corners[ci];
        if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;

    if (mi === 0 && typeof getFoodIconImage === 'function') {
      const tallestH = d3.max(mets, m => maxVal > 0 ? scaledVal(f, m.key) / maxVal * 0.65 : 0);
      const [lx, ly] = proj(bx, -tallestH - 0.06, bz);
      ctx.globalAlpha = isDim ? 0.15 : 1;
      const sz = isHighlighted ? 20 : 17;
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

  // Metric axis labels (z-axis)
  mets.forEach((met, mi) => {
    const gz       = (mi - (rows - 1) / 2) * spacing;
    const [lx, ly] = proj(fx0 - 0.08, 0, gz);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle   = resolveColor(met.color);
    ctx.font        = '9px JetBrains Mono, monospace';
    ctx.textAlign   = 'right';
    ctx.fillText(met.label, lx, ly + 4);
    ctx.globalAlpha = 1;
  });

  // Food axis labels (X): mirror metric labels (Z) — same projection, offset past floor edge in Z instead of X
  const axisOut = 0.08;
  const foodLabelZ = fz1 + axisOut;
  ctx.font = '600 10px Syne, sans-serif';
  ctx.textAlign = 'center';
  sel.forEach((f, fi) => {
    const bx = (fi - (cols - 1) / 2) * spacing;
    const [lx, ly] = proj(bx, 0, foodLabelZ);
    const labelDim = (S.highlighted || scene3dState.clickedFood) &&
      S.highlighted !== f.id && scene3dState.clickedFood !== f.id;
    ctx.globalAlpha = labelDim ? 0.22 : 0.72;
    ctx.fillStyle = resolveColor(f.color);
    ctx.fillText(f.name, lx, ly + 4);
    ctx.globalAlpha = 1;
  });

  // Update hint label
  const hint = document.getElementById('scene-hint');
  if (hint) {
    hint.textContent = scene3dState.clickedFood
      ? `Selected: ${FOODS.find(f => f.id === scene3dState.clickedFood)?.name}`
      : 'Drag to rotate · Click to select';
  }
}

/** Click-picking in 3D: find closest food column to click point */
function pick3D(mx, my) {
  const sel  = getSelected();
  const mets = getMetrics();
  if (!sel.length) return;

  const W     = scene3dState.canvas.width;
  const H     = scene3dState.canvas.height;
  const rx    = scene3dState.rotX;
  const ry    = scene3dState.rotY;
  const cx    = W * 0.5, cy = H * 0.5;
  const scale = Math.min(W, H) * 0.74;
  const proj  = (x, y, z) => project3D(x, y, z, rx, ry, cx, cy, scale);

  const cols    = sel.length;
  const spacing = 0.22;
  const maxVal  = d3.max(sel, f => d3.max(mets, m => scaledVal(f, m.key)));

  let best = null, bestDist = 999;
  sel.forEach((f, fi) => {
    const bx      = (fi - (cols - 1) / 2) * spacing;
    const tallH   = d3.max(mets, m => maxVal > 0 ? scaledVal(f, m.key) / maxVal * 0.65 : 0);
    const [px, py] = proj(bx, -tallH / 2, 0);
    const dist    = Math.hypot(mx - px, my - py);
    if (dist < bestDist) { bestDist = dist; best = f.id; }
  });

  if (bestDist < 60) {
    scene3dState.clickedFood = scene3dState.clickedFood === best ? null : best;
    S.highlighted = scene3dState.clickedFood;
    highlightFood(S.highlighted);
    paint3D();
    renderRadar();
    renderImpactMeter();
  }
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

  const target = scene3dState.clickedFood || S.highlighted;
  const mets   = getMetrics();
  const sel    = getSelected();

  if (!target || !S.selected.has(target)) {
    wrap.innerHTML = `<div style="font-size:11px;color:var(--ink3);padding:20px;text-align:center">Click a column in the 3D view to inspect</div>`;
    return;
  }

  const food = FOODS.find(f => f.id === target);
  const maxes = {};
  mets.forEach(m => { maxes[m.key] = d3.max(sel, f => scaledVal(f, m.key)) || 1; });

  const ic = typeof foodIconHtml === 'function' ? foodIconHtml(food.id, 18) : '';
  let html = `<div class="im-head" style="font-size:11px;color:var(--ink2);margin-bottom:12px;display:flex;align-items:center;gap:8px"><span class="im-head-icon" style="color:${resolveColor(food.color)}">${ic}</span><span><b>${food.name}</b>, ${S.servings[food.id]}×/week</span></div>`;
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
  const xScale  = d3.scaleBand().domain(mets.map(m => m.key)).range([0, w]).padding(0);
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

  layers.forEach(({ food, lower, upper }) => {
    const data     = mets.map(met => ({ key: met.key, lower: lower[met.key], upper: upper[met.key] }));
    const isDim    = S.highlighted && S.highlighted !== food.id;
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
      const alt  = toFood[m.key] * S.servings[f.id];
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
function syncExploreGhgCheckbox() {
  const cb = document.getElementById('explore-ghg-only');
  if (cb) cb.checked = !!S.exploreGhgOnly;
}

document.getElementById('explore-ghg-only')?.addEventListener('change', e => {
  S.exploreGhgOnly = e.target.checked;
  buildMetricFilters();
  renderAll();
});

buildSidebar();
if (typeof preloadFoodIcons === 'function') preloadFoodIcons();
syncExploreGhgCheckbox();
renderAll();

window.addEventListener('resize', () => {
  if (S.activeView === 'v2') initCanvas3D();
  else if (S.activeView === 'v4' && typeof renderAccountDashboard === 'function') renderAccountDashboard();
  else renderAll();
});
