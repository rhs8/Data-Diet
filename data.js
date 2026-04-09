// ═══════════════════════════════════════════════════════════════
// data.js — Static food & metric data
// FOODS: 43 rows from Food_Production.csv (Poore & Nemecek / Kaggle-style)
//   ghg=Total_emissions (kg CO₂eq/kg), land, feed, process, eutro per kg
// Source CSV: food_production.csv (copy of public dataset)
// ═══════════════════════════════════════════════════════════════

const FOODS = [
  {
    id: 'wheat-rye-bread',
    name: 'Wheat & Rye (Bread)',
    color: 'hsl(0, 48%, 52%)',
    category: 'grains-staples',
    ghg: 1.4000000000000004, land: 0.0, feed: 0.0, process: 0.2, eutro: 0.0
  },
  {
    id: 'maize-meal',
    name: 'Maize (Meal)',
    color: 'hsl(47, 48%, 52%)',
    category: 'grains-staples',
    ghg: 1.1, land: 0.0, feed: 0.0, process: 0.1, eutro: 0.0
  },
  {
    id: 'barley-beer',
    name: 'Barley (Beer)',
    color: 'hsl(94, 48%, 52%)',
    category: 'grains-staples',
    ghg: 1.1, land: 0.0, feed: 0.0, process: 0.1, eutro: 0.0
  },
  {
    id: 'oatmeal',
    name: 'Oatmeal',
    color: 'hsl(141, 48%, 52%)',
    category: 'grains-staples',
    ghg: 1.6, land: 7.6, feed: 0.0, process: 0.0, eutro: 11.23
  },
  {
    id: 'rice',
    name: 'Rice',
    color: 'hsl(188, 48%, 52%)',
    category: 'grains-staples',
    ghg: 4.0, land: 2.8, feed: 0.0, process: 0.1, eutro: 35.07
  },
  {
    id: 'potatoes',
    name: 'Potatoes',
    color: 'hsl(235, 48%, 52%)',
    category: 'tubers-sugars',
    ghg: 0.30000000000000004, land: 0.88, feed: 0.0, process: 0.0, eutro: 3.48
  },
  {
    id: 'cassava',
    name: 'Cassava',
    color: 'hsl(282, 48%, 52%)',
    category: 'tubers-sugars',
    ghg: 0.9, land: 1.81, feed: 0.0, process: 0.0, eutro: 0.69
  },
  {
    id: 'cane-sugar',
    name: 'Cane Sugar',
    color: 'hsl(329, 48%, 52%)',
    category: 'tubers-sugars',
    ghg: 2.6, land: 2.04, feed: 0.0, process: 0.0, eutro: 16.92
  },
  {
    id: 'beet-sugar',
    name: 'Beet Sugar',
    color: 'hsl(16, 48%, 52%)',
    category: 'tubers-sugars',
    ghg: 1.4, land: 1.83, feed: 0.0, process: 0.2, eutro: 5.41
  },
  {
    id: 'other-pulses',
    name: 'Other Pulses',
    color: 'hsl(63, 48%, 52%)',
    category: 'pulses-nuts-soy',
    ghg: 1.6, land: 15.57, feed: 0.0, process: 0.0, eutro: 17.08
  },
  {
    id: 'peas',
    name: 'Peas',
    color: 'hsl(110, 48%, 52%)',
    category: 'pulses-nuts-soy',
    ghg: 0.7999999999999999, land: 7.46, feed: 0.0, process: 0.0, eutro: 7.52
  },
  {
    id: 'nuts',
    name: 'Nuts',
    color: 'hsl(157, 48%, 52%)',
    category: 'pulses-nuts-soy',
    ghg: 0.2, land: 12.96, feed: 0.0, process: 0.0, eutro: 19.15
  },
  {
    id: 'groundnuts',
    name: 'Groundnuts',
    color: 'hsl(204, 48%, 52%)',
    category: 'pulses-nuts-soy',
    ghg: 2.4, land: 9.11, feed: 0.0, process: 0.4, eutro: 14.14
  },
  {
    id: 'soymilk',
    name: 'Soymilk',
    color: 'hsl(251, 48%, 52%)',
    category: 'pulses-nuts-soy',
    ghg: 1.0, land: 0.66, feed: 0.0, process: 0.2, eutro: 1.06
  },
  {
    id: 'tofu',
    name: 'Tofu',
    color: 'hsl(298, 48%, 52%)',
    category: 'pulses-nuts-soy',
    ghg: 3.0, land: 0.0, feed: 0.0, process: 0.8, eutro: 0.0
  },
  {
    id: 'soybean-oil',
    name: 'Soybean Oil',
    color: 'hsl(345, 48%, 52%)',
    category: 'oils',
    ghg: 5.999999999999999, land: 10.52, feed: 0.0, process: 0.3, eutro: 11.69
  },
  {
    id: 'palm-oil',
    name: 'Palm Oil',
    color: 'hsl(32, 48%, 52%)',
    category: 'oils',
    ghg: 7.6000000000000005, land: 2.42, feed: 0.0, process: 1.3, eutro: 10.67
  },
  {
    id: 'sunflower-oil',
    name: 'Sunflower Oil',
    color: 'hsl(79, 48%, 52%)',
    category: 'oils',
    ghg: 3.5000000000000004, land: 17.66, feed: 0.0, process: 0.2, eutro: 50.66
  },
  {
    id: 'rapeseed-oil',
    name: 'Rapeseed Oil',
    color: 'hsl(126, 48%, 52%)',
    category: 'oils',
    ghg: 3.7, land: 10.63, feed: 0.0, process: 0.2, eutro: 19.19
  },
  {
    id: 'olive-oil',
    name: 'Olive Oil',
    color: 'hsl(173, 48%, 52%)',
    category: 'oils',
    ghg: 6.0, land: 26.31, feed: 0.0, process: 0.7, eutro: 37.26
  },
  {
    id: 'tomatoes',
    name: 'Tomatoes',
    color: 'hsl(220, 48%, 52%)',
    category: 'vegetables',
    ghg: 1.4000000000000001, land: 0.8, feed: 0.0, process: 0.0, eutro: 7.51
  },
  {
    id: 'onions-leeks',
    name: 'Onions & Leeks',
    color: 'hsl(267, 48%, 52%)',
    category: 'vegetables',
    ghg: 0.30000000000000004, land: 0.39, feed: 0.0, process: 0.0, eutro: 3.24
  },
  {
    id: 'root-vegetables',
    name: 'Root Vegetables',
    color: 'hsl(314, 48%, 52%)',
    category: 'vegetables',
    ghg: 0.30000000000000004, land: 0.33, feed: 0.0, process: 0.0, eutro: 1.61
  },
  {
    id: 'brassicas',
    name: 'Brassicas',
    color: 'hsl(1, 48%, 52%)',
    category: 'vegetables',
    ghg: 0.4, land: 0.55, feed: 0.0, process: 0.0, eutro: 5.01
  },
  {
    id: 'other-vegetables',
    name: 'Other Vegetables',
    color: 'hsl(48, 48%, 52%)',
    category: 'vegetables',
    ghg: 0.5, land: 0.38, feed: 0.0, process: 0.1, eutro: 2.27
  },
  {
    id: 'citrus-fruit',
    name: 'Citrus Fruit',
    color: 'hsl(95, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 0.3, land: 0.86, feed: 0.0, process: 0.0, eutro: 2.24
  },
  {
    id: 'bananas',
    name: 'Bananas',
    color: 'hsl(142, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 0.7999999999999999, land: 1.93, feed: 0.0, process: 0.1, eutro: 3.29
  },
  {
    id: 'apples',
    name: 'Apples',
    color: 'hsl(189, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 0.30000000000000004, land: 0.63, feed: 0.0, process: 0.0, eutro: 1.45
  },
  {
    id: 'berries-grapes',
    name: 'Berries & Grapes',
    color: 'hsl(236, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 1.0999999999999999, land: 2.41, feed: 0.0, process: 0.0, eutro: 6.12
  },
  {
    id: 'wine',
    name: 'Wine',
    color: 'hsl(283, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 1.4, land: 1.78, feed: 0.0, process: 0.1, eutro: 4.57
  },
  {
    id: 'other-fruit',
    name: 'Other Fruit',
    color: 'hsl(330, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 0.7, land: 0.89, feed: 0.0, process: 0.0, eutro: 2.43
  },
  {
    id: 'coffee',
    name: 'Coffee',
    color: 'hsl(17, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 16.500000000000004, land: 21.62, feed: 0.0, process: 0.6, eutro: 110.52
  },
  {
    id: 'dark-chocolate',
    name: 'Dark Chocolate',
    color: 'hsl(64, 48%, 52%)',
    category: 'fruit-drinks',
    ghg: 18.7, land: 68.96, feed: 0.0, process: 0.2, eutro: 87.08
  },
  {
    id: 'beef-beef-herd',
    name: 'Beef (beef herd)',
    color: 'hsl(111, 48%, 52%)',
    category: 'meat',
    ghg: 59.599999999999994, land: 326.21, feed: 1.9, process: 1.3, eutro: 301.41
  },
  {
    id: 'beef-dairy-herd',
    name: 'Beef (dairy herd)',
    color: 'hsl(158, 48%, 52%)',
    category: 'meat',
    ghg: 21.099999999999998, land: 43.24, feed: 2.5, process: 1.1, eutro: 365.29
  },
  {
    id: 'lamb-mutton',
    name: 'Lamb & Mutton',
    color: 'hsl(205, 48%, 52%)',
    category: 'meat',
    ghg: 24.5, land: 369.81, feed: 2.4, process: 1.1, eutro: 97.13
  },
  {
    id: 'pig-meat',
    name: 'Pig Meat',
    color: 'hsl(252, 48%, 52%)',
    category: 'meat',
    ghg: 7.2, land: 17.36, feed: 2.9, process: 0.3, eutro: 76.38
  },
  {
    id: 'poultry-meat',
    name: 'Poultry Meat',
    color: 'hsl(299, 48%, 52%)',
    category: 'meat',
    ghg: 6.1000000000000005, land: 12.22, feed: 1.8, process: 0.4, eutro: 48.7
  },
  {
    id: 'milk',
    name: 'Milk',
    color: 'hsl(346, 48%, 52%)',
    category: 'dairy-eggs',
    ghg: 2.8000000000000003, land: 8.95, feed: 0.2, process: 0.1, eutro: 10.65
  },
  {
    id: 'cheese',
    name: 'Cheese',
    color: 'hsl(33, 48%, 52%)',
    category: 'dairy-eggs',
    ghg: 21.2, land: 87.79, feed: 2.3, process: 0.7, eutro: 98.37
  },
  {
    id: 'eggs',
    name: 'Eggs',
    color: 'hsl(80, 48%, 52%)',
    category: 'dairy-eggs',
    ghg: 4.5, land: 6.27, feed: 2.2, process: 0.0, eutro: 21.76
  },
  {
    id: 'fish-farmed',
    name: 'Fish (farmed)',
    color: 'hsl(127, 48%, 52%)',
    category: 'seafood',
    ghg: 5.1, land: 8.41, feed: 0.8, process: 0.0, eutro: 235.12
  },
  {
    id: 'shrimps-farmed',
    name: 'Shrimps (farmed)',
    color: 'hsl(174, 48%, 52%)',
    category: 'seafood',
    ghg: 11.8, land: 0.0, feed: 2.5, process: 0.0, eutro: 0.0
  }
];


