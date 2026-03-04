import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtMoney } from '../utils/foodUtils';
import { calculateFeeding } from '../utils/feedingCalculator';

const PLACEHOLDER_IMG = 'https://via.placeholder.com/220?text=Dog+Food';
const LB_TO_KG = 0.453592;

const formatFullPriceLine = (price, bagLb, unitPrice) => {
  const parts = [];
  if (Number.isFinite(price)) parts.push(fmtMoney(price));
  if (Number.isFinite(bagLb) && bagLb > 0) {
    const precision = bagLb % 1 ? 1 : 0;
    parts.push(`${bagLb.toFixed(precision)}lb`);
  }
  let line = parts.join(' / ');
  if (Number.isFinite(unitPrice) && unitPrice > 0) {
    line += ` (${fmtMoney(unitPrice)}/lb)`;
  }
  return line;
};

const formatBadge = (value) => {
  if (!value) return '';
  return value.replace(/-/g, ' ');
};

const barWidth = (value, max) => `${Math.min((value / max) * 100, 100)}%`;

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

const FoodCard = ({ food, profile, isActive, onToggle, onCompare }) => {
  const detailRef = useRef(null);
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [weightLbs, setWeightLbs] = useState('');

  const imgSrc = food.image || PLACEHOLDER_IMG;
  const title = food.detail?.name || food.line || food.id || 'Unknown Product';

  const priceLine = useMemo(
    () => formatFullPriceLine(food.price, food.bagLb, food.unitPrice),
    [food.price, food.bagLb, food.unitPrice]
  );

  const isFavorite = favorites.includes(food.compareId);

  // Feeding calculator results
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

  useEffect(() => {
    const panel = detailRef.current;
    if (!panel) return;

    if (isActive) {
      panel.hidden = false;
      panel.style.overflow = 'hidden';
      panel.style.maxHeight = '0px';
      requestAnimationFrame(() => {
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      });
      const handle = (event) => {
        if (event.propertyName === 'max-height') {
          panel.style.maxHeight = 'none';
          panel.style.overflow = 'visible';
        }
      };
      panel.addEventListener('transitionend', handle, { once: true });
    } else {
      if (panel.hidden) return;
      panel.style.overflow = 'hidden';
      panel.style.maxHeight = `${panel.scrollHeight}px`;
      requestAnimationFrame(() => {
        panel.style.maxHeight = '0px';
      });
      const handle = (event) => {
        if (event.propertyName === 'max-height') {
          panel.hidden = true;
          panel.style.maxHeight = '';
          panel.style.overflow = '';
        }
      };
      panel.addEventListener('transitionend', handle, { once: true });
    }
  }, [isActive]);

  const handleCardClick = (event) => {
    if (event.target.closest('a, button, input')) return;
    onToggle(food.compareId);
  };

  const handleKeyDown = (event) => {
    if (event.target.closest('a, button, input')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(food.compareId);
    }
  };

  const toggleFavorite = (event) => {
    event.stopPropagation();
    const nextFavorites = favorites.includes(food.compareId)
      ? favorites.filter((id) => id !== food.compareId)
      : [...favorites, food.compareId];
    setFavorites(nextFavorites);
    persistFavorites(nextFavorites);
  };

  const handleCompareClick = (event) => {
    event.stopPropagation();
    onCompare(food);
  };

  const detailAnalysis = food.detail?.analysis || [];
  const detailFeeding = food.detail?.feeding || [];
  const detailIngredients = food.detail?.ingredients || '';
  const tagListForDetail = (food.tags || []).map(formatBadge);

  return (
    <div
      className={`food-card better-card ${isActive ? 'expanded' : ''}`}
      data-tags={(food.tags || []).join(', ')}
      data-food-id={food.compareId}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      aria-expanded={isActive}
      tabIndex={0}
    >
      {/* Quick actions: top-right, icon-only, subtle */}
      <div className="card-quick-actions">
        <button
          className={`quick-action-btn ${isFavorite ? 'active' : ''}`}
          data-action="favorite"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={toggleFavorite}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <button
          className="quick-action-btn"
          data-action="compare"
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
      </div>

      {/* === COLLAPSED CARD: 7 elements only === */}
      <div className="card-top">
        {/* 1. Product image */}
        {food.url ? (
          <a className="thumb" href={food.url} target="_blank" rel="noopener noreferrer">
            <img loading="lazy" src={imgSrc} alt={title} onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
          </a>
        ) : (
          <div className="thumb">
            <img loading="lazy" src={imgSrc} alt={title} onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
          </div>
        )}

        <div className="main">
          {/* 2. Brand eyebrow + 3. Title */}
          <div className="card-section card-header-section">
            {food.brand && (
              <div className="eyebrow">
                <span className="brand-eyebrow">{food.brand}</span>
              </div>
            )}
            <h4 className="title">{title}</h4>
          </div>

          {/* 4. Score badge + Allergy Safe badge */}
          {(profile?.allergies?.length > 0 || Number.isFinite(food.matchScore)) && (
            <div className="card-section card-badges-row">
              {Number.isFinite(food.matchScore) && food.matchScore > 0 && (
                <span className="match-score-badge">
                  <svg className="match-score-icon" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1l2.18 4.41L15 6.11l-3.5 3.41.83 4.82L8 12.01l-4.33 2.33.83-4.82L1 6.11l4.82-.7L8 1z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
                  </svg>
                  {food.matchScore}
                </span>
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
          )}

          {/* 5. Top 2 match reasons */}
          {food.matchReasons && food.matchReasons.length > 0 && (
            <div className="card-section card-reasons-section">
              {food.matchReasons.slice(0, 2).map((reason, i) => (
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

          {/* 6. Price line — merged */}
          {priceLine && (
            <div className="card-section card-price-section">
              <span className="price">{priceLine}</span>
            </div>
          )}

          {/* 7. Shop button */}
          {food.url && (
            <div className="card-section card-shop-section">
              <a
                className="shop-btn"
                href={food.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
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
            </div>
          )}
        </div>
      </div>

      {/* === EXPAND PANEL: 3 color-coded zones === */}
      <div className="detail-panel" hidden={!isActive} ref={detailRef}>
        <div className="detail-shell">

          {/* ZONE 1: Nutrition (blue accent) */}
          <div className="detail-zone detail-zone-nutrition">
            {(Number.isFinite(food.protein) || Number.isFinite(food.fat) || Number.isFinite(food.fiber)) && (
              <>
                <h4>Nutrition</h4>
                <div className="nutrition-bars">
                  {Number.isFinite(food.protein) && (
                    <div className="nutrition-bar-row">
                      <span className="nutrition-bar-label">Protein</span>
                      <div className="nutrition-bar-track">
                        <div className="nutrition-bar-fill protein" style={{ width: barWidth(food.protein, 45) }} />
                      </div>
                      <span className="nutrition-bar-value">{food.protein}%</span>
                    </div>
                  )}
                  {Number.isFinite(food.fat) && (
                    <div className="nutrition-bar-row">
                      <span className="nutrition-bar-label">Fat</span>
                      <div className="nutrition-bar-track">
                        <div className="nutrition-bar-fill fat" style={{ width: barWidth(food.fat, 25) }} />
                      </div>
                      <span className="nutrition-bar-value">{food.fat}%</span>
                    </div>
                  )}
                  {Number.isFinite(food.fiber) && (
                    <div className="nutrition-bar-row">
                      <span className="nutrition-bar-label">Fiber</span>
                      <div className="nutrition-bar-track">
                        <div className="nutrition-bar-fill fiber" style={{ width: barWidth(food.fiber, 10) }} />
                      </div>
                      <span className="nutrition-bar-value">{food.fiber}%</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {food.matchReasons && food.matchReasons.length > 2 && (
              <div className="detail-more-reasons">
                <h4>More Reasons</h4>
                {food.matchReasons.slice(2).map((reason, i) => (
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

          {/* ZONE 2: Ingredients (green accent) */}
          {(detailIngredients || tagListForDetail.length > 0) && (
            <div className="detail-zone detail-zone-ingredients">
              {detailIngredients && (
                <>
                  <h4>Ingredients</h4>
                  <p className="detail-ingredients-text">{detailIngredients}</p>
                </>
              )}
              {tagListForDetail.length > 0 && (
                <>
                  <h4>Key Attributes</h4>
                  <div className="detail-tag-list">
                    {tagListForDetail.map((tag) => (
                      <span key={tag} className="detail-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ZONE 3: Calculator (amber accent) */}
          {Number.isFinite(food.kcalPerCup) && (
            <div className="detail-zone detail-zone-calculator">
              <h4>Feeding Calculator</h4>
              <div className="feeding-calc-input">
                <label htmlFor={`weight-${food.compareId}`}>
                  Your dog's weight (lbs):
                </label>
                <input
                  id={`weight-${food.compareId}`}
                  type="number"
                  min="1"
                  max="300"
                  step="1"
                  placeholder="e.g. 50"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="feeding-weight-input"
                />
              </div>

              {feedingResults ? (
                <div className="feeding-results">
                  <div className="feeding-result-grid">
                    <div className="feeding-result-item">
                      <span className="feeding-result-label">Daily Amount</span>
                      <span className="feeding-result-value">{feedingResults.cupsPerDay} cups/day</span>
                      <span className="feeding-result-sub">({feedingResults.cupsPerMeal} cups per meal, 2 meals)</span>
                    </div>
                    {feedingResults.costPerDay && (
                      <div className="feeding-result-item">
                        <span className="feeding-result-label">Estimated Cost</span>
                        <span className="feeding-result-value">{feedingResults.costPerDay}/day</span>
                        <span className="feeding-result-sub">{feedingResults.costPerMonth}/month</span>
                      </div>
                    )}
                    {feedingResults.bagDuration && (
                      <div className="feeding-result-item">
                        <span className="feeding-result-label">Bag Duration</span>
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
                      onClick={(e) => e.stopPropagation()}
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

        </div>
      </div>
    </div>
  );
};

export default FoodCard;
