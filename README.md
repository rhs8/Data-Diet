# Data & Diet: Environmental Footprint Visualization
**CMPT 467 · Group 14 · Rana Hoshyarsadeghi & Ting-Yu Tsai**

**Live demo:** [https://rhs8.github.io/Data-Diet/](https://rhs8.github.io/Data-Diet/)

## File Structure

```
├── index.html   ← Open this in your browser
├── style.css    ← All styles and CSS variables
├── data.js      ← FOODS, METRICS, SUBS constants
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

**Breakdown.** Stacked bar, heatmap matrix, donut. Hover bars for linked highlight across charts.

**3D Landscape.** Isometric 3D canvas, radar, impact meter. Drag to rotate; click a column to inspect food.

**Footprint.** Stacked area chart, substitution cards. Toggle foods to see cumulative impact change.

**My logbook.** Account, meal log, trends, backup. Local profile and JSON export or import.

## Live site (GitHub Pages)

This repo is static HTML/CSS/JS. You can host it for free on GitHub:

1. Open the repo on GitHub: [rhs8/Data-Diet](https://github.com/rhs8/Data-Diet).
2. Go to **Settings** (repo menu) → **Pages** (left sidebar).
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Under **Branch**, choose **`main`** and folder **`/ (root)`**, then click **Save**.
5. After a minute or two, GitHub shows the site URL at the top of the Pages settings page. It will look like **`https://rhs8.github.io/Data-Diet/`**.

If the site does not load, wait a bit and hard-refresh. The repo must have `index.html` at the root of the `main` branch (this project does).

## Interactivity Features (rubric)

1. **Linked cross-view highlighting:** hovering any food dims it everywhere simultaneously.
2. **3D click-to-select:** clicking a 3D bar column locks focus and updates radar and impact meter (bidirectional with sidebar).
3. **Metric filter:** toggling a metric changes *what data is shown* (data-affecting interaction).
4. **Serving count:** adjusting weekly servings re-computes all chart values live.

## Data Source
`data.js` uses the Environmental Impact of Food Production dataset (Kaggle).

Subset: Beef, Pork, Poultry, Milk, Rice, Vegetables.

Metrics: GHG Emissions · Land Use · Animal Feed · Processing · Eutrophication.
