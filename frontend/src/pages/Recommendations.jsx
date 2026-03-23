/**
 * Recommendations — Scored food results with client-side filtering, sorting, product detail overlay,
 * comparison tool, and purchase tracking. Shows unified header when authenticated.
 * Backend sends 40 products, frontend caps at 20 unless filters active.
 * @route /recommendations
 */
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import FoodCard from '../components/FoodCard';
import ProductDetail from '../components/ProductDetail';
import ComparisonTool from '../components/ComparisonTool';
import FilterBar from '../components/FilterBar';
import SaveResultsBanner from '../components/SaveResultsBanner';
import LogPurchaseModal from '../components/LogPurchaseModal';
import { getRecommendations, transformRecommendation, getCurrentUser, getPet } from '../api/petApi';
import { isAuthenticated, clearToken } from '../utils/auth';
import { formatCompareLabel } from '../utils/foodUtils';
import '../styles/recommendation.css';
import '../styles/dashboard.css';

const buildPriceRanges = (foods) => {
  const prices = foods.map((f) => f.price).filter(Number.isFinite).sort((a, b) => a - b);
  if (prices.length < 4) {
    return [{ label: 'All Prices', min: 0, max: Infinity }];
  }
  const p25 = prices[Math.floor(prices.length * 0.25)];
  const p50 = prices[Math.floor(prices.length * 0.5)];
  const p75 = prices[Math.floor(prices.length * 0.75)];

  const fmt = (n) => `$${Math.round(n)}`;

  return [
    { label: 'All Prices', min: 0, max: Infinity },
    { label: `Under ${fmt(p25)}`, min: 0, max: p25 },
    { label: `${fmt(p25)} – ${fmt(p50)}`, min: p25, max: p50 },
    { label: `${fmt(p50)} – ${fmt(p75)}`, min: p50, max: p75 },
    { label: `${fmt(p75)}+`, min: p75, max: Infinity },
  ];
};

