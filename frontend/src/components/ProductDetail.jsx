import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { fmtMoney } from '../utils/foodUtils';
import { calculateFeeding } from '../utils/feedingCalculator';
import ScoreRing from './ScoreRing';
import '../styles/detail-overlay.css';

const PLACEHOLDER_IMG = 'https://via.placeholder.com/220?text=Dog+Food';
const LB_TO_KG = 0.453592;

const barWidth = (value, max) => `${Math.min((value / max) * 100, 100)}%`;

const formatBadge = (value) => {
  if (!value) return '';
  return value.replace(/-/g, ' ');
};

const loadFavorites = () => {
  try {
    const raw = localStorage.getItem('favoriteFoods');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistFavorites = (favorites) => {
  try {
    localStorage.setItem('favoriteFoods', JSON.stringify(favorites));
  } catch {
    /* swallow */
  }
};

/* P3 #12: Classify tags by category */
const PROTEIN_KEYWORDS = ['beef', 'chicken', 'fish', 'salmon', 'lamb', 'duck', 'turkey', 'pork', 'venison', 'bison', 'herring', 'mackerel', 'whitefish', 'trout', 'pollock', 'rabbit', 'goat', 'boar'];
const LIFESTAGE_KEYWORDS = ['puppy', 'adult', 'senior', 'all life stages', 'all stages'];
const SIZE_KEYWORDS = ['large breed', 'small breed', 'medium breed', 'large', 'small'];

const classifyTag = (tag) => {
  const lower = tag.toLowerCase();
  if (PROTEIN_KEYWORDS.some((k) => lower.includes(k))) return 'tag-protein';
  if (LIFESTAGE_KEYWORDS.some((k) => lower.includes(k))) return 'tag-lifestage';
  if (SIZE_KEYWORDS.some((k) => lower === k || lower.includes(k + ' '))) return 'tag-size';
  return '';
};

const ProductDetail = ({ food, profile, foods, onClose, onNavigate, onCompare, onBuyThis, weightLbs, setWeightLbs }) => {
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const nutritionRef = useRef(null);
  const [weightError, setWeightError] = useState('');
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [barsVisible, setBarsVisible] = useState(false);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);

  const currentIndex = foods.findIndex((f) => f.compareId === food.compareId);
  const prevFood = currentIndex > 0 ? foods[currentIndex - 1] : null;
  const nextFood = currentIndex < foods.length - 1 ? foods[currentIndex + 1] : null;

  const imgSrc = food.image || PLACEHOLDER_IMG;
  const title = food.detail?.name || food.line || food.id || 'Unknown Product';
  const isFavorite = favorites.includes(food.compareId);

  const priceLine = useMemo(() => {
    const parts = [];
    if (Number.isFinite(food.price)) parts.push(fmtMoney(food.price));
    if (Number.isFinite(food.bagLb) && food.bagLb > 0) {
      const precision = food.bagLb % 1 ? 1 : 0;
      parts.push(`${food.bagLb.toFixed(precision)}lb`);
    }
    let line = parts.join(' / ');
    if (Number.isFinite(food.unitPrice) && food.unitPrice > 0) {
      line += ` (${fmtMoney(food.unitPrice)}/lb)`;
    }
    return line;
  }, [food.price, food.bagLb, food.unitPrice]);

  const feedingResults = useMemo(() => {
    const lbs = parseFloat(weightLbs);
    if (!Number.isFinite(lbs) || lbs <= 0) return null;
    return calculateFeeding({
      weightKg: lbs * LB_TO_KG,
      activityLevel: profile?.activityLevel || 'medium',
      weightGoal: profile?.weightGoal || 'maintenance',
      kcalPerCup: food.kcalPerCup,
      kcalPerKg: food.kcalPerKg,
      sizeKg: food.sizeKg,
      pricePerKg: food.pricePerKg,
    });
  }, [weightLbs, profile?.activityLevel, profile?.weightGoal, food.kcalPerCup, food.kcalPerKg, food.sizeKg, food.pricePerKg]);

  const detailAnalysis = food.detail?.analysis || [];
  const detailFeeding = food.detail?.feeding || [];
  const detailIngredients = food.detail?.ingredients || '';
  const tagListForDetail = (food.tags || []).map(formatBadge);

  /* P1 #6: Ingredient count & bold first 5 */
  const ingredientList = useMemo(() => {
    if (!detailIngredients) return [];
    return detailIngredients.split(', ').map((s) => s.trim()).filter(Boolean);
  }, [detailIngredients]);

  const shouldCollapseIngredients = detailIngredients.length > 200;
  const isPlantBased = (food.primaryProteins || '').toLowerCase().includes('plant-based') ||
    (food.line || '').toLowerCase().includes('kind earth');

  // Scroll lock
  useEffect(() => {
    document.body.classList.add('detail-open');
    return () => document.body.classList.remove('detail-open');
  }, []);

  // Focus panel on mount
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Reset scroll + bar animation on product change
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    setBarsVisible(false);
    setIngredientsExpanded(false);
  }, [food.compareId]);

  /* P1 #7: IntersectionObserver for nutrition bars */
  useEffect(() => {
    const el = nutritionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBarsVisible(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [food.compareId]);

  // Arrow keys skip when input is focused
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' && prevFood) {
        onNavigate(prevFood.compareId);
      } else if (e.key === 'ArrowRight' && nextFood) {
        onNavigate(nextFood.compareId);
      }
    }
  }, [onClose, onNavigate, prevFood, nextFood]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap
  const handlePanelKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === panelRef.current) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const handleBackdropClick = () => onClose();

  const handleCompareClick = () => {
    if (onCompare) onCompare(food);
  };

  const toggleFavorite = () => {
    const nextFavorites = isFavorite
      ? favorites.filter((id) => id !== food.compareId)
      : [...favorites, food.compareId];
    setFavorites(nextFavorites);
    persistFavorites(nextFavorites);
  };

  return (
    <div className="detail-overlay">
      <div className="detail-overlay-backdrop" onClick={handleBackdropClick} />
      <div
        className="detail-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-overlay-title"
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={handlePanelKeyDown}
      >
        {/* Sticky header */}
        <div className="detail-overlay-header">
          <button className="detail-overlay-back" onClick={onClose} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="detail-overlay-header-actions">
            <button
              className={`detail-overlay-action-btn${isFavorite ? ' active' : ''}`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={toggleFavorite}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button
              className="detail-overlay-action-btn"
              title="Add to comparison"
              aria-label="Add to comparison"
              onClick={handleCompareClick}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            <button className="detail-overlay-close" onClick={onClose} type="button" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="detail-overlay-body" ref={bodyRef}>
          {/* Hero */}
          <div className="detail-overlay-hero">
            <img
              className="detail-overlay-hero-img"
              src={imgSrc}
              alt={title}
              onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
            />
            <div className="detail-overlay-hero-info">
              {food.brand && <p className="detail-overlay-brand">{food.brand}</p>}
              <h2 className="detail-overlay-title" id="detail-overlay-title">{title}</h2>
              <div className="detail-overlay-badges">
                {/* P1 #5: Score ring */}
                {Number.isFinite(food.matchScore) && food.matchScore > 0 && (
                  <div className="score-ring-with-info">
                    <ScoreRing score={food.matchScore} compareId={food.compareId} />
                    <span className="score-info-trigger" tabIndex={0} role="button" aria-label="What is Match Score?" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); }}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="8" r="7" />
                        <line x1="8" y1="7" x2="8" y2="11.5" strokeLinecap="round" />
                        <circle cx="8" cy="4.75" r="0.5" fill="currentColor" stroke="none" />
                      </svg>
                      <span className="score-info-tooltip">Match Score reflects how well this food fits your dog's breed, age, activity level, dietary goals, and nutritional needs. Scored out of 100.</span>
                    </span>
                  </div>
                )}
                {profile?.allergies?.length > 0 && (
                  <span className="allergy-safe-badge">
                    <svg className="allergy-safe-icon" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1z" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
                      <path d="M5.5 8l2 2 3.5-3.5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Allergy Safe
                  </span>
                )}
              </div>
              {/* Show ALL match reasons */}
              {food.matchReasons && food.matchReasons.length > 0 && (
                <div className="detail-overlay-reasons">
                  {food.matchReasons.map((reason, i) => (
                    <span key={i} className="match-reason">
                      <svg className="match-reason-icon" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5.5 8l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plant-based disclaimer */}
          {isPlantBased && (
            <div className="detail-plant-disclaimer">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="7" />
                <line x1="8" y1="5" x2="8" y2="9" />
                <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
              Plant-based diet — consult your veterinarian before feeding.
            </div>
          )}

          {/* Zone 1: Nutrition (monochromatic blue) */}
          <div className="detail-overlay-zone detail-overlay-zone--nutrition">
            {/* P2 #8: Stat cards for kcal */}
            {(Number.isFinite(food.kcalPerCup) || Number.isFinite(food.kcalPerKg)) && (
              <div className="nutrition-stat-row">
                {Number.isFinite(food.kcalPerCup) && (
                  <div className="nutrition-stat-card">
                    <div className="nutrition-stat-value">{food.kcalPerCup}</div>
                    <div className="nutrition-stat-label">kcal / cup</div>
                  </div>
                )}
                {Number.isFinite(food.kcalPerKg) && (
                  <div className="nutrition-stat-card">
                    <div className="nutrition-stat-value">{food.kcalPerKg}</div>
                    <div className="nutrition-stat-label">kcal / kg</div>
                  </div>
                )}
              </div>
            )}

            {(Number.isFinite(food.protein) || Number.isFinite(food.fat) || Number.isFinite(food.fiber)) && (
              <>
                <h4>Nutrition</h4>
                {/* P1 #7: Animated nutrition bars */}
                <div className={`nutrition-bars${barsVisible ? ' bars-visible' : ''}`} ref={nutritionRef}>
                  {Number.isFinite(food.protein) && (
                    <div className="nutrition-bar-row">
                      <span className="nutrition-bar-label">Protein</span>
                      <div className="nutrition-bar-track">
                        <div
                          className="nutrition-bar-fill protein"
                          style={{ width: barsVisible ? barWidth(food.protein, 45) : '0%' }}
                        />
                      </div>
                      <span className="nutrition-bar-value">{food.protein}%</span>
                    </div>
                  )}
                  {Number.isFinite(food.fat) && (
                    <div className="nutrition-bar-row">
                      <span className="nutrition-bar-label">Fat</span>
                      <div className="nutrition-bar-track">
                        <div
                          className="nutrition-bar-fill fat"
                          style={{ width: barsVisible ? barWidth(food.fat, 25) : '0%' }}
                        />
                      </div>
                      <span className="nutrition-bar-value">{food.fat}%</span>
                    </div>
                  )}
                  {Number.isFinite(food.fiber) && (
                    <div className="nutrition-bar-row">
                      <span className="nutrition-bar-label">Fiber</span>
                      <div className="nutrition-bar-track">
                        <div
                          className="nutrition-bar-fill fiber"
                          style={{ width: barsVisible ? barWidth(food.fiber, 10) : '0%' }}
                        />
                      </div>
                      <span className="nutrition-bar-value">{food.fiber}%</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="detail-tables">
              <div className="detail-table-block">
                <h4>Guaranteed Analysis</h4>
                <ul className="detail-list">
                  {detailAnalysis.length > 0 ? (
                    detailAnalysis.map((item) => (
                      <li key={`${item.label}-${item.value}`} className={item.value ? 'has-value' : 'detail-list-empty'}>
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </li>
                    ))
                  ) : (
                    <li className="detail-list-empty">No guaranteed analysis provided.</li>
                  )}
                </ul>
              </div>

              {detailFeeding.length > 0 && (
                <div className="detail-table-block">
                  <h4>Feeding Facts</h4>
                  <ul className="detail-list">
                    {detailFeeding.map((item) => (
                      <li key={`${item.label}-${item.value}`} className={item.value ? 'has-value' : 'detail-list-empty'}>
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Zone 2: Ingredients */}
          {(detailIngredients || tagListForDetail.length > 0) && (
            <div className="detail-overlay-zone detail-overlay-zone--ingredients">
              {ingredientList.length > 0 && (
                <>
                  <h4>Ingredients</h4>
                  {/* P1 #6: Ingredient count */}
                  <span className="ingredient-count">{ingredientList.length} ingredients</span>
                  {/* P1 #6: Bold first 5 + P2 #10: Collapse */}
                  <p className={`detail-ingredients-text${shouldCollapseIngredients && !ingredientsExpanded ? ' collapsed' : ''}`}>
                    {ingredientList.map((ingredient, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        {i < 5 ? <strong>{ingredient}</strong> : ingredient}
                      </span>
                    ))}
                  </p>
                  {shouldCollapseIngredients && (
                    <button
                      type="button"
                      className={`ingredients-toggle${ingredientsExpanded ? ' expanded' : ''}`}
                      onClick={() => setIngredientsExpanded(!ingredientsExpanded)}
                    >
                      {ingredientsExpanded ? 'Show less' : 'Show all ingredients'}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              {/* P3 #12: Semantic tag colors */}
              {tagListForDetail.length > 0 && (
                <>
                  <h4>Key Attributes</h4>
                  <div className="detail-tag-list">
                    {tagListForDetail.map((tag) => (
                      <span key={tag} className={`detail-tag ${classifyTag(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Zone 3: Feeding Calculator */}
          {Number.isFinite(food.kcalPerCup) && (
            <div className="detail-overlay-zone detail-overlay-zone--calculator">
              <h4>Feeding Calculator</h4>
              <div className="feeding-calc-input">
                <label htmlFor={`detail-weight-${food.compareId}`}>
                  Your dog's weight (lbs):
                </label>
                <input
                  id={`detail-weight-${food.compareId}`}
                  type="number"
                  min="1"
                  max="300"
                  step="1"
                  placeholder="e.g. 50"
                  value={weightLbs}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWeightLbs(val);
                    if (val && (!Number.isFinite(parseFloat(val)) || parseFloat(val) <= 0)) {
                      setWeightError('Enter a valid weight (e.g. 50)');
                    } else {
                      setWeightError('');
                    }
                  }}
                  className={`feeding-weight-input${weightError ? ' input-error' : ''}`}
                  aria-describedby={weightError ? `weight-error-${food.compareId}` : undefined}
                  aria-invalid={weightError ? 'true' : undefined}
                />
                {weightError && <span id={`weight-error-${food.compareId}`} className="feeding-weight-error" role="alert">{weightError}</span>}
              </div>

              {feedingResults ? (
                <div className="feeding-results">
                  <div className="feeding-result-grid">
                    {/* P3 #13: Icons on feeding result cards */}
                    <div className="feeding-result-item">
                      <div className="feeding-result-header">
                        <svg className="feeding-result-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 10c0 3 2.5 4 6 4s6-1 6-4" />
                          <path d="M2 10c0-2 2-3 3-4.5S7 2 8 2s2 1.5 3 3.5S12 8 14 10" />
                        </svg>
                        <span className="feeding-result-label">Daily Amount</span>
                      </div>
                      <span className="feeding-result-value">{feedingResults.cupsPerDay} cups/day</span>
                      <span className="feeding-result-sub">({feedingResults.cupsPerMeal} cups per meal, 2 meals)</span>
                    </div>
                    {feedingResults.costPerDay && (
                      <div className="feeding-result-item">
                        <div className="feeding-result-header">
                          <svg className="feeding-result-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="1" x2="8" y2="15" />
                            <path d="M11 3H6.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H5" />
                          </svg>
                          <span className="feeding-result-label">Estimated Cost</span>
                        </div>
                        <span className="feeding-result-value">{feedingResults.costPerDay}/day</span>
                        <span className="feeding-result-sub">{feedingResults.costPerMonth}/month</span>
                      </div>
                    )}
                    {feedingResults.bagDuration && (
                      <div className="feeding-result-item">
                        <div className="feeding-result-header">
                          <svg className="feeding-result-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="12" height="12" rx="2" />
                            <line x1="2" y1="6" x2="14" y2="6" />
                            <line x1="6" y1="2" x2="6" y2="6" />
                            <line x1="10" y1="2" x2="10" y2="6" />
                          </svg>
                          <span className="feeding-result-label">Bag Duration</span>
                        </div>
                        <span className="feeding-result-value">{feedingResults.bagDuration}</span>
                      </div>
                    )}
                  </div>
                  <p className="feeding-disclaimer">
                    Estimates based on your pet's profile. Always consult your veterinarian for personalized feeding advice.
                  </p>
                  {food.url && (
                    <a
                      className="shop-btn feeding-shop-btn"
                      href={food.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="shop-btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 1l-1 3h11l-1.5 7H5.5L4 4" />
                        <circle cx="6" cy="13" r="1" />
                        <circle cx="12" cy="13" r="1" />
                      </svg>
                      Shop This Food
                      <svg className="shop-btn-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 8h8M9 5l3 3-3 3" />
                      </svg>
                    </a>
                  )}
                </div>
              ) : (
                <p className="feeding-placeholder">
                  Enter your dog's weight above to see daily feeding amounts, estimated costs, and how long this bag will last.
                </p>
              )}
            </div>
          )}

          {/* Prev / Next navigation */}
          <div className="detail-overlay-nav">
            <button
              className="detail-overlay-nav-btn"
              disabled={!prevFood}
              onClick={() => prevFood && onNavigate(prevFood.compareId)}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="detail-overlay-nav-label">
                {prevFood ? (prevFood.detail?.name || prevFood.line || 'Previous') : 'Previous'}
              </span>
            </button>
            <span className="detail-overlay-nav-counter">
              {currentIndex + 1} of {foods.length}
            </span>
            <button
              className="detail-overlay-nav-btn"
              disabled={!nextFood}
              onClick={() => nextFood && onNavigate(nextFood.compareId)}
              type="button"
            >
              <span className="detail-overlay-nav-label">
                {nextFood ? (nextFood.detail?.name || nextFood.line || 'Next') : 'Next'}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="detail-overlay-footer">
          <div>
            {priceLine && <span className="detail-overlay-price">{priceLine}</span>}
          </div>
          <div className="detail-overlay-footer-actions">
            {onBuyThis && (
              <button
                type="button"
                className="detail-buy-btn"
                onClick={() => onBuyThis(food)}
              >
                <svg className="detail-buy-icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 8 6 12 14 4" />
                </svg>
                I Bought This
              </button>
            )}
          {food.url && (
            <a
              className="shop-btn"
              href={food.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="shop-btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 1l-1 3h11l-1.5 7H5.5L4 4" />
                <circle cx="6" cy="13" r="1" />
                <circle cx="12" cy="13" r="1" />
              </svg>
              Shop
              <svg className="shop-btn-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h8M9 5l3 3-3 3" />
              </svg>
            </a>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
