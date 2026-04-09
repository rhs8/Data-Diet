// ═══════════════════════════════════════════════════════════════
// account.js — local profile, meal logbook, presets, trends, backup
// Depends on: data.js (FOODS, METRICS), main.js (S, renderAll, resolveColor)
// ═══════════════════════════════════════════════════════════════

const ACCOUNT_STORAGE_KEY = 'dnd_footprint_logbook_v1';
const TRENDS_GHG_KEY = 'dnd_acct_trends_ghg';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

let accountTab = 'log';
let accountEditingLogId = null;

function defaultStore() {
  return { users: {}, logs: {}, session: null, presets: {} };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return defaultStore();
    const o = JSON.parse(raw);
    return {
      users: o.users || {},
      logs: o.logs || {},
      session: o.session || null,
      presets: o.presets || {},
    };
  } catch {
    return defaultStore();
  }
}

function saveStore(store) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(store));
}

function currentUser() {
  const s = loadStore();
  if (!s.session || !s.users[s.session]) return null;
  return s.session;
}

function trendsGhgOnly() {
  return localStorage.getItem(TRENDS_GHG_KEY) === '1';
}

function setTrendsGhgOnly(v) {
  localStorage.setItem(TRENDS_GHG_KEY, v ? '1' : '0');
}

function dayValue(seriesRow, ghgOnly) {
  return ghgOnly ? (seriesRow.metrics.ghg || 0) : seriesRow.total;
}

async function sha256Hex(str) {
  if (!globalThis.crypto?.subtle) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return 'fb:' + (h >>> 0).toString(16) + ':' + str.length;
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function foodById(id) {
  return FOODS.find(f => f.id === id);
}

function itemMetricTotals(foodId, servings) {
  const f = foodById(foodId);
  if (!f) return null;
  const out = {};
  METRICS.forEach(m => { out[m.key] = f[m.key] * servings; });
  return out;
}

function aggregateDayMetrics(logsForUser) {
  const byDate = {};
  logsForUser.forEach(log => {
    const d = log.date;
    if (!byDate[d]) {
      byDate[d] = Object.fromEntries(METRICS.map(m => [m.key, 0]));
    }
    (log.items || []).forEach(it => {
      const t = itemMetricTotals(it.foodId, Number(it.servings) || 0);
      if (!t) return;
      METRICS.forEach(m => { byDate[d][m.key] += t[m.key]; });
    });
  });
  const dates = Object.keys(byDate).sort();
  return dates.map(date => {
    const m = byDate[date];
    const total = METRICS.reduce((s, x) => s + m[x.key], 0);
    return { date, metrics: m, total };
  });
}

/** Sum daily series into ISO weeks (week starting Monday). */
function rollupByWeek(series) {
  const parse = d3.timeParse('%Y-%m-%d');
  const map = new Map();
  series.forEach(d => {
    const t = parse(d.date);
    if (!t) return;
    const wk = d3.timeMonday(t);
    const key = d3.timeFormat('%Y-%m-%d')(wk);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: d3.timeFormat('%b %d')(wk),
        metrics: Object.fromEntries(METRICS.map(m => [m.key, 0])),
        total: 0,
      });
    }
    const row = map.get(key);
    METRICS.forEach(m => { row.metrics[m.key] += d.metrics[m.key] || 0; });
    row.total += d.total;
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Sum daily series into calendar months YYYY-MM. */
function rollupByMonth(series) {
  const map = new Map();
  series.forEach(d => {
    const key = d.date.slice(0, 7);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key,
        metrics: Object.fromEntries(METRICS.map(m => [m.key, 0])),
        total: 0,
      });
    }
    const row = map.get(key);
    METRICS.forEach(m => { row.metrics[m.key] += d.metrics[m.key] || 0; });
    row.total += d.total;
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function updateAccountHeader() {
  const el = document.getElementById('header-session');
  if (!el) return;
  const u = currentUser();
  if (u) {
    el.innerHTML = `<span class="header-session-user">${escapeHtml(u)}</span><button type="button" class="header-signout" id="header-signout">Sign out</button>`;
    document.getElementById('header-signout')?.addEventListener('click', () => {
      const st = loadStore();
      st.session = null;
      saveStore(st);
      accountTab = 'log';
      accountEditingLogId = null;
      updateAccountHeader();
      if (typeof S !== 'undefined' && S.activeView === 'v4') renderAccountDashboard();
    });
  } else {
    el.innerHTML = `<span class="header-session-guest">Not signed in</span>`;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function foodOptionsHtml(selectedId) {
  if (typeof foodsGroupedByCategory === 'function') {
    return foodsGroupedByCategory().map(cat => {
      const inner = cat.foods.map(f =>
        `<option value="${escapeHtml(f.id)}" ${f.id === selectedId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`
      ).join('');
      return `<optgroup label="${escapeHtml(cat.label)}">${inner}</optgroup>`;
    }).join('');
  }
  return FOODS.map(f =>
    `<option value="${escapeHtml(f.id)}" ${f.id === selectedId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`
  ).join('');
}

function renderFoodRow(selectedId = 'other-vegetables', servings = 1) {
  const opts = foodOptionsHtml(selectedId);
  return `
    <div class="meal-line" data-line>
      <select class="acct-input acct-select" data-food>${opts}</select>
      <label class="acct-serv-label">Servings <input type="number" class="acct-input acct-num" data-servings min="0.25" max="20" step="0.25" value="${servings}" /></label>
      <button type="button" class="acct-btn-ghost meal-remove" title="Remove">×</button>
    </div>`;
}

function mealLinesHtmlFromItems(items) {
  if (!items || !items.length) return renderFoodRow();
  return items.map(it => renderFoodRow(it.foodId, it.servings)).join('');
}

function bindMealForm(root) {
  const lines = root.querySelector('[data-meal-lines]');
  root.querySelector('[data-add-line]')?.addEventListener('click', () => {
    lines.insertAdjacentHTML('beforeend', renderFoodRow());
    bindLineRemove(lines);
  });
  bindLineRemove(lines);
}

function bindLineRemove(lines) {
  lines.querySelectorAll('.meal-remove').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('[data-line]');
      if (lines.querySelectorAll('[data-line]').length > 1) row.remove();
    };
  });
}

