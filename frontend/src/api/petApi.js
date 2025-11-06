import axios from 'axios';
import {
  parseTags,
  sizeToTag,
  stageToTag,
  formToTag,
  deriveSectionFromTags,
  createCompareId,
  poundsFromKg,
} from '../utils/foodUtils';

const API_URL = 'http://localhost:8000';

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const pickFirst = (source, keys) => {
  for (const key of keys) {
    if (source?.[key]) return source[key];
  }
  return '';
};

export const createPet = async (petData) => {
  const response = await axios.post(`${API_URL}/api/pets`, petData);
  return response.data;
};

export const getRecommendations = async (petId) => {
  const response = await axios.get(`${API_URL}/api/recommendations/${petId}`);
  return response.data;
};

const buildAnalysisPairs = (product) => {
  const pairs = [
    product.protein_pct != null && { label: 'Crude Protein (min)', value: String(product.protein_pct) },
    product.fat_pct != null && { label: 'Crude Fat (min)', value: String(product.fat_pct) },
    product.fiber_pct != null && { label: 'Crude Fiber (max)', value: String(product.fiber_pct) },
    product.moisture_pct != null && { label: 'Moisture (max)', value: String(product.moisture_pct) },
    product.ash_pct != null && { label: 'Ash (max)', value: String(product.ash_pct) },
    product.omega_3_fatty_acids != null && { label: 'Omega-3 (min)', value: String(product.omega_3_fatty_acids) },
    product.omega_6_fatty_acids != null && { label: 'Omega-6 (min)', value: String(product.omega_6_fatty_acids) },
    product.DHA != null && { label: 'DHA (min)', value: String(product.DHA) },
    product.EPA != null && { label: 'EPA (min)', value: String(product.EPA) },
    product.calcium_pct != null && { label: 'Calcium (min)', value: String(product.calcium_pct) },
    product.phosphorus_pct != null && { label: 'Phosphorus (min)', value: String(product.phosphorus_pct) },
  ];
  return pairs.filter(Boolean);
};

const buildFeedingPairs = (product) => {
  const pairs = [
    product.kcal_per_cup != null && { label: 'Calories per cup', value: String(product.kcal_per_cup) },
    product.kcal_per_kg != null && { label: 'Calories per kg', value: String(product.kcal_per_kg) },
  ];
  return pairs.filter(Boolean);
};

const collectTags = (product) => {
  const tagSet = new Set();
  parseTags(product.tags).forEach((tag) => tagSet.add(tag));
  parseTags(product.allergen_tags).forEach((tag) => tagSet.add(tag));
  formToTag(product.format).forEach((tag) => tagSet.add(tag));
  stageToTag(product.life_stage).forEach((tag) => tagSet.add(tag));
  sizeToTag(product.breed_size).forEach((tag) => tagSet.add(tag));

  if (product.grain_free) tagSet.add('grain-free');

  if (product.primary_proteins) {
    product.primary_proteins
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
      .forEach((tag) => tagSet.add(tag));
  }

  return Array.from(tagSet);
};

const collectIngredients = (product) => {
  const rawIngredients = pickFirst(product, ['ingredients', 'ingredient_list', 'ingredients_list']);
  if (rawIngredients) return rawIngredients;

  const primaryProteins = product.primary_proteins || '';
  return primaryProteins
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
};

export const transformRecommendation = (recommendation, index = 0) => {
  const product = recommendation.product || recommendation;
  const reasons = recommendation.reasons || [];
  const score = Number.isFinite(recommendation.score) ? recommendation.score : recommendation.match_percentage || 0;

  const tags = collectTags(product);
  const sectionRaw = normalizeSection(product.section || deriveSectionFromTags(tags));

  const price = toNumberOrNull(product.price);
  const bagLb = toNumberOrNull(product.size_kg) ? poundsFromKg(Number(product.size_kg)) : null;
  const unitPrice = price != null && bagLb != null && bagLb > 0 ? price / bagLb : null;

  const compareId = createCompareId(product, index);
  const detail = {
    name: product.line || product.id || product.name || '',
    ingredients: collectIngredients(product),
    feeding: buildFeedingPairs(product),
    analysis: buildAnalysisPairs(product),
    statement: pickFirst(product, ['aafco_statement', 'aafco']),
    notes: reasons.slice(0, 3).join('. '),
  };

  return {
    id: product.id || compareId,
    compareId,
    order: index,
    brand: product.brand || '',
    line: product.line || product.id || '',
    description: reasons.join('. '),
    image: product.image || '',
    url: product.source_url || '',
    price,
    bagLb,
    unitPrice,
    tags,
    section: sectionRaw,
    matchScore: Number.isFinite(score) ? score : 0,
    matchReasons: reasons,
    detail,
    raw: product,
    lifeStage: product.life_stage || '',
    breedSize: product.breed_size || '',
    kibbleSize: product.kibble_size || '',
    grainFree: Boolean(product.grain_free),
    protein: toNumberOrNull(product.protein_pct),
    fat: toNumberOrNull(product.fat_pct),
    fiber: toNumberOrNull(product.fiber_pct),
    moisture: toNumberOrNull(product.moisture_pct),
    ash: toNumberOrNull(product.ash_pct),
    omega3: toNumberOrNull(product.omega_3_fatty_acids),
    omega6: toNumberOrNull(product.omega_6_fatty_acids),
    calcium: toNumberOrNull(product.calcium_pct),
    phosphorus: toNumberOrNull(product.phosphorus_pct),
    dha: toNumberOrNull(product.DHA),
    epa: toNumberOrNull(product.EPA),
    kcalPerCup: toNumberOrNull(product.kcal_per_cup),
    kcalPerKg: toNumberOrNull(product.kcal_per_kg),
  };
};

function normalizeSection(value) {
  const str = (value || '').toString().trim().toLowerCase();
  return str || 'most-popular';
}
