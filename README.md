# Data & Diet — Environmental Footprint Visualization
**CMPT 467 · Group 14 · Rana Hoshyarsadeghi & Ting-Yu Tsai**

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

### Option A — Live Server (recommended)
1. Install the **Live Server** extension in VS Code
   (search "Live Server" by Ritwick Dey in Extensions)
2. Right-click `index.html` → **Open with Live Server**
3. Browser opens automatically at `http://127.0.0.1:5500`

### Option B — Direct browser open
1. Open the project folder in your file explorer
2. Double-click `index.html`
> Note: Some browsers block local file JS imports. Use Live Server if charts don't render.

---

## Views

| View | Charts | Key Interaction |
|------|--------|-----------------|
| 📊 Breakdown | Stacked bar · Heatmap matrix · Donut | Hover bars → linked highlight across all charts |
| 🌐 3D Landscape | Isometric 3D canvas · Radar · Impact meter | Drag to rotate · Click column to inspect food |
| 🌿 Footprint | Stacked area chart · Substitution cards | Toggle foods to see cumulative impact change |

## Interactivity Features (rubric)

1. **Linked cross-view highlighting** — hovering any food dims it everywhere simultaneously
2. **3D click-to-select** — clicking a 3D bar column locks focus and updates radar + impact meter (bidirectional with sidebar)
3. **Metric filter** — toggling a metric changes *what data is shown* (data-affecting interaction)
4. **Serving count** — adjusting weekly servings re-computes all chart values live

## Data Source
`data.js` — Environmental Impact of Food Production dataset (Kaggle)
Subset: Beef, Pork, Poultry, Milk, Rice, Vegetables
Metrics: GHG Emissions · Land Use · Animal Feed · Processing · Eutrophication