function collectMealItems(root) {
  const items = [];
  root.querySelectorAll('[data-line]').forEach(row => {
    const foodId = row.querySelector('[data-food]')?.value;
    const servings = parseFloat(row.querySelector('[data-servings]')?.value) || 0;
    if (foodId && servings > 0) items.push({ foodId, servings });
  });
  return items;
}

function getPresets(user) {
  return loadStore().presets[user] || [];
}

function renderAccountDashboard() {
  const mount = document.getElementById('account-mount');
  if (!mount) return;

  const user = currentUser();
  updateAccountHeader();

  if (!user) {
    mount.innerHTML = `
      <details class="methodology-blurb account-methodology">
        <summary>How numbers work</summary>
        <p>Intensities are per kg of product (from <code>data.js</code>). A meal line multiplies by <strong>servings</strong>. Adding different metrics (GHG, land, …) mixes units. Treat combined totals as an <strong>exploratory index</strong>, not one physical quantity. For a single interpretable measure, use <strong>GHG only</strong> (kg CO₂) in Your trends, or on Breakdown turn off other impact types under <strong>Impact types</strong> in the sidebar.</p>
      </details>
      <div class="account-auth-grid">
        <div class="chart-box account-card">
          <div class="chart-box-title">Create account</div>
          <p class="account-small">Stored only in this browser (localStorage). Use a unique username and a password you don’t reuse elsewhere.</p>
          <form id="form-register" class="account-form">
            <label>Username <input name="user" class="acct-input" required autocomplete="username" maxlength="32" pattern="[a-zA-Z0-9_-]+" /></label>
            <label>Password <input name="pass" type="password" class="acct-input" required autocomplete="new-password" minlength="4" /></label>
            <button type="submit" class="acct-btn-primary">Register</button>
            <p class="account-msg" id="reg-msg"></p>
          </form>
        </div>
        <div class="chart-box account-card">
          <div class="chart-box-title">Sign in</div>
          <form id="form-login" class="account-form">
            <label>Username <input name="user" class="acct-input" required autocomplete="username" /></label>
            <label>Password <input name="pass" type="password" class="acct-input" required autocomplete="current-password" /></label>
            <button type="submit" class="acct-btn-primary">Sign in</button>
            <p class="account-msg" id="login-msg"></p>
          </form>
        </div>
      </div>`;

    document.getElementById('form-register')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const username = String(fd.get('user') || '').trim();
      const pass = String(fd.get('pass') || '');
      const msg = document.getElementById('reg-msg');
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        msg.textContent = 'Username: letters, numbers, _ and - only.';
        return;
      }
      const st = loadStore();
      if (st.users[username]) {
        msg.textContent = 'That username is already taken.';
        return;
      }
      const passHash = await sha256Hex(pass);
      st.users[username] = { passHash, createdAt: new Date().toISOString() };
      st.logs[username] = st.logs[username] || [];
      st.presets[username] = st.presets[username] || [];
      st.session = username;
      saveStore(st);
      accountTab = 'log';
      renderAccountDashboard();
      if (typeof renderAll === 'function') renderAll();
    });

    document.getElementById('form-login')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const username = String(fd.get('user') || '').trim();
      const pass = String(fd.get('pass') || '');
      const msg = document.getElementById('login-msg');
      const st = loadStore();
      const u = st.users[username];
      if (!u) {
        msg.textContent = 'Unknown username or wrong password.';
        return;
      }
      const h = await sha256Hex(pass);
      if (h !== u.passHash) {
        msg.textContent = 'Unknown username or wrong password.';
        return;
      }
      st.session = username;
      saveStore(st);
      accountTab = 'log';
      renderAccountDashboard();
      if (typeof renderAll === 'function') renderAll();
    });
    return;
  }

  const logs = loadStore().logs[user] || [];
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));

  mount.innerHTML = `
    <details class="methodology-blurb account-methodology">
      <summary>How numbers work</summary>
      <p>Each meal line is <strong>per-kg intensity × servings</strong>. Summing every metric into one number mixes units (kg CO₂, m², …). Use that <strong>index</strong> for relative trends. For one clear unit, turn on <strong>GHG only</strong> below in Your trends, or on Breakdown use sidebar <strong>Impact types</strong> to show only GHG.</p>
    </details>
    <div class="account-tabs">
      <button type="button" class="account-tab ${accountTab === 'log' ? 'active' : ''}" data-tab="log">Log a meal</button>
      <button type="button" class="account-tab ${accountTab === 'history' ? 'active' : ''}" data-tab="history">History</button>
      <button type="button" class="account-tab ${accountTab === 'trends' ? 'active' : ''}" data-tab="trends">Your trends</button>
      <button type="button" class="account-tab ${accountTab === 'backup' ? 'active' : ''}" data-tab="backup">Backup</button>
    </div>
    <div id="account-tab-body"></div>`;

  const body = mount.querySelector('#account-tab-body');
  mount.querySelectorAll('.account-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      accountTab = btn.dataset.tab;
      renderAccountDashboard();
    });
  });

  if (accountTab === 'log') {
    renderLogTab(body, user, sorted);
  } else if (accountTab === 'history') {
    renderHistoryTab(body, user, sorted);
  } else if (accountTab === 'trends') {
    renderTrendsPanel(body, user, logs);
  } else {
    renderBackupTab(body);
  }
}

