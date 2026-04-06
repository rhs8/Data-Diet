// ═══════════════════════════════════════════════════════════════
// icons.js — inline SVG icons (foods + nav). Load after data.js, before main.js
// (so buildFoodList and other UI can call foodIconHtml on first paint).
//
// Food icons: paths adapted from Lucide Icons (https://lucide.dev),
// lucide-static@0.460.0 — ISC License. Mappings: beef→beef, pork→ham,
// poultry→drumstick, milk→milk, rice→soup (bowl), vegetables→salad.
// ═══════════════════════════════════════════════════════════════

const FOOD_ICON_PATHS = {
  beef: '<circle cx="12.5" cy="8.5" r="2.5"/><path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"/><path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/>',
  pork: '<path d="M13.144 21.144A7.274 10.445 45 1 0 2.856 10.856"/><path d="M13.144 21.144A7.274 4.365 45 0 0 2.856 10.856a7.274 4.365 45 0 0 10.288 10.288"/><path d="M16.565 10.435 18.6 8.4a2.501 2.501 0 1 0 1.65-4.65 2.5 2.5 0 1 0-4.66 1.66l-2.024 2.025"/><path d="m8.5 16.5-1-1"/>',
  poultry: '<path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23"/><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"/>',
  milk: '<path d="M8 2h8"/><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2"/><path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/>',
  rice: '<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/><path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/><path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/>',
  vegetables: '<path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"/><path d="m13 12 4-4"/><path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2"/>',
};

const NAV_ICON_PATHS = {
  breakdown: '<path d="M4 19V5M4 19h16M8 15V9M12 13V7M16 11v-2M20 9v6"/>',
  landscape: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18"/>',
  footprint: '<path d="M12 22c4-4 8-8 8-12a8 8 0 1 0-16 0c0 4 4 8 8 12z"/><path d="M12 8v4M12 16h.01"/>',
  logbook: '<path d="M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
};

function foodIconHtml(foodId, px = 20, className = 'icon-food') {
  const paths = FOOD_ICON_PATHS[foodId];
  if (!paths) return '';
  return `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function navIconSvg(key, px = 15) {
  const paths = NAV_ICON_PATHS[key];
  if (!paths) return '';
  return `<svg class="nav-ic" xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function foodIconDataUri(foodId, strokeHex) {
  const paths = FOOD_ICON_PATHS[foodId];
  if (!paths) return '';
  const hex = (strokeHex && String(strokeHex).trim()) ? String(strokeHex).replace(/"/g, '') : '#e8e4dc';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${hex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const foodIconImageCache = new Map();

function getFoodIconImage(foodId, strokeHex) {
  const key = foodId + '|' + strokeHex;
  let img = foodIconImageCache.get(key);
  if (!img) {
    img = new Image();
    img.src = foodIconDataUri(foodId, strokeHex);
    foodIconImageCache.set(key, img);
  }
  return img;
}

function preloadFoodIcons() {
  if (typeof FOODS === 'undefined' || typeof resolveColor !== 'function') return;
  FOODS.forEach(f => getFoodIconImage(f.id, resolveColor(f.color)));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preloadFoodIcons);
} else {
  preloadFoodIcons();
}
