import { memo, useMemo, useState } from 'react';
import { fmtMoney } from '../utils/foodUtils';

const PLACEHOLDER_IMG = 'https://via.placeholder.com/220?text=Dog+Food';

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

const FoodCard = ({ food, profile, onSelect, onCompare }) => {
  const [favorites, setFavorites] = useState(() => loadFavorites());

  const imgSrc = food.image || PLACEHOLDER_IMG;
  const title = food.detail?.name || food.line || food.id || 'Unknown Product';

  const priceLine = useMemo(
    () => formatFullPriceLine(food.price, food.bagLb, food.unitPrice),
    [food.price, food.bagLb, food.unitPrice]
  );

  const isFavorite = favorites.includes(food.compareId);
  const isPlantBased = (food.primaryProteins || '').toLowerCase().includes('plant-based') ||
    (food.line || '').toLowerCase().includes('kind earth');

  const handleCardClick = (event) => {
    if (event.target.closest('a, button')) return;
    onSelect(food.compareId);
  };

  const handleKeyDown = (event) => {
    if (event.target.closest('a, button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(food.compareId);
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

  return (
    <div
      className="food-card better-card"
      data-tags={(food.tags || []).join(', ')}
      data-food-id={food.compareId}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
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
                  <span className="score-info-trigger" tabIndex={0} role="button" aria-label="What is Match Score?" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="7" />
                      <line x1="8" y1="7" x2="8" y2="11.5" strokeLinecap="round" />
                      <circle cx="8" cy="4.75" r="0.5" fill="currentColor" stroke="none" />
                    </svg>
                    <span className="score-info-tooltip">Match Score reflects how well this food fits your dog's breed, age, activity level, dietary goals, and nutritional needs. Scored out of 100.</span>
                  </span>
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

          {/* Plant-based disclaimer */}
          {isPlantBased && (
            <div className="card-section card-plant-disclaimer">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="7" />
                <line x1="8" y1="5" x2="8" y2="9" />
                <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
              Plant-based diet — consult your veterinarian before feeding.
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
    </div>
  );
};

export default memo(FoodCard);
