// ═══════════════════════════════════════════════════════════════
// data.js  —  All static data constants
// ═══════════════════════════════════════════════════════════════

const FOODS = [
  {
    id: 'beef', name: 'Beef', color: 'var(--c-beef)',
    ghg: 59.6, land: 326.21, feed: 1.9, process: 1.3, eutro: 301.41
  },
  {
    id: 'pork', name: 'Pork', color: 'var(--c-pork)',
    ghg: 7.2, land: 17.36, feed: 2.9, process: 0.3, eutro: 76.38
  },
  {
    id: 'poultry', name: 'Poultry', color: 'var(--c-poultry)',
    ghg: 6.1, land: 12.22, feed: 1.8, process: 0.4, eutro: 48.7
  },
  {
    id: 'milk', name: 'Milk', color: 'var(--c-milk)',
    ghg: 2.8, land: 8.95, feed: 0.2, process: 0.1, eutro: 10.65
  },
  {
    id: 'rice', name: 'Rice', color: 'var(--c-rice)',
    ghg: 4.0, land: 2.8, feed: 0.0, process: 0.1, eutro: 35.07
  },
  {
    id: 'vegetables', name: 'Vegetables', color: 'var(--c-veg)',
    ghg: 0.5, land: 0.38, feed: 0.0, process: 0.1, eutro: 2.27
  },
];

const METRICS = [
  { key: 'ghg',     label: 'GHG',            full: 'GHG Emissions',  unit: 'kg CO₂', color: 'var(--c-ghg)'     },
  { key: 'land',    label: 'Land',            full: 'Land Use',       unit: 'm²',     color: 'var(--c-land)'    },
  { key: 'feed',    label: 'Feed',            full: 'Animal Feed',    unit: 'kg',     color: 'var(--c-feed)'    },
  { key: 'process', label: 'Processing',      full: 'Processing',     unit: 'MJ',     color: 'var(--c-process)' },
  { key: 'eutro',   label: 'Eutrophication',  full: 'Eutrophication', unit: 'g PO₄',  color: 'var(--c-eutro)'   },
];

// Substitution suggestions: keyed by food id
const SUBS = {
  beef:    { to: 'poultry',    reason: '~90% less GHG · 96% less land' },
  pork:    { to: 'poultry',    reason: '~15% less GHG · similar protein' },
  poultry: { to: 'milk',       reason: 'Lower eutrophication footprint' },
  milk:    { to: 'vegetables', reason: '~80% less GHG when switching plant-based' },
  rice:    { to: 'vegetables', reason: '7× less land · lower emissions' },
};
