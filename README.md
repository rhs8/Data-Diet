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
3. Push to **`main`** (or open **Actions** and run **Deploy GitHub Pages** manually). After the workflow succeeds, the site URL appears on the Pages settings page.

### Option B: Deploy from branch

1. **Settings** → **Pages** → **Source**: **Deploy from a branch**.
2. **Branch**: **`main`**, folder **`/ (root)`** → **Save**.

Wait a minute, then hard-refresh. `index.html` must stay at the repo root on `main`.

## Interactivity Features (rubric)

1. **Linked cross-view highlighting:** hovering any food dims it everywhere simultaneously.
2. **3D click-to-select:** clicking a food’s name in the 3D view locks focus and updates radar and impact meter (bidirectional with sidebar).
3. **Metric filter:** toggling a metric changes *what data is shown* (data-affecting interaction).
4. **Serving count:** adjusting weekly servings re-computes all chart values live.

## Data Source
`food_production.csv` is the **Environment Impact of Food Production** dataset (43 food products; Poore & Nemecek–style stage columns). `data.js` embeds the same rows for offline use.

Metrics mapped per kg: **GHG** (Total_emissions), **Land** (m²/kg), **Feed** & **Processing** (supply-chain CO₂ from those stages), **Eutrophication** (gPO₄eq/kg).
