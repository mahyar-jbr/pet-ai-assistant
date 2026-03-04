import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FoodCard from '../components/FoodCard';
import ComparisonTool from '../components/ComparisonTool';
import FilterBar from '../components/FilterBar';
import { getRecommendations, transformRecommendation } from '../api/petApi';
import { formatCompareLabel } from '../utils/foodUtils';
import '../styles/recommendation.css';

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $30', min: 0, max: 30 },
  { label: '$30 – $60', min: 30, max: 60 },
  { label: '$60 – $90', min: 60, max: 90 },
  { label: '$90+', min: 90, max: Infinity },
];

const Recommendations = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFoodId, setActiveFoodId] = useState(null);
  const [sortOption, setSortOption] = useState('default');
  const [compareState, setCompareState] = useState({ isOpen: false, primary: '', secondary: '' });

  // Filter state
  const [selectedBrands, setSelectedBrands] = useState(new Set());
  const [priceRangeIndex, setPriceRangeIndex] = useState(0);
  const [selectedProteins, setSelectedProteins] = useState(new Set());
  const [grainFreeOnly, setGrainFreeOnly] = useState(false);

  // Derive available brands from loaded foods
  const availableBrands = useMemo(() => {
    const brands = [...new Set(foods.map((f) => f.brand).filter(Boolean))].sort();
    return brands;
  }, [foods]);

  // Derive available protein sources with counts from loaded foods
  const availableProteins = useMemo(() => {
    const counts = {};
    foods.forEach((f) => {
      if (f.primaryProteins) {
        f.primaryProteins
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .forEach((p) => {
            counts[p] = (counts[p] || 0) + 1;
          });
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [foods]);

  // Check if any filter is active
  const hasActiveFilters = selectedBrands.size > 0 || priceRangeIndex > 0 || selectedProteins.size > 0 || grainFreeOnly;

  // Build active filter chips for display
  const activeFilterChips = useMemo(() => {
    const chips = [];
    selectedBrands.forEach((brand) => {
      chips.push({ type: 'brand', label: brand, value: brand });
    });
    selectedProteins.forEach((protein) => {
      chips.push({ type: 'protein', label: protein.charAt(0).toUpperCase() + protein.slice(1), value: protein });
    });
    if (priceRangeIndex > 0) {
      chips.push({ type: 'price', label: PRICE_RANGES[priceRangeIndex].label, value: priceRangeIndex });
    }
    if (grainFreeOnly) {
      chips.push({ type: 'grainFree', label: 'Grain-Free Only', value: true });
    }
    return chips;
  }, [selectedBrands, selectedProteins, priceRangeIndex, grainFreeOnly]);

  // Apply filters then sort
  const displayFoods = useMemo(() => {
    let list = foods;

    // Brand filter
    if (selectedBrands.size > 0) {
      list = list.filter((food) => selectedBrands.has(food.brand));
    }

    // Price range filter
    const range = PRICE_RANGES[priceRangeIndex];
    if (range && priceRangeIndex > 0) {
      list = list.filter((food) => {
        if (!Number.isFinite(food.price)) return false;
        return food.price >= range.min && food.price < range.max;
      });
    }

    // Protein source filter
    if (selectedProteins.size > 0) {
      list = list.filter((food) => {
        if (!food.primaryProteins) return false;
        const foodProteins = food.primaryProteins
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        return foodProteins.some((p) => selectedProteins.has(p));
      });
    }

    // Grain-free filter
    if (grainFreeOnly) {
      list = list.filter((food) => food.grainFree);
    }

    // Sort
    if (sortOption === 'default') return list;
    const sorted = [...list];

    switch (sortOption) {
      case 'price-low':
        sorted.sort((a, b) => {
          const priceA = Number.isFinite(a.price) ? a.price : Infinity;
          const priceB = Number.isFinite(b.price) ? b.price : Infinity;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        sorted.sort((a, b) => {
          const priceA = Number.isFinite(a.price) ? a.price : -Infinity;
          const priceB = Number.isFinite(b.price) ? b.price : -Infinity;
          return priceB - priceA;
        });
        break;
      case 'protein-high':
        sorted.sort((a, b) => {
          const proteinA = Number.isFinite(a.protein) ? a.protein : -Infinity;
          const proteinB = Number.isFinite(b.protein) ? b.protein : -Infinity;
          return proteinB - proteinA;
        });
        break;
      case 'fat-low':
        sorted.sort((a, b) => {
          const fatA = Number.isFinite(a.fat) ? a.fat : Infinity;
          const fatB = Number.isFinite(b.fat) ? b.fat : Infinity;
          return fatA - fatB;
        });
        break;
      default:
        break;
    }

    return sorted;
  }, [foods, sortOption, selectedBrands, priceRangeIndex, selectedProteins, grainFreeOnly]);

  const resultsLabel = useMemo(() => {
    const count = displayFoods.length;
    return `${count} product${count === 1 ? '' : 's'}`;
  }, [displayFoods]);

  useEffect(() => {
    if (activeFoodId && !displayFoods.some((food) => food.compareId === activeFoodId)) {
      setActiveFoodId(null);
    }
  }, [displayFoods, activeFoodId]);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const storedPetData = JSON.parse(localStorage.getItem('petData') || '{}');
        if (!storedPetData || !storedPetData.ageGroup) {
          navigate('/');
          return;
        }
        setPetData(storedPetData);

        let petId = localStorage.getItem('petId');
        const response = await getRecommendations(petId);
        const recommendations = response.recommendations || [];
        const transformedFoods = recommendations.map((item, index) => transformRecommendation(item, index));

        setFoods(transformedFoods);
        setActiveFoodId(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load recommendations:', err);

        if (err.response?.status === 404) {
          localStorage.removeItem('petId');
          localStorage.removeItem('petData');
          navigate('/');
          return;
        }

        setError('Unable to load recommendations. Please try again later.');
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [navigate]);

  useEffect(() => {
    if (!displayFoods.length) {
      setCompareState((prev) => ({ ...prev, primary: '', secondary: '' }));
      return;
    }

    setCompareState((prev) => {
      const ids = new Set(displayFoods.map((food) => food.compareId));
      let primary = prev.primary && ids.has(prev.primary) ? prev.primary : displayFoods[0].compareId;
      if (!primary) primary = displayFoods[0].compareId;
      let secondary =
        prev.secondary && ids.has(prev.secondary) && prev.secondary !== primary
          ? prev.secondary
          : displayFoods.find((food) => food.compareId !== primary)?.compareId || '';
      return { ...prev, primary, secondary };
    });
  }, [displayFoods]);

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatAgeGroup = (ageGroup) => {
    const map = { puppy: 'Puppy', adult: 'Adult', senior: 'Senior' };
    return map[ageGroup?.toLowerCase()] || ageGroup;
  };

  const formatGoal = (goal) => {
    const map = { maintenance: 'Maintenance', 'weight-loss': 'Weight Loss', 'muscle-gain': 'Muscle Gain' };
    return map[goal?.toLowerCase()] || goal;
  };

  const handleToggleCard = (compareId) => {
    setActiveFoodId((prev) => (prev === compareId ? null : compareId));
  };

  const openCompareModal = (focusFood = null) => {
    if (!displayFoods.length) return;
    const sortedFoods = [...displayFoods].sort((a, b) => formatCompareLabel(a).localeCompare(formatCompareLabel(b)));

    const targetPrimary =
      focusFood?.compareId ||
      compareState.primary ||
      sortedFoods[0]?.compareId ||
      displayFoods[0]?.compareId ||
      '';

    const targetSecondary =
      sortedFoods.find((food) => food.compareId !== targetPrimary)?.compareId ||
      displayFoods.find((food) => food.compareId !== targetPrimary)?.compareId ||
      '';

    setCompareState({
      isOpen: true,
      primary: targetPrimary,
      secondary: targetSecondary,
    });
  };

  const closeCompareModal = () => {
    setCompareState((prev) => ({ ...prev, isOpen: false }));
  };

  const updateCompareSelection = (next) => {
    setCompareState((prev) => {
      const merged = { ...prev, ...next };
      if (merged.primary && merged.secondary && merged.primary === merged.secondary) {
        const alternate = displayFoods.find((food) => food.compareId !== merged.primary);
        if (alternate) {
          merged.secondary = alternate.compareId;
        }
      }
      return merged;
    });
  };

  const handleResetAll = useCallback(() => {
    setSortOption('default');
    setSelectedBrands(new Set());
    setPriceRangeIndex(0);
    setSelectedProteins(new Set());
    setGrainFreeOnly(false);
  }, []);

  const toggleBrand = useCallback((brand) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }, []);

  const toggleProtein = useCallback((protein) => {
    setSelectedProteins((prev) => {
      const next = new Set(prev);
      if (next.has(protein)) next.delete(protein);
      else next.add(protein);
      return next;
    });
  }, []);

  const removeFilterChip = useCallback((chip) => {
    switch (chip.type) {
      case 'brand':
        setSelectedBrands((prev) => {
          const next = new Set(prev);
          next.delete(chip.value);
          return next;
        });
        break;
      case 'protein':
        setSelectedProteins((prev) => {
          const next = new Set(prev);
          next.delete(chip.value);
          return next;
        });
        break;
      case 'price':
        setPriceRangeIndex(0);
        break;
      case 'grainFree':
        setGrainFreeOnly(false);
        break;
      default:
        break;
    }
  }, []);

  if (loading) {
    return (
      <div className="skeleton-page">
        <div className="skeleton-profile">
          <div className="skeleton-avatar skeleton-pulse" />
          <div className="skeleton-profile-details">
            <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: 24 }} />
            <div className="skeleton-info-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-info-item skeleton-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="skeleton-controls skeleton-pulse" />
        <div className="skeleton-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-card-top">
                <div className="skeleton-thumb skeleton-pulse" />
                <div className="skeleton-card-content">
                  <div className="skeleton-line skeleton-pulse" style={{ width: '30%', height: 12 }} />
                  <div className="skeleton-line skeleton-pulse" style={{ width: '80%', height: 18 }} />
                  <div className="skeleton-line skeleton-pulse" style={{ width: '25%', height: 14 }} />
                  <div className="skeleton-badges">
                    <div className="skeleton-badge skeleton-pulse" />
                    <div className="skeleton-badge skeleton-pulse" />
                    <div className="skeleton-badge skeleton-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-page">
        <div className="error-card">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="error-retry-btn" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Pet Profile Summary */}
      <section className="pet-profile">
        <div className="profile-card">
          <button id="edit-btn" className="edit-btn" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>

          <div className="pet-avatar">
            <div className="pet-avatar-wrapper">
              <div className="pet-avatar-inner">
                🐕
              </div>
            </div>
          </div>

          <div className="pet-details">
            <h2>
              <span className="pet-name-icon">🐾</span>
              <span id="pet-name">{petData?.name || 'Unknown Pet'}</span>
            </h2>
            <div className="pet-info-grid">
              <div className="pet-info-item">
                <strong>Breed Size</strong>
                <span id="pet-breed">{capitalize(petData?.breedSize)}</span>
              </div>
              <div className="pet-info-item">
                <strong>Age</strong>
                <span id="pet-age">{formatAgeGroup(petData?.ageGroup)}</span>
              </div>
              <div className="pet-info-item">
                <strong>Activity Level</strong>
                <span id="pet-activity">{capitalize(petData?.activityLevel)}</span>
              </div>
              <div className="pet-info-item">
                <strong>Dietary Goal</strong>
                <span id="pet-goal">{formatGoal(petData?.weightGoal)}</span>
              </div>
            </div>
            <div className="pet-info-item" style={{ marginTop: '0.5rem' }}>
              <strong>Allergies</strong>
              <div id="allergy-list" className="allergies">
                {petData?.allergies && petData.allergies.length > 0 ? (
                  petData.allergies.map((allergy, idx) => (
                    <span key={idx} className="pill display-only">
                      {allergy}
                    </span>
                  ))
                ) : (
                  <span className="no-allergies">None reported</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Food Recommendations */}
      <section className="food-recommendations">
        <h3>{petData?.name ? `${petData.name}'s Top Food Matches` : 'Top Food Matches'}</h3>
        <p className="recommendations-subtitle">
          {sortOption === 'default'
            ? `Sorted by best match${petData?.name ? ` for ${petData.name}` : ''}`
            : null
          }
          <span className="dry-food-notice">Dry food only</span>
        </p>

        {/* Results count + reset */}
        <div className="controls-bar">
          <span className="results-count">{resultsLabel}</span>
          {(sortOption !== 'default' || hasActiveFilters) && (
            <button
              type="button"
              id="clear-filters-btn"
              className="clear-filters-btn"
              onClick={handleResetAll}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Reset All
            </button>
          )}
        </div>

        {/* Filter bar */}
        {foods.length > 0 && (
          <FilterBar
            availableBrands={availableBrands}
            selectedBrands={selectedBrands}
            toggleBrand={toggleBrand}
            availableProteins={availableProteins}
            selectedProteins={selectedProteins}
            toggleProtein={toggleProtein}
            grainFreeOnly={grainFreeOnly}
            setGrainFreeOnly={setGrainFreeOnly}
            priceRanges={PRICE_RANGES}
            priceRangeIndex={priceRangeIndex}
            setPriceRangeIndex={setPriceRangeIndex}
            sortOption={sortOption}
            setSortOption={setSortOption}
            activeFilterChips={activeFilterChips}
            removeFilterChip={removeFilterChip}
          />
        )}

        <div className="food-section">
          <div className="food-grid">
            {displayFoods.map((food, idx) => (
              <FoodCard
                key={food.compareId || idx}
                food={food}
                profile={petData}
                isActive={activeFoodId === food.compareId}
                onToggle={handleToggleCard}
                onCompare={openCompareModal}
              />
            ))}
          </div>

          {displayFoods.length === 0 && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="56" stroke="#cbd5e0" strokeWidth="2" strokeDasharray="6 4" />
                <ellipse cx="60" cy="78" rx="16" ry="13" fill="#e2e8f0" />
                <circle cx="44" cy="50" r="7" fill="#e2e8f0" />
                <circle cx="76" cy="50" r="7" fill="#e2e8f0" />
                <circle cx="32" cy="64" r="6" fill="#e2e8f0" />
                <circle cx="88" cy="64" r="6" fill="#e2e8f0" />
                <line x1="50" y1="40" x2="70" y2="40" stroke="#cbd5e0" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h4 className="empty-state-title">No matches found</h4>
              <p className="empty-state-text">
                We couldn't find any foods that match {petData?.name ? `${petData.name}'s` : "your pet's"} profile.
              </p>
              <ul className="empty-state-suggestions">
                {hasActiveFilters && (
                  <li>
                    <button type="button" className="empty-state-link" onClick={handleResetAll}>
                      Clear your active filters
                    </button>
                    {' '}to see all recommendations
                  </li>
                )}
                {petData?.allergies?.length > 0 && (
                  <li>Remove some allergies — you have {petData.allergies.length} listed</li>
                )}
                <li>Try a different dietary goal (e.g. Maintenance instead of {formatGoal(petData?.weightGoal)})</li>
                <li>Change breed size if your dog is between size categories</li>
              </ul>
              <button className="empty-state-btn" onClick={() => navigate('/')}>
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </section>

      <ComparisonTool
        foods={displayFoods}
        isOpen={compareState.isOpen}
        selectedA={compareState.primary}
        selectedB={compareState.secondary}
        onOpen={() => openCompareModal()}
        onClose={closeCompareModal}
        onSelectChange={updateCompareSelection}
        petName={petData?.name || ''}
      />
    </>
  );
};

export default Recommendations;
