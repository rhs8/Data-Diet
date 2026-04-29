# Data & Diet: Environmental Footprint Visualization

**CMPT 467 · Group 14 · Rana Hoshyarsadeghi & Ting-Yu Tsai**

**Live demo:** [https://rhs8.github.io/Data-Diet/](https://rhs8.github.io/Data-Diet/)

## File Structure

```
├── index.html   ← Open this in your browser
├── style.css    ← All styles and CSS variables
├── data.js      ← FOODS (43 items), METRICS, SUBS
├── food_production.csv  ← Source table (same as Kaggle Food_Production)
├── icons.js     ← SVG food / nav icons (Lucide-derived)
├── main.js      ← D3 charts, 3D canvas, interactivity
├── account.js   ← Logbook, auth, trends (localStorage)
├── e2e/app.spec.ts      ← Playwright end-to-end tests (10 scenarios)
├── playwright.config.ts ← Playwright config (local + CI use Chromium)
├── package.json / package-lock.json  ← Node deps; `npm ci` for CI
├── .github/workflows/
│   ├── pages.yml       ← GitHub Pages deploy
│   └── playwright.yml  ← E2E on push / PR to main
└── README.md
```

## How to Run in VS Code

### Option A: Live Server (recommended)

1. Install the **Live Server** extension in VS Code
  (search "Live Server" by Ritwick Dey in Extensions)
2. Right-click `index.html` → **Open with Live Server**
3. Browser opens automatically at `http://127.0.0.1:5500`

### Option B: Direct browser open

1. Open the project folder in your file explorer
2. Double-click `index.html`

> Note: Some browsers block local file JS imports. Use Live Server if charts don't render.

## End-to-end tests (Playwright)

The repo includes **10 Playwright tests** in `e2e/app.spec.ts`. Playwright uses `testDir: './e2e'`, so there is **no** top-level `tests/` folder—for reviewers on GitHub, open **`e2e/`** and **`.github/workflows/`** on `main`.

Coverage is **UI-focused**: the app is static HTML/JS, served by a local static server during tests; **no HTTP APIs** or backends are called in the suite. The tests hit **navigation and view panels** (Breakdown default, switch to 3D / Footprint / My logbook), **sidebar food list** and **bulk select / deselect** controls, **Breakdown SVG** readiness, and **metric filter** toggles. **Form-heavy flows** (typing into every logbook field, etc.) are **not** covered; My logbook is only opened and the `#account-mount` region is asserted visible.

**Run locally** (Node 20 recommended, same as CI):

1. `npm ci`
2. `npx playwright install chromium` (first time only; installs the browser for tests)
3. `npx playwright test`
  Add `--ui` for the interactive runner, or `npx playwright show-report` after a run to open the HTML report.

Playwright output (`playwright-report/`, `test-results/`, and related cache dirs) is listed in `.gitignore` so it is not committed.

### GitHub Actions CI

Workflow **Playwright E2E** (`.github/workflows/playwright.yml`) runs on every **push** and **pull request** to `main`: checks out the repo, runs `npm ci`, installs Chromium with system deps on `ubuntu-latest`, then `npx playwright test`. If a run fails, the workflow uploads the **playwright-report** folder as an artifact (kept seven days) so you can download and inspect traces and HTML output from the Actions run page.

### Bug found while writing tests

In **Breakdown**, the parallel sets container `#stacked-svg` becomes visible before D3 finishes appending the first drawable geometry (`path`, `line`, or `rect`). An assertion that fired immediately on “SVG visible, then first child attached” was **flaky** on cold loads (including CI): the box was on the page, but children were not there yet for a short window.

**Expected:** As soon as the chart area is shown, geometry is queryable for testing (or a dedicated “ready” signal exists). **Observed:** A brief delay between the empty SVG and populated paths/lines.

The test now waits up to **15 seconds** for the first geometry node with `toBeAttached`. A stronger product-side fix would be to expose a stable loading state (for example a `data-chart-ready` flag or callback) once the parallel sets render pass completes, so tests and other automation do not depend on timing.

## Views

**Breakdown.** Parallel sets (foods → metrics), heatmap matrix, donut. Hover ribbons for linked highlight across charts.

**3D Landscape.** Isometric 3D canvas, radar, impact meter. Drag to rotate; click a **food name** label to inspect metrics.

**Footprint.** Stacked area chart, substitution cards. Toggle foods to see cumulative impact change.

**My logbook.** Account, meal log, trends, backup. Local profile and JSON export or import.

## Live site (GitHub Pages)

If [https://rhs8.github.io/Data-Diet/](https://rhs8.github.io/Data-Diet/) returns **404**, GitHub is not publishing the site yet. Pick **one** of these:

### Option A: GitHub Actions (recommended; workflow is in this repo)

1. Open [rhs8/Data-Diet](https://github.com/rhs8/Data-Diet) → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
3. Push to `**main`** (or open **Actions** and run **Deploy GitHub Pages** manually). After the workflow succeeds, the site URL appears on the Pages settings page.

### Option B: Deploy from branch

1. **Settings** → **Pages** → **Source**: **Deploy from a branch**.
2. **Branch**: `**main`**, folder `**/ (root)**` → **Save**.

Wait a minute, then hard-refresh. `index.html` must stay at the repo root on `main`.

## Interactivity Features (rubric)

1. **Linked cross-view highlighting:** hovering any food dims it everywhere simultaneously.
2. **3D click-to-select:** clicking a food’s name in the 3D view locks focus and updates radar and impact meter (bidirectional with sidebar).
3. **Metric filter:** toggling a metric changes *what data is shown* (data-affecting interaction).
4. **Serving count:** adjusting weekly servings re-computes all chart values live.

## Data Source

`food_production.csv` is the **Environment Impact of Food Production** dataset (43 food products; Poore & Nemecek–style stage columns). `data.js` embeds the same rows for offline use.

Metrics mapped per kg: **GHG** (Total_emissions), **Land** (m²/kg), **Feed** & **Processing** (supply-chain CO₂ from those stages), **Eutrophication** (gPO₄eq/kg).