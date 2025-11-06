const KG_TO_LB = 2.20462;

const PRIMARY_TAGS = new Set(['high-protein', 'low-fat', 'high-calorie', 'most-popular', 'best-value']);
const AGE_TAGS = new Set(['puppy', 'adult', 'senior']);
const SIZE_TAGS = new Set(['small', 'regular', 'large', 'giant']);
const FORM_TAGS = new Set(['dry', 'wet', 'raw']);

export function cleanText(val) {
  const str = val == null ? '' : String(val).trim();
  return str;
}

export function fmtMoney(n, sym = '$') {
  return Number.isFinite(n) ? sym + n.toFixed(2) : '';
}

export function parseTags(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(/[,\s]+/)
    .map((t) =>
      t
        .trim()
        .replace('low fat', 'low-fat')
        .replace('high protein', 'high-protein')
        .replace('high calorie', 'high-calorie')
        .replace(/^eggs$/, 'egg')
    )
    .filter(Boolean);
}

export function sizeToTag(size) {
  const s = String(size || '').toLowerCase();
  if (s.includes('small')) return ['small'];
  if (s.includes('medium')) return ['regular'];
  if (s.includes('giant')) return ['giant'];
  if (s.includes('large')) return ['large'];
  return [];
}

export function stageToTag(stage) {
  const s = String(stage || '').toLowerCase();
  if (s.includes('puppy')) return ['puppy'];
  if (s.includes('senior')) return ['senior'];
  return s ? ['adult'] : [];
}

export function formToTag(fmt) {
  const f = String(fmt || '').toLowerCase();
  if (f.includes('dry')) return ['dry'];
  if (f.includes('wet')) return ['wet'];
  if (f.includes('raw')) return ['raw'];
  return [];
}

export function deriveSectionFromTags(tags) {
  const set = new Set(tags);
  if (set.has('high-protein')) return 'high-protein';
  if (set.has('low-fat')) return 'low-fat';
  if (set.has('high-calorie')) return 'high-calorie';
  if (set.has('most-popular')) return 'most-popular';
  if (set.has('best-value')) return 'best-value';
  return '';
}

export function createCompareId(row, fallbackIndex = 0) {
  const brand = cleanText(row.brand);
  const line = cleanText(row.line || row.name || row.id);
  const id = cleanText(row.id);
  let base = [id, brand, line].filter(Boolean).join('::');
  if (!base) base = `food-${fallbackIndex}`;
  return base.replace(/\s+/g, '-').toLowerCase();
}

export function normalizeProfileSize(size) {
  const s = (size || '').toLowerCase();
  return s === 'medium' ? 'regular' : s;
}

export function splitTagsForDisplay(tags = [], profile = {}) {
  const deduped = Array.from(new Set(tags));
  const primary = deduped.filter((t) => PRIMARY_TAGS.has(t));

  const profAge = (profile?.ageGroup || '').toLowerCase();
  const profSize = normalizeProfileSize(profile?.breedSize);

  const age = deduped.find((t) => AGE_TAGS.has(t));
  const size = deduped.find((t) => SIZE_TAGS.has(t));

  const showAge = age && age !== profAge && age !== 'adult';
  const showSize = size && size !== profSize;

  const ingredients = deduped.filter(
    (t) => !PRIMARY_TAGS.has(t) && !AGE_TAGS.has(t) && !SIZE_TAGS.has(t) && !FORM_TAGS.has(t)
  );

  return {
    primary,
    age: showAge ? age : null,
    size: showSize ? size : null,
    ingredients,
  };
}

export function reasonsForMatch(profile = {}, tags = []) {
  const r = [];
  const goal = (profile?.weightGoal || '').toLowerCase();
  if (goal === 'muscle-gain' && tags.includes('high-protein')) {
    r.push('High-protein for conditioning');
  }
  if (goal === 'weight-loss' && tags.includes('low-fat')) {
    r.push('Lower fat to aid weight control');
  }
  if (tags.includes('joint-support')) {
    r.push('Supports joint health');
  }
  if (tags.includes('grain-free')) {
    r.push('Grain-free formula');
  }
  return r.slice(0, 2);
}