const FOOD_CATEGORIES = [
  { id: 'grains-staples', label: 'Grains & staples' },
  { id: 'tubers-sugars', label: 'Tubers & sugars' },
  { id: 'pulses-nuts-soy', label: 'Pulses, nuts & soy' },
  { id: 'oils', label: 'Vegetable oils' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruit-drinks', label: 'Fruit, drinks & treats' },
  { id: 'meat', label: 'Meat' },
  { id: 'dairy-eggs', label: 'Dairy & eggs' },
  { id: 'seafood', label: 'Fish & seafood' },
];

/** Foods grouped by FOOD_CATEGORIES; items sorted by name within each group. */
function foodsGroupedByCategory() {
  const by = new Map(FOOD_CATEGORIES.map(c => [c.id, []]));
  FOODS.forEach(f => {
    const cid = f.category || 'other';
    if (!by.has(cid)) by.set(cid, []);
    by.get(cid).push(f);
  });
  by.forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
  return FOOD_CATEGORIES.filter(c => (by.get(c.id) || []).length).map(c => ({
    id: c.id,
    label: c.label,
    foods: by.get(c.id) || [],
  }));
}

const METRICS = [
  { key: 'ghg',     label: 'GHG',            full: 'GHG Emissions',  unit: 'kg CO₂', color: 'var(--c-ghg)'     },
  { key: 'land',    label: 'Land',            full: 'Land Use',       unit: 'm²',     color: 'var(--c-land)'    },
  { key: 'feed',    label: 'Feed',            full: 'Animal Feed',    unit: 'kg CO₂', color: 'var(--c-feed)'    },
  { key: 'process', label: 'Processing',      full: 'Processing',     unit: 'kg CO₂', color: 'var(--c-process)' },
  { key: 'eutro',   label: 'Eutrophication',  full: 'Eutrophication', unit: 'g PO₄',  color: 'var(--c-eutro)'   },
];

// Substitution suggestions keyed by food id (lower-impact alternatives)
const SUBS = {
  'beef-beef-herd': { to: 'poultry-meat', reason: '~90% less GHG · 96% less land vs beef herd' },
  'beef-dairy-herd': { to: 'poultry-meat', reason: 'Lower GHG than beef herd' },
  'pig-meat': { to: 'poultry-meat', reason: '~15% less GHG · similar protein' },
  'poultry-meat': { to: 'milk', reason: 'Lower eutrophication footprint' },
  'lamb-mutton': { to: 'poultry-meat', reason: 'Much lower GHG than lamb' },
  'milk': { to: 'other-vegetables', reason: '~80% less GHG when switching plant-based' },
  'cheese': { to: 'tofu', reason: 'Lower land & emissions' },
  'rice': { to: 'other-vegetables', reason: '7× less land · lower emissions' },
};
