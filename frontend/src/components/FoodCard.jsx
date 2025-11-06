import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fmtMoney,
  splitTagsForDisplay,
  normalizeProfileSize,
} from '../utils/foodUtils';

const PLACEHOLDER_IMG = 'https://via.placeholder.com/220?text=Dog+Food';

const formatPriceLine = (price, bagLb) => {
  if (Number.isFinite(price) && Number.isFinite(bagLb) && bagLb > 0) {
    const precision = bagLb % 1 ? 1 : 0;
    return `${fmtMoney(price)} / ${bagLb.toFixed(precision)}lb`;
  }
  if (Number.isFinite(price)) {
    return fmtMoney(price);
  }
  return '';
};

const formatUnitPrice = (unitPrice) => {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return '';
  return ` (${fmtMoney(unitPrice)}/lb)`;
};

const formatBadge = (value) => {
  if (!value) return '';
  return value.replace(/-/g, ' ');
};

const getNutritionBadges = (food) => {
  const badges = [];
  if (Number.isFinite(food.protein)) {
    badges.push({
      key: 'protein',
      label: 'Protein',
      value: `${food.protein}${String(food.protein).includes('%') ? '' : '%'}`,
    });
  }
  if (Number.isFinite(food.fat)) {
    badges.push({
      key: 'fat',
      label: 'Fat',
      value: `${food.fat}${String(food.fat).includes('%') ? '' : '%'}`,
    });
  }
  if (Number.isFinite(food.fiber)) {
    badges.push({
      key: 'fiber',
      label: 'Fiber',
      value: `${food.fiber}${String(food.fiber).includes('%') ? '' : '%'}`,
    });
  }
  return badges;
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

const FoodCard = ({ food, profile, isActive, onToggle, onCompare }) => {
  const detailRef = useRef(null);
  const [favorites, setFavorites] = useState(() => loadFavorites());

  const imgSrc = food.image || PLACEHOLDER_IMG;
  const title = food.detail?.name || food.line || food.id || 'Unknown Product';
  const nutritionBadges = useMemo(() => getNutritionBadges(food), [food]);

  const priceLine = useMemo(() => formatPriceLine(food.price, food.bagLb), [food.price, food.bagLb]);
  const unitPriceLine = useMemo(() => formatUnitPrice(food.unitPrice), [food.unitPrice]);

  const tagDisplay = useMemo(() => splitTagsForDisplay(food.tags, profile), [food.tags, profile]);

  const isFavorite = favorites.includes(food.compareId);

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
    if (event.target.closest('a, button')) return;
    onToggle(food.compareId);
  };

  const handleKeyDown = (event) => {
    if (event.target.closest('a, button')) return;
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

  const chips = useMemo(() => {
    const list = (tagDisplay.ingredients || []).slice(0, 4);
    const remaining = Math.max(0, (tagDisplay.ingredients || []).length - list.length);
    return { list, remaining };
  }, [tagDisplay.ingredients]);

  const detailAnalysis = food.detail?.analysis || [];
  const detailFeeding = food.detail?.feeding || [];

  const detailIngredients = food.detail?.ingredients || '';
  const tagListForDetail = (food.tags || []).map(formatBadge);

  const profileSize = normalizeProfileSize(profile?.breedSize);

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

      <div className="card-top">
        {food.url ? (
          <a className="thumb" href={food.url} target="_blank" rel="noopener noreferrer">
            <img
              loading="lazy"
              src={imgSrc}
              alt={title}
              onError={(e) => {
                e.currentTarget.src = PLACEHOLDER_IMG;
              }}
            />
          </a>
        ) : (
          <div className="thumb">
            <img
              loading="lazy"
              src={imgSrc}
              alt={title}
              onError={(e) => {
                e.currentTarget.src = PLACEHOLDER_IMG;
              }}
            />
          </div>
        )}

        <div className="main">
          <div className="header">
            {food.brand && (
              <div className="eyebrow">
                <span className="brand-eyebrow">{food.brand}</span>
              </div>
            )}
            <h4 className="title">{title}</h4>
          </div>

          {priceLine && (
            <div className="price-line">
              <span className="price">{priceLine}</span>
              {unitPriceLine && <span className="unit">{unitPriceLine}</span>}
            </div>
          )}

          <div className="badges">
            {(tagDisplay.primary || []).map((tag) => (
              <span key={tag} className="badge badge-accent">
                {formatBadge(tag)}
              </span>
            ))}
            {tagDisplay.age && <span className="badge">{formatBadge(tagDisplay.age)}</span>}
            {tagDisplay.size && tagDisplay.size !== profileSize && <span className="badge">{formatBadge(tagDisplay.size)}</span>}
          </div>

          {nutritionBadges.length > 0 && (
            <div className="nutrition-indicators">
              {nutritionBadges.map((badge) => (
                <div key={badge.key} className={`nutrition-badge ${badge.key}`}>
                  <div className="nutrition-badge-icon">{badge.key.substring(0, 2).toUpperCase()}</div>
                  <span className="nutrition-badge-label">{badge.label}</span>
                  <span className="nutrition-badge-value">{badge.value}</span>
                </div>
              ))}
            </div>
          )}

          {chips.list.length > 0 && (
            <div className="chips">
              {chips.list.map((chip) => (
                <span key={chip} className="chip">
                  {chip}
                </span>
              ))}
              {chips.remaining > 0 && (
                <span className="chip more" title={(tagDisplay.ingredients || []).join(', ')}>
                  +{chips.remaining}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="detail-panel" hidden={!isActive} ref={detailRef}>
        <div className="detail-shell">
          <header className="detail-heading">
            <div className="detail-heading-text">
              {food.brand && <p className="detail-brand">{food.brand}</p>}
              <h3 className="detail-title">{title}</h3>
            </div>
            {food.url && (
              <a
                className="detail-link"
                href={food.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                View Product
              </a>
            )}
          </header>

          <div className="detail-main">
            <figure className="detail-photo">
              <img
                loading="lazy"
                src={imgSrc}
                alt={title}
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER_IMG;
                }}
              />
            </figure>

            <div className="detail-metrics">
              <div className="detail-metric">
                <h4>
                  <div className="detail-section-icon">🔬</div>
                  Guaranteed Analysis
                </h4>
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
                <div className="detail-metric">
                  <h4>
                    <div className="detail-section-icon">📊</div>
                    Feeding Facts
                  </h4>
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

          {detailIngredients && (
            <div className="detail-section detail-ingredients">
              <h4>
                <div className="detail-section-icon">🌾</div>
                Ingredients
              </h4>
              <p>{detailIngredients}</p>
            </div>
          )}

          {tagListForDetail.length > 0 && (
            <div className="detail-section detail-tags">
              <h4>
                <div className="detail-section-icon">✨</div>
                Key Attributes
              </h4>
              <div className="detail-tag-list">
                {tagListForDetail.map((tag) => (
                  <span key={tag} className="detail-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
