const ACTIVITY_FACTORS = {
  low: 1.2,
  medium: 1.4,
  high: 1.6,
};

const GOAL_FACTORS = {
  maintenance: 1.0,
  'weight-loss': 0.8,
  'muscle-gain': 1.2,
};

// Average grams per standard 8oz measuring cup of dry kibble
const GRAMS_PER_CUP = 110;

/**
 * Calculate feeding recommendations based on pet profile and food data.
 *
 * @param {Object} params
 * @param {number} params.weightKg - Dog's weight in kilograms
 * @param {string} params.activityLevel - 'low' | 'medium' | 'high'
 * @param {string} params.weightGoal - 'maintenance' | 'weight-loss' | 'muscle-gain'
 * @param {number|null} params.kcalPerCup - Calories per cup of food
 * @param {number|null} params.kcalPerKg - Calories per kg of food
 * @param {number|null} params.sizeKg - Bag size in kg
 * @param {number|null} params.pricePerKg - Price per kg of food (CAD)
 * @returns {Object|null} Feeding results or null if insufficient data
 */
export function calculateFeeding({ weightKg, activityLevel, weightGoal, kcalPerCup, kcalPerKg, sizeKg, pricePerKg }) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(kcalPerCup) || kcalPerCup <= 0) return null;

  // RER = 70 * (weight_kg ^ 0.75)
  const rer = 70 * Math.pow(weightKg, 0.75);

  // MER = RER * activity_factor * goal_factor
  const activityFactor = ACTIVITY_FACTORS[activityLevel] || ACTIVITY_FACTORS.medium;
  const goalFactor = GOAL_FACTORS[weightGoal] || GOAL_FACTORS.maintenance;
  const mer = rer * activityFactor * goalFactor;

  // cups_per_day = MER / kcal_per_cup
  const cupsPerDay = mer / kcalPerCup;
  const cupsPerMeal = cupsPerDay / 2;

  const result = {
    cupsPerDay: cupsPerDay.toFixed(1),
    cupsPerMeal: cupsPerMeal.toFixed(1),
    kcalPerDay: Math.round(mer),
    costPerDay: null,
    costPerMonth: null,
    bagDuration: null,
  };

  // cost_per_day: need kcalPerKg and pricePerKg
  // grams_per_day = cups_per_day * GRAMS_PER_CUP
  // kg_per_day = grams_per_day / 1000
  // cost_per_day = kg_per_day * pricePerKg
  if (Number.isFinite(pricePerKg) && pricePerKg > 0 && Number.isFinite(kcalPerKg) && kcalPerKg > 0) {
    const kgPerDay = (mer / kcalPerKg);
    const costPerDay = kgPerDay * pricePerKg;
    result.costPerDay = `$${costPerDay.toFixed(2)}`;
    result.costPerMonth = `$${(costPerDay * 30).toFixed(2)}`;
  }

  // bag_duration = (size_kg * 1000) / (cups_per_day * GRAMS_PER_CUP)
  if (Number.isFinite(sizeKg) && sizeKg > 0) {
    const gramsPerDay = cupsPerDay * GRAMS_PER_CUP;
    const daysPerBag = (sizeKg * 1000) / gramsPerDay;
    if (daysPerBag >= 1) {
      const weeks = Math.floor(daysPerBag / 7);
      const days = Math.round(daysPerBag % 7);
      if (weeks > 0 && days > 0) {
        result.bagDuration = `~${weeks} week${weeks !== 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
      } else if (weeks > 0) {
        result.bagDuration = `~${weeks} week${weeks !== 1 ? 's' : ''}`;
      } else {
        result.bagDuration = `~${Math.round(daysPerBag)} day${Math.round(daysPerBag) !== 1 ? 's' : ''}`;
      }
    }
  }

  return result;
}