function renderLogTab(body, user, sorted) {
  const today = new Date().toISOString().slice(0, 10);
  const editing = accountEditingLogId ? sorted.find(l => l.id === accountEditingLogId) : null;
  const presets = getPresets(user);

  const dateVal = editing ? editing.date : today;
  const mealVal = editing ? editing.mealType : 'breakfast';
  const linesHtml = editing ? mealLinesHtmlFromItems(editing.items) : renderFoodRow();
  const mealOpts = MEAL_TYPES.map(m =>
    `<option value="${m.id}" ${m.id === mealVal ? 'selected' : ''}>${m.label}</option>`
  ).join('');

  body.innerHTML = `
    <div class="chart-box account-card">
      <div class="chart-box-title">${editing ? 'Edit meal' : 'Add consumption'}</div>
      ${editing ? `<p class="account-small">Updating entry from ${escapeHtml(editing.date)} · <button type="button" class="acct-link-btn" id="acct-cancel-edit">Cancel edit</button></p>` : ''}
      <form id="form-meal" class="account-form account-meal-form">
        ${editing ? `<input type="hidden" name="editing-id" value="${escapeHtml(editing.id)}" />` : ''}
        <div class="account-form-row">
          <label>Date <input name="date" type="date" class="acct-input" required value="${dateVal}" /></label>
          <label>Meal
            <select name="meal" class="acct-input acct-select">${mealOpts}</select>
          </label>
        </div>
        <div class="account-small" style="margin-bottom:8px">Foods &amp; servings (per sitting)</div>
        <div data-meal-lines>${linesHtml}</div>
        <button type="button" class="acct-btn-ghost" data-add-line>+ Add food line</button>
        <div class="preset-row">
          <span class="account-small">Quick presets</span>
          <div class="preset-chips">
            ${presets.length ? presets.map(p =>
              `<button type="button" class="acct-chip" data-apply-preset="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button>`
            ).join('') : '<span class="account-small">None yet. Fill lines below and save one.</span>'}
          </div>
          <div class="preset-save-row">
            <input type="text" id="preset-name" class="acct-input preset-name-input" placeholder="Preset name (e.g. usual breakfast)" maxlength="40" />
            <button type="button" class="acct-btn-ghost" id="preset-save-btn">Save current lines as preset</button>
          </div>
        </div>
        <button type="submit" class="acct-btn-primary" style="margin-top:14px">${editing ? 'Update meal' : 'Save meal'}</button>
        <p class="account-msg" id="meal-msg"></p>
      </form>
    </div>`;

  bindMealForm(body);
  document.getElementById('acct-cancel-edit')?.addEventListener('click', () => {
    accountEditingLogId = null;
    renderAccountDashboard();
  });

  body.querySelectorAll('[data-apply-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-apply-preset');
      const p = getPresets(user).find(x => x.id === id);
      if (!p || !p.items?.length) return;
      const form = document.getElementById('form-meal');
      form.querySelector('[data-meal-lines]').innerHTML = mealLinesHtmlFromItems(p.items);
      bindMealForm(form);
    });
  });

  document.getElementById('preset-save-btn')?.addEventListener('click', () => {
    const form = document.getElementById('form-meal');
    const name = String(document.getElementById('preset-name')?.value || '').trim();
    if (!name) {
      document.getElementById('meal-msg').textContent = 'Enter a preset name first.';
      return;
    }
    const items = collectMealItems(form);
    if (!items.length) {
      document.getElementById('meal-msg').textContent = 'Add at least one food line before saving a preset.';
      return;
    }
    const st = loadStore();
    st.presets[user] = st.presets[user] || [];
    st.presets[user].push({
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      items: items.map(it => ({ foodId: it.foodId, servings: it.servings })),
    });
    saveStore(st);
    document.getElementById('preset-name').value = '';
    document.getElementById('meal-msg').textContent = 'Preset saved.';
    setTimeout(() => renderAccountDashboard(), 400);
  });

  document.getElementById('form-meal')?.addEventListener('submit', ev => {
    ev.preventDefault();
    const form = ev.target;
    const fd = new FormData(form);
    const date = fd.get('date');
    const mealType = fd.get('meal');
    const editId = fd.get('editing-id');
    const items = collectMealItems(form);
    const msg = document.getElementById('meal-msg');
    if (!items.length) {
      msg.textContent = 'Add at least one food with servings > 0.';
      return;
    }
    const st = loadStore();
    st.logs[user] = st.logs[user] || [];

    if (editId) {
      const idx = st.logs[user].findIndex(l => l.id === editId);
      if (idx >= 0) {
        st.logs[user][idx] = {
          ...st.logs[user][idx],
          date,
          mealType,
          items,
          updatedAt: new Date().toISOString(),
        };
      }
      accountEditingLogId = null;
      msg.textContent = 'Updated.';
    } else {
      st.logs[user].push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date,
        mealType,
        items,
        createdAt: new Date().toISOString(),
      });
      msg.textContent = 'Saved.';
    }
    saveStore(st);
    form.querySelector('[data-meal-lines]').innerHTML = renderFoodRow();
    bindMealForm(form);
    if (!editId) {
      const dn = form.querySelector('[name="date"]');
      if (dn) dn.value = new Date().toISOString().slice(0, 10);
    }
    setTimeout(() => { msg.textContent = ''; }, 2000);
    if (editId) setTimeout(() => renderAccountDashboard(), 600);
  });
}

function renderHistoryTab(body, user, sorted) {
  if (!sorted.length) {
    body.innerHTML = `<div class="chart-box account-card"><p class="account-empty">No meals logged yet. Use <em>Log a meal</em> to start your timeline.</p></div>`;
    return;
  }
  body.innerHTML = `
    <div class="chart-box account-card">
      <div class="chart-box-title">Logged meals (${sorted.length})</div>
      <div class="account-table-wrap">
        <table class="account-table">
          <thead><tr><th>Date</th><th>Meal</th><th>Foods</th><th></th></tr></thead>
          <tbody>
            ${sorted.map(log => {
              const mt = MEAL_TYPES.find(x => x.id === log.mealType)?.label || log.mealType;
              const foods = (log.items || []).map(it => {
                const f = foodById(it.foodId);
                if (!f) return escapeHtml(it.foodId);
                const ic = typeof foodIconHtml === 'function' ? foodIconHtml(f.id, 15) : '';
                const col = typeof resolveColor === 'function' ? resolveColor(f.color) : '';
                const icWrap = col
                  ? `<span class="hist-food-ic" style="color:${col}">${ic}</span>`
                  : ic;
                return `<span class="hist-food">${icWrap}<span class="hist-food-txt">${escapeHtml(f.name)} ×${escapeHtml(String(it.servings))}</span></span>`;
              }).join('<span class="hist-sep">, </span>');
              return `<tr data-log-id="${escapeHtml(log.id)}">
                <td>${escapeHtml(log.date)}</td>
                <td>${escapeHtml(mt)}</td>
                <td class="account-td-foods">${foods}</td>
                <td class="account-actions">
                  <button type="button" class="acct-btn-ghost acct-btn-del" data-edit="${escapeHtml(log.id)}">Edit</button>
                  <button type="button" class="acct-btn-ghost acct-btn-del" data-delete="${escapeHtml(log.id)}">Delete</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  body.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      accountEditingLogId = btn.getAttribute('data-edit');
      accountTab = 'log';
      renderAccountDashboard();
    });
  });

  body.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this meal from your log?')) return;
      const id = btn.getAttribute('data-delete');
      const st = loadStore();
      st.logs[user] = (st.logs[user] || []).filter(l => l.id !== id);
      saveStore(st);
      if (accountEditingLogId === id) accountEditingLogId = null;
      renderAccountDashboard();
    });
  });
}

function renderBackupTab(body) {
  body.innerHTML = `
    <div class="chart-box account-card">
      <div class="chart-box-title">Export</div>
      <p class="account-small">Download all accounts, meal logs, and presets from this browser as JSON. Use this before clearing site data or switching computers (you’ll import on the other side).</p>
      <button type="button" class="acct-btn-primary" id="acct-export-btn">Download backup (.json)</button>
    </div>
    <div class="chart-box account-card">
      <div class="chart-box-title">Import</div>
      <p class="account-small"><strong>Replaces</strong> everything currently in this app’s logbook storage for this browser. Sign in again if your username was in the file.</p>
      <label class="acct-file-label">
        <input type="file" id="acct-import-file" accept=".json,application/json" class="acct-file-input" />
      </label>
      <p class="account-msg" id="import-msg"></p>
    </div>`;

  document.getElementById('acct-export-btn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(loadStore(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diet-footprint-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('acct-import-file')?.addEventListener('change', ev => {
    const f = ev.target.files?.[0];
    const msg = document.getElementById('import-msg');
    msg.textContent = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const o = JSON.parse(reader.result);
        if (!o || typeof o.users !== 'object' || typeof o.logs !== 'object') {
          msg.textContent = 'Invalid file: expected users and logs objects.';
          return;
        }
        if (!confirm('Replace ALL local logbook data with this file? This cannot be undone.')) {
          ev.target.value = '';
          return;
        }
        const merged = {
          users: o.users,
          logs: o.logs || {},
          session: null,
          presets: o.presets || {},
        };
        saveStore(merged);
        accountEditingLogId = null;
        accountTab = 'backup';
        msg.textContent = 'Imported. Sign in if needed.';
        updateAccountHeader();
        renderAccountDashboard();
      } catch {
        msg.textContent = 'Could not parse JSON.';
      }
      ev.target.value = '';
    };
    reader.readAsText(f);
  });
}

function renderTrendsPanel(body, user, logs) {
  const series = aggregateDayMetrics(logs);
  if (!series.length) {
    body.innerHTML = `<div class="chart-box account-card"><p class="account-empty">Log a few meals on different days to see your footprint trend.</p></div>`;
    return;
  }

  const ghg = trendsGhgOnly();
  const yNote = ghg
    ? 'Vertical axis: kg CO₂ (sum of logged foods × servings × intensity for that day).'
    : 'Vertical axis: sum of all active metrics (an index for comparison, not one physical unit).';

  body.innerHTML = `
    <div class="trends-toolbar chart-box account-card">
      <label class="acct-toggle-label">
        <input type="checkbox" id="acct-trends-ghg" ${ghg ? 'checked' : ''} />
        <span>GHG only (kg CO₂), interpretable for sharing</span>
      </label>
      <p class="account-small" style="margin:0">${yNote}</p>
    </div>
    <div class="chart-box account-card">
      <div class="chart-box-title">By day</div>
      <svg id="acct-line-svg" class="acct-chart-svg"></svg>
    </div>
    <div class="chart-box account-card" id="acct-stack-wrap">
      <div class="chart-box-title">${ghg ? 'GHG by day (bars)' : 'Daily footprint by metric (stacked)'}</div>
      <svg id="acct-stack-svg" class="acct-chart-svg acct-chart-tall"></svg>
    </div>
    <div class="chart-box account-card">
      <div class="chart-box-title">By week (rolled up)</div>
      <p class="account-small">Each bar is the Monday-starting week total${ghg ? ' in kg CO₂' : ' (index)'}.</p>
      <svg id="acct-week-svg" class="acct-chart-svg"></svg>
    </div>
    <div class="chart-box account-card">
      <div class="chart-box-title">By month</div>
      <p class="account-small">Calendar month totals${ghg ? ' in kg CO₂' : ' (index)'}.</p>
      <svg id="acct-month-svg" class="acct-chart-svg"></svg>
    </div>`;

  document.getElementById('acct-trends-ghg')?.addEventListener('change', e => {
    setTrendsGhgOnly(e.target.checked);
    renderAccountDashboard();
  });

  const weeks = rollupByWeek(series);
  const months = rollupByMonth(series);

  renderAcctLineChart('#acct-line-svg', series, ghg);
  if (ghg) renderAcctGhgBars('#acct-stack-svg', series);
  else renderAcctStackChart('#acct-stack-svg', series);
  renderAcctRollupBars('#acct-week-svg', weeks, ghg);
  renderAcctRollupBars('#acct-month-svg', months, ghg);
}

function renderAcctLineChart(selector, series, ghgOnly) {
  const svgEl = document.querySelector(selector);
  if (!svgEl) return;
  const W = svgEl.parentElement.offsetWidth - 48 || 400;
  const H = 220;
  const mg = { t: 12, r: 16, b: 36, l: 52 };
  const w = W - mg.l - mg.r;
  const h = H - mg.t - mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const parse = d3.timeParse('%Y-%m-%d');
  const data = series.map(d => ({ ...d, t: parse(d.date), v: dayValue(d, ghgOnly) }));
  const t0 = d3.min(data, d => d.t);
  const t1 = d3.max(data, d => d.t);
  const xDom = t0.getTime() === t1.getTime()
    ? [d3.timeDay.offset(t0, -1), d3.timeDay.offset(t1, 1)]
    : [t0, t1];

  const x = d3.scaleTime().domain(xDom).range([0, w]);
  const maxV = d3.max(data, d => d.v) * 1.08 || 1;
  const y = d3.scaleLinear().domain([0, maxV]).range([h, 0]);

  svg.append('g').attr('class', 'd3-grid')
    .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(''))
    .call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(ghgOnly ? '.1f' : '.0f')))
    .call(g => g.select('.domain').remove());
  svg.append('text').attr('x', -4).attr('y', -2).attr('fill', 'var(--ink3)').attr('font-size', '8px').attr('font-family', 'var(--mono)')
    .text(ghgOnly ? 'kg CO₂' : 'index');
  svg.append('g').attr('class', 'd3-axis').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(Math.min(6, data.length)).tickFormat(d3.timeFormat('%b %d')))
    .call(g => g.select('.domain').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '9px');

  const line = d3.line().x(d => x(d.t)).y(d => y(d.v)).curve(d3.curveMonotoneX);
  svg.append('path').datum(data).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2).attr('d', line);
  svg.selectAll('.dot').data(data).enter().append('circle')
    .attr('cx', d => x(d.t)).attr('cy', d => y(d.v)).attr('r', 4)
    .attr('fill', 'var(--accent)').attr('opacity', 0.85);
}

function renderAcctGhgBars(selector, series) {
  const svgEl = document.querySelector(selector);
  if (!svgEl) return;
  const W = svgEl.parentElement.offsetWidth - 48 || 400;
  const H = 240;
  const mg = { t: 10, r: 16, b: 40, l: 52 };
  const w = W - mg.l - mg.r;
  const h = H - mg.t - mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const data = series.map(d => ({ date: d.date, ghg: d.metrics.ghg || 0 }));
  const maxY = d3.max(data, d => d.ghg) * 1.08 || 1;
  const x = d3.scaleBand().domain(data.map(d => d.date)).range([0, w]).padding(0.15);
  const y = d3.scaleLinear().domain([0, maxY]).range([h, 0]);

  svg.append('g').attr('class', 'd3-grid')
    .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(''))
    .call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.1f')))
    .call(g => g.select('.domain').remove());
  svg.append('text').attr('x', -4).attr('y', -2).attr('fill', 'var(--ink3)').attr('font-size', '8px').attr('font-family', 'var(--mono)').text('kg CO₂');
  svg.append('g').attr('class', 'd3-axis').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(d => d.slice(5).replace('-', '/')))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '8px').attr('transform', 'rotate(-35)').style('text-anchor', 'end');

  svg.selectAll('rect').data(data).enter().append('rect')
    .attr('x', d => x(d.date))
    .attr('width', x.bandwidth())
    .attr('y', d => y(d.ghg))
    .attr('height', d => Math.max(0, y(0) - y(d.ghg)))
    .attr('fill', 'var(--c-ghg)')
    .attr('opacity', 0.9);
}

function renderAcctStackChart(selector, series) {
  const svgEl = document.querySelector(selector);
  if (!svgEl) return;
  const W = svgEl.parentElement.offsetWidth - 48 || 400;
  const H = 260;
  const mg = { t: 10, r: 16, b: 40, l: 48 };
  const w = W - mg.l - mg.r;
  const h = H - mg.t - mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const parse = d3.timeParse('%Y-%m-%d');
  const keys = METRICS.map(m => m.key);
  const data = series.map(d => {
    const row = { date: d.date, t: parse(d.date) };
    keys.forEach(k => { row[k] = d.metrics[k] || 0; });
    return row;
  });

  const stack = d3.stack().keys(keys)(data);
  const maxY = d3.max(stack, layer => d3.max(layer, d => d[1])) || 1;

  const x = d3.scaleBand().domain(data.map(d => d.date)).range([0, w]).padding(0.15);
  const y = d3.scaleLinear().domain([0, maxY * 1.05]).range([h, 0]);

  svg.append('g').attr('class', 'd3-grid')
    .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(''))
    .call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0f')))
    .call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'd3-axis').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(d => d.slice(5).replace('-', '/')))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '8px').attr('transform', 'rotate(-35)').style('text-anchor', 'end');

  stack.forEach((layer, si) => {
    const metric = METRICS[si];
    svg.append('g').selectAll('rect')
      .data(layer)
      .enter().append('rect')
      .attr('x', d => x(d.data.date))
      .attr('width', x.bandwidth())
      .attr('y', d => y(d[1]))
      .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
      .attr('fill', metric.color)
      .attr('opacity', 0.88);
  });

  const leg = svg.append('g').attr('transform', `translate(0,${h + 28})`);
  METRICS.forEach((m, i) => {
    leg.append('rect').attr('x', i * 78).attr('y', 0).attr('width', 8).attr('height', 8).attr('fill', m.color);
    leg.append('text').attr('x', i * 78 + 12).attr('y', 7).attr('fill', 'var(--ink3)').attr('font-size', '8px').attr('font-family', 'var(--mono)').text(m.label);
  });
}

function renderAcctRollupBars(selector, rollup, ghgOnly) {
  const svgEl = document.querySelector(selector);
  if (!svgEl) return;
  const W = svgEl.parentElement.offsetWidth - 48 || 400;
  const H = 240;
  const mg = { t: 10, r: 16, b: 48, l: 52 };
  const w = W - mg.l - mg.r;
  const h = H - mg.t - mg.b;

  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const svg = d3.select(svgEl).append('g').attr('transform', `translate(${mg.l},${mg.t})`);

  const data = rollup.map(r => ({
    key: r.key,
    label: r.label,
    v: ghgOnly ? (r.metrics.ghg || 0) : r.total,
  }));
  const maxY = d3.max(data, d => d.v) * 1.08 || 1;
  const x = d3.scaleBand().domain(data.map(d => d.key)).range([0, w]).padding(0.2);
  const y = d3.scaleLinear().domain([0, maxY]).range([h, 0]);

  svg.append('g').attr('class', 'd3-grid')
    .call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(''))
    .call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'd3-axis')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(ghgOnly ? '.1f' : '.0f')))
    .call(g => g.select('.domain').remove());
  svg.append('text').attr('x', -4).attr('y', -2).attr('fill', 'var(--ink3)').attr('font-size', '8px').attr('font-family', 'var(--mono)')
    .text(ghgOnly ? 'kg CO₂' : 'index');
  svg.append('g').attr('class', 'd3-axis').attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(d => {
      const row = data.find(x => x.key === d);
      return row ? row.label : d;
    }))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .selectAll('text').style('fill', 'var(--ink2)').style('font-size', '8px').attr('transform', 'rotate(-28)').style('text-anchor', 'end');

  svg.selectAll('rect').data(data).enter().append('rect')
    .attr('x', d => x(d.key))
    .attr('width', x.bandwidth())
    .attr('y', d => y(d.v))
    .attr('height', d => Math.max(0, y(0) - y(d.v)))
    .attr('fill', ghgOnly ? 'var(--c-ghg)' : 'var(--accent)')
    .attr('opacity', 0.88);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateAccountHeader);
} else {
  updateAccountHeader();
}