const Recommendations = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [petData, setPetData] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allergyStats, setAllergyStats] = useState(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [sortOption, setSortOption] = useState('default');
  const [compareState, setCompareState] = useState({ isOpen: false, primary: '', secondary: '' });
  const [authedPetId, setAuthedPetId] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  // Product detail overlay — driven by URL param
  const selectedFoodId = searchParams.get('product') || null;

  // Lifted weight input state (persists across product nav)
  const [weightLbs, setWeightLbs] = useState('');

  // Save Results banner triggers
  const [hasClosedOverlay, setHasClosedOverlay] = useState(false);
  const [hasScrolledPast5, setHasScrolledPast5] = useState(false);

  const setSelectedFoodId = useCallback((id) => {
    if (id) {
      setSearchParams({ product: id });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  // Filter state
  const [selectedBrands, setSelectedBrands] = useState(new Set());
  const [priceRangeIndex, setPriceRangeIndex] = useState(0);
  const [selectedProteins, setSelectedProteins] = useState(new Set());
  const [grainFreeOnly, setGrainFreeOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Purchase modal state
  const [purchaseProduct, setPurchaseProduct] = useState(null);

  // Derive dynamic price ranges from loaded foods
  const PRICE_RANGES = useMemo(() => buildPriceRanges(foods), [foods]);

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
  const hasActiveFilters = selectedBrands.size > 0 || priceRangeIndex > 0 || selectedProteins.size > 0 || grainFreeOnly || favoritesOnly;

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
    if (favoritesOnly) {
      chips.push({ type: 'favorites', label: 'Favorites Only', value: true });
    }
    return chips;
  }, [selectedBrands, selectedProteins, priceRangeIndex, grainFreeOnly, favoritesOnly]);

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

    // Favorites filter
    if (favoritesOnly) {
      try {
        const favs = JSON.parse(localStorage.getItem('favoriteFoods') || '[]');
        list = list.filter((food) => favs.includes(food.compareId));
      } catch { /* ignore */ }
    }

    // Sort
    if (sortOption === 'default') {
      // Cap at 20 when no filters or sort active
      if (!hasActiveFilters) return list.slice(0, 20);
      return list;
    }
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
  }, [foods, sortOption, selectedBrands, priceRangeIndex, selectedProteins, grainFreeOnly, favoritesOnly, hasActiveFilters]);

  const resultsLabel = useMemo(() => {
    const count = displayFoods.length;
    const isDefault = !hasActiveFilters && sortOption === 'default';
    if (isDefault && totalMatches > count) {
      return `Showing top ${count} of ${totalMatches} matches`;
    }
    return `Showing ${count} of ${totalMatches} match${totalMatches === 1 ? '' : 'es'}`;
  }, [displayFoods, hasActiveFilters, sortOption, totalMatches]);

  // Find the selected food object for the overlay
  const selectedFood = useMemo(() => {
    if (!selectedFoodId) return null;
    return foods.find((f) => f.compareId === selectedFoodId) || null;
  }, [selectedFoodId, foods]);

  // Scroll to top before browser paint
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Clear stale product overlay param from previous visits
    if (searchParams.get('product')) {
      searchParams.delete('product');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top again after content finishes loading (prevents layout shift)
  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    }
  }, [loading]);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        let storedPetData = {};
        try {
          storedPetData = JSON.parse(localStorage.getItem('petData') || '{}');
        } catch {
          localStorage.removeItem('petData');
        }

        let petId = searchParams.get('petId') || localStorage.getItem('petId');

        // If localStorage is empty but we have a petId, fetch pet data from API
        if ((!storedPetData || !storedPetData.ageGroup) && petId) {
          try {
            const fetched = await getPet(petId);
            storedPetData = fetched;
            localStorage.setItem('petData', JSON.stringify(fetched));
            localStorage.setItem('petId', petId);
          } catch {
            navigate('/?reason=no-profile');
            return;
          }
        }

        if (!storedPetData || !storedPetData.ageGroup) {
          navigate('/?reason=no-profile');
          return;
        }
        setPetData(storedPetData);
        const response = await getRecommendations(petId);
        const recommendations = response.recommendations || [];
        const transformedFoods = recommendations.map((item, index) => transformRecommendation(item, index));

        setTotalMatches(response.total_matches || transformedFoods.length);

        if (response.allergy_filtered > 0) {
          setAllergyStats({
            total: response.total_products,
            filtered: response.allergy_filtered,
            showing: transformedFoods.length,
          });
        }

        setFoods(transformedFoods);

        // Fetch authenticated user's pet ID for purchase tracking
        if (isAuthenticated()) {
          try {
            const userData = await getCurrentUser();
            if (userData.pets?.length > 0) {
              setAuthedPetId(userData.pets[0].id || userData.pets[0].public_id);
            }
          } catch { /* ignore — guest mode fallback */ }
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load recommendations:', err);

        if (err.response?.status === 404) {
          localStorage.removeItem('petId');
          localStorage.removeItem('petData');
          navigate('/?reason=no-profile');
          return;
        }

        const isNetwork = !err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !navigator.onLine);
        if (isNetwork) {
          setError('Unable to connect to the server. Please check that the device is connected to the internet and try again.');
        } else {
          setError('Unable to load recommendations. Please try again later.');
        }
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

  const handleSelectCard = useCallback((compareId) => {
    setSelectedFoodId(compareId);
  }, [setSelectedFoodId]);

  const handleCloseDetail = useCallback(() => {
    setSelectedFoodId(null);
    setHasClosedOverlay(true);
  }, [setSelectedFoodId]);

  const handleBuyThis = useCallback((food) => {
    if (isAuthenticated()) {
      if (!authedPetId) {
        alert('Set up your pet profile first to track purchases.');
        return;
      }
      setSelectedFoodId(null); // Close product detail overlay first
      setPurchaseProduct(food);
    } else {
      sessionStorage.setItem('pendingPurchaseProductId', food.id || food.compareId);
      navigate('/login');
    }
  }, [navigate, authedPetId]);

  const handleNavigateDetail = useCallback((compareId) => {
    setSelectedFoodId(compareId);
  }, [setSelectedFoodId]);

  const openCompareModal = useCallback((focusFood = null) => {
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
  }, [displayFoods, compareState.primary]);

  const closeCompareModal = useCallback(() => {
    setCompareState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const updateCompareSelection = useCallback((next) => {
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
  }, [displayFoods]);

  const handleStartOver = useCallback(() => {
    localStorage.removeItem('petId');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('petData');
    navigate('/?new=true');
  }, [navigate]);

  const handleLogout = useCallback(() => {
    clearToken();
    localStorage.removeItem('petId');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('petData');
    navigate('/');
  }, [navigate]);

  // Close account dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetAll = useCallback(() => {
    setSortOption('default');
    setSelectedBrands(new Set());
    setPriceRangeIndex(0);
    setSelectedProteins(new Set());
    setGrainFreeOnly(false);
    setFavoritesOnly(false);
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
      case 'favorites':
        setFavoritesOnly(false);
        break;
      default:
        break;
    }
  }, []);

  // Scroll-past-5th-card trigger for SaveResultsBanner
  useEffect(() => {
    if (isAuthenticated() || hasScrolledPast5) return;
    const handleScroll = () => {
      const cards = document.querySelectorAll('.food-card');
      if (cards.length >= 5) {
        const fifth = cards[4];
        const rect = fifth.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          setHasScrolledPast5(true);
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolledPast5]);

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
          <ul className="error-troubleshoot">
            <li>Check that the device is connected to Wi-Fi or ethernet</li>
            <li>Try refreshing the page</li>
            <li>If the problem persists, restart the browser</li>
          </ul>
          <div className="error-actions">
            <button className="error-retry-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
            <button className="error-start-over-btn" onClick={handleStartOver}>
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition">
      {/* Header */}
      {isAuthenticated() ? (
        <header className="dashboard-header">
          <Link to="/dashboard" className="dashboard-header-left dash-logo-link">
            <img src="/logo.png" alt="BowlWise" className="dashboard-logo" />
            <span className="dashboard-header-title">BowlWise</span>
          </Link>
          <nav className="dashboard-nav">
            <Link to="/recommendations" className="dash-nav-link dash-nav-link--active dash-nav-recommendations">
              <span className="nav-full">Recommendations</span>
              <span className="nav-short">Foods</span>
            </Link>
            <Link to="/dashboard" className="dash-nav-link">Dashboard</Link>
            <div className="dash-account-menu" ref={accountRef}>
              <button type="button" className="dash-nav-link dash-account-trigger" onClick={() => setAccountOpen((o) => !o)}>
                <span className="dash-account-text">Account</span>
                <span className="dash-account-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
                </span>
                <svg className="dash-account-chevron" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 6 8 10 12 6" /></svg>
              </button>
              {accountOpen && (
                <div className="dash-account-dropdown dash-account-dropdown--open">
                  <Link to="/account" className="dash-dropdown-item" onClick={() => setAccountOpen(false)}>Settings</Link>
                  <Link to="/?new=true" className="dash-dropdown-item" onClick={() => setAccountOpen(false)}>New Pet Profile</Link>
                  <hr className="dash-dropdown-divider" />
                  <button type="button" className="dash-dropdown-item dash-dropdown-item--danger" onClick={() => { setAccountOpen(false); handleLogout(); }}>Log Out</button>
                  <div className="dash-dropdown-legal">
                    <Link to="/privacy" onClick={() => setAccountOpen(false)}>Privacy</Link>
                    <span> &middot; </span>
                    <Link to="/terms" onClick={() => setAccountOpen(false)}>Terms</Link>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </header>
      ) : (
        <div className="rec-header">
          <img src="/logo.png" alt="BowlWise" className="rec-logo" />
          <div className="rec-header-right">
            <Link to="/login" className="rec-header-link">Sign In</Link>
            <button type="button" className="start-over-btn" onClick={handleStartOver}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Start Over
            </button>
          </div>
        </div>
      )}

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

      {/* Brand Strip */}
      {displayFoods.length > 0 && (
        <div className="brand-strip">
          <div className="brand-strip-logos">
            <img src="/brands/orijen.png" alt="Orijen" className="brand-strip-logo" />
            <span className="brand-strip-dot" aria-hidden="true" />
            <img src="/brands/acana.png" alt="Acana" className="brand-strip-logo" />
            <span className="brand-strip-dot" aria-hidden="true" />
            <img src="/brands/open-farm.png" alt="Open Farm" className="brand-strip-logo" />
            <span className="brand-strip-dot" aria-hidden="true" />
            <img src="/brands/PerformatrinUltra-logo.svg" alt="Performatrin Ultra" className="brand-strip-logo brand-strip-logo--tall" />
            <span className="brand-strip-dot" aria-hidden="true" />
            <img src="/brands/go-solutions.png" alt="Go! Solutions" className="brand-strip-logo brand-strip-logo--tall" />
            <span className="brand-strip-dot" aria-hidden="true" />
            <img src="/brands/now-fresh.png" alt="Now Fresh" className="brand-strip-logo brand-strip-logo--tall" />
          </div>
        </div>
      )}

      {/* Save Results Banner is rendered inline in the food grid */}

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

        {/* Allergy filter notice */}
        {allergyStats && (
          <div className="allergy-filter-notice">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1z" />
              <path d="M5.5 8l2 2 3.5-3.5" />
            </svg>
            Showing {allergyStats.showing} of {allergyStats.total} products — {allergyStats.filtered} removed due to your allergy filters
          </div>
        )}

        {/* Low results warning */}
        {allergyStats && allergyStats.showing > 0 && allergyStats.showing < 5 && (
          <div className="low-results-warning">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1.5L1 14.5h14L8 1.5z" />
              <line x1="8" y1="6.5" x2="8" y2="10" />
              <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
            </svg>
            Limited options found for {petData?.name ? `${petData.name}'s` : "your dog's"} allergy profile. We recommend consulting your veterinarian for specialized diet recommendations.
          </div>
        )}

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
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
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
              <React.Fragment key={food.compareId || idx}>
                {idx === 2 && (
                  <SaveResultsBanner
                    petName={petData?.name}
                    triggerOverlayClose={hasClosedOverlay}
                    triggerScrollPast5={hasScrolledPast5}
                  />
                )}
                <FoodCard
                  food={food}
                  profile={petData}
                  onSelect={handleSelectCard}
                  onCompare={openCompareModal}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Bottom hint — points to header Start Over */}
          {displayFoods.length > 0 && (
            <div className="start-over-hint">
              <p>Looking for recommendations for a different pet?{' '}
                <button type="button" className="start-over-link" onClick={handleStartOver}>
                  Start over
                </button>
              </p>
            </div>
          )}

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

      {/* Product Detail Overlay */}
      {selectedFood && (
        <ProductDetail
          food={selectedFood}
          profile={petData}
          foods={displayFoods}
          onClose={handleCloseDetail}
          onNavigate={handleNavigateDetail}
          onCompare={openCompareModal}
          onBuyThis={handleBuyThis}
          weightLbs={weightLbs}
          setWeightLbs={setWeightLbs}
        />
      )}

      <ComparisonTool
        foods={displayFoods}
        isOpen={compareState.isOpen}
        selectedA={compareState.primary}
        selectedB={compareState.secondary}
        onOpen={openCompareModal}
        onClose={closeCompareModal}
        onSelectChange={updateCompareSelection}
        petName={petData?.name || ''}
      />

      {/* Log Purchase Modal */}
      {purchaseProduct && petData && (
        <LogPurchaseModal
          pet={{ id: authedPetId || localStorage.getItem('petId'), name: petData.name }}
          product={purchaseProduct}
          onClose={() => setPurchaseProduct(null)}
          onSuccess={() => setPurchaseProduct(null)}
        />
      )}
    </div>
  );
};

export default Recommendations;
