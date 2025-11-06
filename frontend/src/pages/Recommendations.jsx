import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FoodCard from '../components/FoodCard';
import ComparisonTool from '../components/ComparisonTool';
import { getRecommendations, transformRecommendation } from '../api/petApi';
import { formatCompareLabel } from '../utils/foodUtils';
import '../styles/recommendation.css';

const Recommendations = () => {
  const navigate = useNavigate();
  const [petData, setPetData] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFoodId, setActiveFoodId] = useState(null);
  const [sortOption, setSortOption] = useState('default');
  const [compareState, setCompareState] = useState({ isOpen: false, primary: '', secondary: '' });

  const displayFoods = useMemo(() => {
    if (sortOption === 'default') return foods;
    const list = [...foods];

    switch (sortOption) {
      case 'price-low':
        list.sort((a, b) => {
          const priceA = Number.isFinite(a.price) ? a.price : Infinity;
          const priceB = Number.isFinite(b.price) ? b.price : Infinity;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        list.sort((a, b) => {
          const priceA = Number.isFinite(a.price) ? a.price : -Infinity;
          const priceB = Number.isFinite(b.price) ? b.price : -Infinity;
          return priceB - priceA;
        });
        break;
      case 'protein-high':
        list.sort((a, b) => {
          const proteinA = Number.isFinite(a.protein) ? a.protein : -Infinity;
          const proteinB = Number.isFinite(b.protein) ? b.protein : -Infinity;
          return proteinB - proteinA;
        });
        break;
      case 'fat-low':
        list.sort((a, b) => {
          const fatA = Number.isFinite(a.fat) ? a.fat : Infinity;
          const fatB = Number.isFinite(b.fat) ? b.fat : Infinity;
          return fatA - fatB;
        });
        break;
      default:
        break;
    }

    return list;
  }, [foods, sortOption]);

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
        // Get pet data from localStorage
        const storedPetData = JSON.parse(localStorage.getItem('petData') || '{}');
        if (!storedPetData || !storedPetData.ageGroup) {
          navigate('/');
          return;
        }
        setPetData(storedPetData);

        // Get pet ID
        let petId = localStorage.getItem('petId');

        // Fetch recommendations
        const response = await getRecommendations(petId);
        const recommendations = response.recommendations || [];
        const transformedFoods = recommendations.map((item, index) => transformRecommendation(item, index));

        setFoods(transformedFoods);
        setActiveFoodId(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load recommendations:', err);

        // If 404, clear stale data and redirect to form
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
    const map = {
      puppy: 'Puppy',
      adult: 'Adult',
      senior: 'Senior'
    };
    return map[ageGroup?.toLowerCase()] || ageGroup;
  };

  const formatGoal = (goal) => {
    const map = {
      maintenance: 'Maintenance',
      'weight-loss': 'Weight Loss',
      'muscle-gain': 'Muscle Gain'
    };
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

  const handleSortChange = (event) => {
    setSortOption(event.target.value);
  };

  const handleResetSort = () => {
    setSortOption('default');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading recommendations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
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
        <h3>Recommended Dry Food Options</h3>

        <div className="controls-bar">
          <div className="controls-group">
            <label className="controls-label" htmlFor="sort-select">
              Sort by:
            </label>
            <select
              id="sort-select"
              className="sort-select"
              value={sortOption}
              onChange={handleSortChange}
            >
              <option value="default">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="protein-high">Protein: High to Low</option>
              <option value="fat-low">Fat: Low to High</option>
            </select>
          </div>
          <div className="controls-group">
            <span className="results-count">{resultsLabel}</span>
            {sortOption !== 'default' && (
              <button
                type="button"
                id="clear-filters-btn"
                className="clear-filters-btn"
                onClick={handleResetSort}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>

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
            <div className="no-results">
              <p>No recommendations found. Try adjusting your pet's profile.</p>
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
      />
    </>
  );
};

export default Recommendations;