export function formatProductName(food) {
  return cleanText(food.detail?.name || food.line || food.id || 'Unnamed Product');
}

export function formatPriceValue(food) {
  return Number.isFinite(food.price) ? fmtMoney(food.price) : '';
}

export function formatUnitPriceValue(food) {
  return Number.isFinite(food.unitPrice) ? `${fmtMoney(food.unitPrice)}/lb` : '';
}

export function formatBagSizeValue(food) {
  if (!Number.isFinite(food.bagLb) || food.bagLb <= 0) return '';
  const precision = food.bagLb % 1 ? 1 : 0;
  return `${food.bagLb.toFixed(precision)} lb`;
}

export function mapFromPairs(arr) {
  const map = new Map();
  (arr || []).forEach((item) => {
    if (item?.label) map.set(item.label, item.value);
  });
  return map;
}

export function shortenAnalysisLabel(label) {
  return String(label || '')
    .replace(/^crude\s+/i, '')
    .replace(/\s*\(minimum\)/i, '(min)')
    .replace(/\s*\(maximum\)/i, '(max)');
}

export function formatAnalysisValue(label, value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return /moisture|fiber|ash|protein|fat/i.test(label) ? `${trimmed}%` : trimmed;
  }
  return trimmed;
}

export function formatFactValue(label, value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    if (/cup/i.test(label)) return `${trimmed} kcal`;
    if (/kg/i.test(label)) return `${trimmed} kcal/kg`;
  }
  return trimmed;
}

export function formatTagList(tags, limit = 8) {
  if (!Array.isArray(tags) || !tags.length) return '';
  const formatted = tags
    .map((tag) => tag.replace(/-/g, ' '))
    .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1))
    .filter((tag, idx, arr) => arr.indexOf(tag) === idx);
  return formatted.slice(0, limit).join(', ');
}

