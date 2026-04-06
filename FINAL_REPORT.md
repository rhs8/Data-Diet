# Data & Diet  
## Environmental Food Footprint Visualizer

**Final Project Report**

**CMPT 467: Information Visualization**  
Simon Fraser University · Spring 2026  

**Group 14**  
Rana Hoshyarsadeghi · 301435394  
Ting-Yu Tsai · 301456611  

April 2026  

**Live application:** [https://rhs8.github.io/Data-Diet/](https://rhs8.github.io/Data-Diet/)  
**Source code:** [https://github.com/rhs8/Data-Diet](https://github.com/rhs8/Data-Diet)

* * *

## 1. Data Choice

### 1.1 Dataset Overview

The dataset selected for this project is **Environmental Impact of Food Production**, a tabular dataset available on Kaggle that measures the environmental cost associated with producing common food items. Each row represents a specific food product (such as beef, pork, rice, milk, or vegetables), while each column represents a quantitative environmental impact metric.

Key variables in the dataset include greenhouse gas emissions (CO₂ equivalent), land use, freshwater use, eutrophication potential, acidification, and production-related factors such as animal feed and processing. Because each food is described across multiple environmental dimensions, the dataset supports relational exploration, comparison, and analysis of trade-offs. For example, some foods may produce lower emissions but require more land or water, highlighting that sustainability cannot be defined by a single measure.

We selected this dataset because it is highly relevant to current environmental and sustainability discussions. Food is a part of everyday life, which makes this data personally meaningful. Our project focuses on personal visualization: the goal is to support awareness, reflection, and exploration.

### 1.2 Design Challenges

The multi-variable nature of the dataset presents both an opportunity and a design challenge. Environmental impact must be understood across several interconnected metrics rather than through one simple value. Key challenges include:

- **Scale disparity:** Land use values for beef (326 m²/kg) dwarf other foods by 2–50×, making standard linear axes misleading.
- **Unit heterogeneity:** Metrics span kg CO₂, m², g PO₄, MJ; direct comparison requires normalization decisions.
- **Personal relevance:** Abstract per-kg figures must be translated into meaningful personal dietary quantities.
- **Trade-off visibility:** Some foods score well on one metric but poorly on another; no single “best” food exists.

### 1.3 Sketchable Data Subset

The full dataset contains 43 food categories and over 20 metrics. To make early design sketching manageable and focused, we selected a representative subset of **6 foods** and **5 metrics** that capture the full range of environmental impact variation. The **complete numeric subset** is stored in the shipped application as the `FOODS` and `METRICS` arrays in `data.js` (not only a schema), satisfying the project check-in expectation that the actual data values accompany the proposal.

| Food | GHG (kg CO₂) | Land (m²) | Feed (kg) | Process (MJ) | Eutrophication (g PO₄) |
|------|-------------|-----------|-----------|--------------|-------------------------|
| Beef | 59.6 | 326.21 | 1.9 | 1.3 | 301.41 |
| Pork | 7.2 | 17.36 | 2.9 | 0.3 | 76.38 |
| Poultry | 6.1 | 12.22 | 1.8 | 0.4 | 48.70 |
| Milk | 2.8 | 8.95 | 0.2 | 0.1 | 10.65 |
| Rice | 4.0 | 2.80 | 0.0 | 0.1 | 35.07 |
| Vegetables | 0.5 | 0.38 | 0.0 | 0.1 | 2.27 |

**Table 1.** Sketchable data subset: 6 foods × 5 environmental metrics (values per kg of food produced). These values are the authoritative constants in `data.js`.

These foods were chosen to represent a range of environmental impact levels and food types, allowing for meaningful comparison between animal-based and plant-based foods while keeping the number of elements manageable.

* * *

## 2. Design Ideation: 10 Conceptually Distinct Sketches

Each group member independently produced 10 sketches exploring different visual representations of the food environmental impact data. The sketches span a wide range of chart types, encodings, and metaphors, from standard analytical charts to creative metaphor-based visuals.

### 2.1 Ting-Yu Tsai — Individual Sketches

**Sketch 1: Stacked Bar Chart.** A standard stacked bar chart with foods on the x-axis and normalized impact score on the y-axis. Each bar is divided into coloured segments representing the five environmental metrics. This encoding efficiently shows both total impact and metric composition simultaneously. Beef dominates overwhelmingly, illustrating the power of this layout for extremes.  
*Figure 1. Stacked bar chart: normalized impact score per food item.*

**Sketch 2: Grouped Bar Chart.** Five separate bars per food group, each coloured by metric. While this allows direct metric-to-metric comparison within a food, the chart becomes cluttered with six foods × five metrics = 30 bars. Better for single-metric focus than holistic overview.  
*Figure 2. Grouped bar chart: side-by-side metric comparison per food.*

**Sketch 3: Heatmap (color-coded intensity).** A food × metric matrix where cell color encodes normalized impact (0 = yellow, 1 = deep red). This encoding excels at revealing patterns across many food–metric combinations simultaneously. Beef’s row is uniformly dark, while vegetables appear uniformly light.  
*Figure 3. Heatmap matrix: color intensity encodes relative impact per metric.*

**Sketch 4: Circle Chart (area = GHG).** Each food is represented by a circle whose area is proportional to its GHG emissions. The massive area difference between beef (59.6 kg) and vegetables (0.5 kg) makes the scale intuitive. This encoding only supports one metric at a time and area perception is less accurate than length.  
*Figure 4. Proportional circle chart: area = GHG emissions per kg.*

**Sketch 5: Parallel Coordinates Plot.** Each food is a line connecting five vertical axes (one per metric), normalized to 0–100%. This encoding excels at revealing trade-off patterns; notably, pork scores high on animal feed while being moderate on emissions. Crossing lines highlight inversions in rankings between metrics.  
*Figure 5. Parallel coordinates: each line = one food, axes = metrics.*

**Sketch 6: Treemap (area = GHG).** Nested rectangles sized proportionally to GHG emissions. Beef occupies ~72% of the total area, visually dramatizing its dominance. The layout makes total proportions immediately clear but loses individual metric detail.  
*Figure 6. Treemap: area encodes GHG emissions, all foods in one view.*

**Sketch 7: Slope Chart (GHG vs land ranking).** Two ranked columns (one for GHG, one for land use) connected by lines. This shows how rice and milk swap rankings between the two metrics.  
*Figure 7. Slope chart: ranking change between GHG emissions and land use.*

**Sketch 8: Icon Array.** Each food is represented by a row of small circles, where each circle represents 5 kg CO₂. Beef requires ~12 circles, while vegetables require a fraction of one.  
*Figure 8. Icon array: each circle represents 5 kg CO₂ emissions.*

**Sketch 9: Waffle Chart (GHG).** A 10×10 grid of squares where the proportion of each food’s colour corresponds to its share of total GHG emissions.  
*Figure 9. Waffle chart: proportional GHG share per food.*

**Sketch 10: Small Multiples.** Five separate bar charts, one per metric, with consistent y-scale and food ordering.  
*Figure 10. Small multiples: one bar chart per environmental metric.*

### 2.2 Rana Hoshyarsadeghi — Individual Sketches

**Sketch 11:** Multi-metric treemap grid (2×2 treemaps, one per metric).  
**Sketch 12:** Radial chord diagram (foods and metrics as arc segments).  
**Sketch 13:** Marimekko chart (width = total impact, segments = metric shares).  
**Sketch 14:** Monochromatic heatmap (metrics as rows, foods as columns).  
**Sketch 15:** Plate visualization (dinner plate metaphor).  
**Sketch 16:** Pictorial stacked chart (food silhouette as container).  
**Sketch 17:** Layered 3D area chart (metrics as depth layers).  
**Sketch 18:** Nightingale / rose diagram (radial distance encodes land use per food).  
**Sketch 19:** Receipt visualization (diet as itemized environmental “cost”).  
**Sketch 20:** Parallel sets (flow width encodes contribution magnitude).  

*(Figures 11–20 as submitted in sketch packet.)*

* * *

## 3. Choosing a Direction: 10 Refinement Sketches

After reviewing all 20 initial sketches, we chose to move forward with an interaction-focused concept centered on a **personal food footprint**. This direction was selected because it:

- Connects abstract environmental data to everyday habits  
- Encourages reflection rather than purely analytical comparison  
- Makes environmental trade-offs more visible and understandable  
- Supports engagement through interaction and exploration  

We produced 10 additional refinement sketches developing the chosen direction (3D isometric landscape, 3D spheres, voxel grid, stacked bars with food labels, cylinder icon array, plate + 3D hybrid, land terrain, production line, GHG cloud, 3D pictorial container). **Refinement 4** explored emoji-capped 3D bars for immediate food recognition. **In the final build**, those labels were implemented as **stroke SVG food icons** adapted from the open-source [Lucide](https://lucide.dev) icon set (ISC license), recolored per food for consistency with the rest of the UI and for sharper rendering on Canvas and SVG.

* * *

## 4. Background: Related Work

The following works informed our design decisions across three themes: personal visualization and self-reflection, environmental data communication, and multi-dimensional food data visualization.

### 4.1 Personal Visualization and Self-Reflection

**[1]** Huang, D. et al. (2015). *Personal Visualization and Personal Visual Analytics.* IEEE TVCG 21(3). Defines personal visualization as visualization of data about oneself, for oneself, with goals of self-reflection, awareness, and behavior change.

**[2]** Choe, E.K. et al. (2014). *Understanding Quantified-Selfers’ Practices in Collecting and Exploring Personal Data.* CHI 2014. Users engage more deeply when data is connected to daily routines; our servings-per-week control and logbook operationalize this.

**[3]** Thudt, A. et al. (2018). *Self-Reflection and Personal Physicalization Construction.* CHI 2018. Inspired partly our rotatable 3D landscape as a space to explore rather than only read.

### 4.2 Environmental and Sustainability Visualization

**[4]** Stefaner, M. (2010). *Visual Tools for Communicating Environmental Data.* Abstract statistics translated into personal, proximate terms.

**[5]** Heer, J. & Bostock, M. (2010). *Crowdsourcing Graphical Perception.* CHI 2010. Position and length as primary encodings; bar height as primary, color secondary.

**[6]** Klerkx, J. et al. (2014). *Ontology-based Visual Exploration of Food Sustainability Data.* ISWC 2014 Workshops. Organizing around food items as rows supports user-centric navigation.

### 4.3 Multi-Dimensional and Comparative Visualization

**[7]** Inselberg, A. (1985). *The Plane with Parallel Coordinates.* The Visual Computer. Considered for multi-metric display; stacked bars chosen for general-audience learnability.

**[8]** Ware, C. (2004). *Information Visualization: Perception for Design.* 2nd ed. Preattentive color and 3D perception considerations; drag-to-rotate mitigates depth ambiguity.

**[9]** Shneiderman, B. (1996). *The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations.* VL 1996. Overview + zoom/filter + details-on-demand: our **four-tab** layout provides overview (Breakdown), exploration (3D), cumulative and substitution detail (Footprint), and **personal longitudinal detail (Logbook)**.

**[10]** Bostock, M., Ogievetsky, V. & Heer, J. (2011). *D3: Data-Driven Documents.* IEEE TVCG 17(12). All SVG charts use D3 v7.

**[11]** Liu, Z. & Heer, J. (2014). *The Effects of Interactive Latency on Exploratory Visual Analysis.* IEEE TVCG 20(12). Responsive synchronous updates for linked views.

**[12]** Wilkinson, L. (2005). *The Grammar of Graphics.* 2nd ed. Composable encodings in the hybrid 3D view (position × height × hue).

* * *

## 5. Implementation (Current System)

The final implementation is a **single-page web application** built with **vanilla JavaScript**, **D3.js v7.8.5** (CDN), **HTML5 Canvas 2D**, and **localStorage** for the logbook. It runs in any modern browser with **no build step or server-side code**. Typography uses **Google Fonts** (Playfair Display, Syne, JetBrains Mono).

### 5.1 Architecture and File Responsibilities

Scripts load in dependency order: `data.js` → `icons.js` → `main.js` → `account.js`.

| File | Responsibility |
|------|----------------|
| `index.html` | Structure, four view panels, sidebar, header session slot, D3 and font includes |
| `style.css` | Dark theme, CSS variables, layout, chart chrome, account UI |
| `data.js` | `FOODS`, `METRICS`, `SUBS` (substitution map); full numeric subset |
| `icons.js` | Lucide-derived SVG paths; `foodIconHtml`, `foodIconDataUri`, `getFoodIconImage`, preload |
| `main.js` | Global state `S`, all D3 renderers, Canvas `paint3D`, sidebar, tooltips, view switching |
| `account.js` | Accounts (SHA-256 password hash), meal log, presets, trends, backup import/export |

**Table 2.** File structure and responsibilities (as in the GitHub repository root).

The application is **deployed on GitHub Pages** from the `main` branch at the URL listed on the title page.

### 5.2 View 1: Impact Breakdown

Coordinated components:

- **Stacked bar chart.** Selected foods as stacked bars; layers = metrics; consistent colors; hover triggers cross-view highlighting and tooltips; servings rescale values live.  
- **Heatmap matrix.** Food × metric grid; opacity normalized **within each metric column** so within-column variation remains visible when one food dominates.  
- **Donut chart.** Share of total footprint per food; animated arcs; hover expansion and linked highlight; center shows total.  
- **Methodology blurb** (`<details>`): explains that summing different units yields an **exploratory index**, not a single physical quantity.  
- **“GHG only” on this tab.** Checkbox filters metrics to **GHG (kg CO₂)** on Breakdown only for a single-unit, audience-friendly reading; metric toggles in the sidebar are visually de-emphasized while this mode is active. Legend and donut respect the filtered metric set.

### 5.3 View 2: 3D Impact Landscape (Innovative View)

Hand-built **isometric bar landscape** on **Canvas 2D** (no WebGL). **Hybrid encoding:** X = food column, Z = metric row, height = scaled impact, fill hue = metric (from `resolveColor` on CSS variables).

- **Projection.** Y-rotation then X-rotation; perspective divide with fixed field of view.  
- **Depth sorting.** Painter’s algorithm: `depth = bx×sin(rotY) + bz×cos(rotY)`.  
- **Face shading.** Three drawn faces per bar; fills use **`shadeHex()`** to lighten/darken the metric RGB (not only global alpha), plus light edge strokes and a brighter top rim. Selected columns get a colored **shadow glow**.  
- **Scene composition.** Gradient **sky** and **halo**, **filled floor quad** with gradient, and a **grid** with major/minor line weights.  
- **Food icons.** Rasterized from SVG data-URIs (`foodIconDataUri`) above the first metric row per column; **food names** are drawn under each column using projected floor corners.  
- **Interaction.** Drag to rotate; click picks nearest column in screen space (threshold ~60px); selection syncs **radar** (selected vs average) and **impact meter** (horizontal bars, group-normalized).

### 5.4 View 3: Your Footprint

- **Cumulative stacked area chart.** Metrics as categorical X; stacked layers per food; `d3.curveCatmullRom`; dashed total polyline.  
- **Substitution cards.** From `SUBS` in `data.js`; show swap, textual reason, approximate GHG savings, and mini-bars for per-metric savings proportions.

### 5.5 View 4: My Logbook

Implemented in **`account.js`** with persistence under **`localStorage`** (`dnd_footprint_logbook_v1`):

- **Accounts:** register/sign-in/sign-out; passwords stored as **SHA-256** hashes (demo-only; disclaimer in UI).  
- **Meal logging:** date, meal type, multiple food lines (servings); **edit** and **delete** history rows.  
- **Presets:** save and reapply common meals.  
- **Trends:** rollups by **day, week, and month**; D3 line/area style charts; optional **GHG-only** toggle for trend totals.  
- **Backup:** export and import **JSON** for the full store.  

Header shows the signed-in user; logbook data **never leaves the browser** except via explicit export.

### 5.6 Interactivity Summary

| Interaction | What it does | Rubric type |
|-------------|--------------|-------------|
| Hover food / bar / matrix / donut / area | Dims other foods across views | Linked cross-view highlighting |
| 3D column click | Locks selection; updates radar and impact meter | Bidirectional linked views |
| Metric toggles (sidebar) | Removes metrics from **all** charts | Data-affecting |
| Serving +/- | Rescales all derived values | Data-affecting |
| GHG-only (Breakdown) | Restricts Breakdown charts to one interpretable unit | Data-affecting / communication |
| Logbook meals / presets | Writes persistent personal records; trends recompute | Data-affecting (personal layer) |

**Table 3.** Interactivity features and classification.

**Sidebar.** Food toggles use SVG icons beside names; weekly servings per selected food.

* * *

## 6. Discussion and Reflection

### 6.1 Design Decisions

- **Dark theme** reduces fatigue and lets metric hues read clearly.  
- **Weekly servings** bridge per-kg science and everyday portions.  
- **Dual encodings:** stacked bars preserve absolute scale drama; matrix column normalization preserves comparability within each metric.  
- **Methodology + GHG-only** address honest communication when combining unlike units.  
- **Logbook** extends “personal visualization” from hypothetical sliders to **remembered meals and time series**.  
- **SVG icons** replace emoji in the shipped UI for scalable, on-brand stroke artwork.

### 6.2 Limitations

- Subset remains **6 foods**; scaling to 43 would need search, categories, or virtualization.  
- 3D **painter’s order** can still mis-order faces at extreme angles; a Z-buffer would be more robust.  
- **Substitutions** are hand-authored in `SUBS`, not algorithmic multi-objective recommendations.  
- **Accessibility:** keyboard and screen-reader coverage could be expanded (e.g., ARIA on dynamic charts).  
- **Mobile:** layout is desktop-oriented.

### 6.3 Future Work

- Full dataset with filtering and search  
- User study on dietary intent or behavior  
- Responsive layout and colorblind-safe palette option  
- Stronger 3D occlusion or optional WebGL path  

* * *

## 7. References

1. Huang, D., Tory, M., Aseniero, B.A., Bartram, L., Bateman, S., Carpendale, S., Tang, A., & Woodbury, R. (2015). Personal Visualization and Personal Visual Analytics. *IEEE Transactions on Visualization and Computer Graphics*, 21(3), 420–433.  
2. Choe, E.K., Lee, N.B., Lee, B., Pratt, W., & Kientz, J.A. (2014). Understanding Quantified-Selfers’ Practices in Collecting and Exploring Personal Data. In *Proceedings of CHI 2014*, 1143–1152.  
3. Thudt, A., Hinrichs, U., Huron, S., & Carpendale, S. (2018). Self-Reflection and Personal Physicalization Construction. In *Proceedings of CHI 2018*, Paper 154.  
4. Stefaner, M. (2010). Visual Tools for the Carbon Footprint: Communicating Environmental Data. *Parsons Journal for Information Mapping*, 2(1).  
5. Heer, J. & Bostock, M. (2010). Crowdsourcing Graphical Perception: Using Mechanical Turk to Assess Visualization Design. In *Proceedings of CHI 2010*, 203–212.  
6. Klerkx, J., Duval, E., & Jedlicka, P. (2014). Ontology-based Visual Exploration of Food Sustainability Data. In *Proceedings of ISWC 2014 Workshops*.  
7. Inselberg, A. (1985). The Plane with Parallel Coordinates. *The Visual Computer*, 1(2), 69–91.  
8. Ware, C. (2004). *Information Visualization: Perception for Design* (2nd ed.). Morgan Kaufmann.  
9. Shneiderman, B. (1996). The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations. In *Proceedings of the IEEE Symposium on Visual Languages*, 336–343.  
10. Bostock, M., Ogievetsky, V., & Heer, J. (2011). D3: Data-Driven Documents. *IEEE Transactions on Visualization and Computer Graphics*, 17(12), 2301–2309.  
11. Liu, Z. & Heer, J. (2014). The Effects of Interactive Latency on Exploratory Visual Analysis. *IEEE Transactions on Visualization and Computer Graphics*, 20(12), 2122–2131.  
12. Wilkinson, L. (2005). *The Grammar of Graphics* (2nd ed.). Springer.  

* * *

*End of report.*