export function formatIngredientsList(raw) {
  const text = cleanText(raw);
  if (!text) return '';
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

export function formatCompareLabel(food) {
  const brand = cleanText(food.brand);
  const name = formatProductName(food);
  const price = formatPriceValue(food);
  const pieces = [];
  if (brand && name) pieces.push(`${brand} — ${name}`);
  else if (brand) pieces.push(brand);
  else if (name) pieces.push(name);
  if (price) pieces.push(`(${price})`);
  return pieces.join(' ');
}

export function createSmartCompareRow(label, valueA, valueB, numA, numB, preference) {
  if (!valueA && !valueB) return null;

  let winnerA = false;
  let winnerB = false;

  if (preference && !Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    if (preference === 'lower') {
      winnerA = numA < numB;
      winnerB = numB < numA;
    } else if (preference === 'higher') {
      winnerA = numA > numB;
      winnerB = numB > numA;
    }
  }

  return {
    label,
    valueA: valueA || '—',
    valueB: valueB || '—',
    winnerA,
    winnerB,
  };
}

export function buildComparisonSections(foodA, foodB) {
  if (!foodA || !foodB) return [];

  const sections = [];

  // Price & basics section
  const priceA = foodA.price;
  const priceB = foodB.price;
  const unitPriceA = foodA.unitPrice;
  const unitPriceB = foodB.unitPrice;

  sections.push({
    title: 'Overview',
    icon: '🏷️',
    rows: [
      {
        label: 'Brand',
        valueA: cleanText(foodA.brand) || 'Unknown Brand',
        valueB: cleanText(foodB.brand) || 'Unknown Brand',
        winnerA: false,
        winnerB: false,
      },
      {
        label: 'Product',
        valueA: formatProductName(foodA),
        valueB: formatProductName(foodB),
        winnerA: false,
        winnerB: false,
      },
      createSmartCompareRow(
        'Price',
        formatPriceValue(foodA),
        formatPriceValue(foodB),
        priceA,
        priceB,
        'lower'
      ),
      createSmartCompareRow(
        'Unit Price',
        formatUnitPriceValue(foodA),
        formatUnitPriceValue(foodB),
        unitPriceA,
        unitPriceB,
        'lower'
      ),
      {
        label: 'Bag Size',
        valueA: formatBagSizeValue(foodA) || '—',
        valueB: formatBagSizeValue(foodB) || '—',
        winnerA: false,
        winnerB: false,
      },
    ].filter(Boolean),
  });

  // Analysis section
  const analysisRows = [];
  const analysisA = mapFromPairs(foodA.detail?.analysis);
  const analysisB = mapFromPairs(foodB.detail?.analysis);
  Array.from(new Set([...analysisA.keys(), ...analysisB.keys()]))
    .sort()
    .forEach((label) => {
      const rawA = analysisA.get(label);
      const rawB = analysisB.get(label);
      const numA = parseFloat(rawA);
      const numB = parseFloat(rawB);

      let preferHigher = label.toLowerCase().includes('protein') || label.toLowerCase().includes('omega');
      let preferLower =
        label.toLowerCase().includes('fiber') ||
        label.toLowerCase().includes('ash') ||
        label.toLowerCase().includes('moisture');

      analysisRows.push(
        createSmartCompareRow(
          shortenAnalysisLabel(label),
          formatAnalysisValue(label, rawA),
          formatAnalysisValue(label, rawB),
          numA,
          numB,
          preferHigher ? 'higher' : preferLower ? 'lower' : null
        )
      );
    });

  if (analysisRows.length) {
    sections.push({
      title: 'Guaranteed Analysis',
      icon: '🔬',
      rows: analysisRows.filter(Boolean),
    });
  }

  // Feeding info section
  const factsRows = [];
  const factsA = mapFromPairs(foodA.detail?.feeding);
  const factsB = mapFromPairs(foodB.detail?.feeding);
  Array.from(new Set([...factsA.keys(), ...factsB.keys()]))
    .sort()
    .forEach((label) => {
      const rawA = factsA.get(label);
      const rawB = factsB.get(label);
      const numA = parseFloat(rawA);
      const numB = parseFloat(rawB);

      factsRows.push(
        createSmartCompareRow(
          label,
          formatFactValue(label, rawA),
          formatFactValue(label, rawB),
          numA,
          numB,
          label.toLowerCase().includes('calorie') ? 'higher' : null
        )
      );
    });

  if (factsRows.length) {
    sections.push({
      title: 'Feeding Information',
      icon: '📊',
      rows: factsRows.filter(Boolean),
    });
  }

  // Ingredients & highlights
  const ingredientsRows = [];
  const highlightsA = formatTagList(foodA.tags, 8);
  const highlightsB = formatTagList(foodB.tags, 8);

  if (highlightsA || highlightsB) {
    ingredientsRows.push({
      label: 'Highlights',
      valueA: highlightsA || '—',
      valueB: highlightsB || '—',
      winnerA: false,
      winnerB: false,
    });
  }

  const ingredientsA = formatIngredientsList(foodA.detail?.ingredients);
  const ingredientsB = formatIngredientsList(foodB.detail?.ingredients);

  if (ingredientsA || ingredientsB) {
    ingredientsRows.push({
      label: 'Top Ingredients',
      valueA: ingredientsA || '—',
      valueB: ingredientsB || '—',
      winnerA: false,
      winnerB: false,
    });
  }

  const statementA = cleanText(foodA.detail?.statement);
  const statementB = cleanText(foodB.detail?.statement);

  if (statementA || statementB) {
    ingredientsRows.push({
      label: 'AAFCO Statement',
      valueA: statementA || '—',
      valueB: statementB || '—',
      winnerA: false,
      winnerB: false,
    });
  }

  if (ingredientsRows.length) {
    sections.push({
      title: 'Ingredients & Formulation',
      icon: '🌾',
      rows: ingredientsRows,
    });
  }

  return sections.filter((section) => section.rows.length > 0);
}

export function poundsFromKg(kg) {
  if (!Number.isFinite(kg)) return null;
  return kg * KG_TO_LB;
}

export { KG_TO_LB };
