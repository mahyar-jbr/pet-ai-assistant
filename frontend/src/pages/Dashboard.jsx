/**
 * Dashboard — User home showing pet profile (reuses .profile-card pattern), active food with
 * depletion tracking, purchase history, and spending summary. Protected route.
 * Populates localStorage for Recommendations page.
 * @route /dashboard
 */
import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, getPurchases, getRecommendations, transformRecommendation, deletePurchase, extendPurchase } from '../api/petApi';
import { clearToken } from '../utils/auth';
import { fmtMoney } from '../utils/foodUtils';
import LogPurchaseModal from '../components/LogPurchaseModal';
import '../styles/dashboard.css';
import '../styles/recommendation.css';

const PLACEHOLDER_IMG = 'https://via.placeholder.com/120?text=Dog+Food';

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatGoal = (goal) => {
  const map = { maintenance: 'Maintenance', 'weight-loss': 'Weight Loss', 'muscle-gain': 'Muscle Gain' };
  return map[goal?.toLowerCase()] || goal || '';
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const daysRemaining = (purchase) => {
  if (!purchase?.estimated_depletion_at) return null;
  const depletion = new Date(purchase.estimated_depletion_at);
  const now = new Date();
  return Math.max(0, Math.ceil((depletion - now) / (1000 * 60 * 60 * 24)));
};

const depletionPercent = (purchase) => {
  if (!purchase?.purchased_at || !purchase?.estimated_depletion_at) return 0;
  const start = new Date(purchase.purchased_at).getTime();
  const end = new Date(purchase.estimated_depletion_at).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return 0;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
};

const progressColor = (remaining, total) => {
  if (!total) return 'var(--button-bg, #0057ff)';
  const pct = remaining / total;
  if (pct > 0.3) return 'var(--button-bg, #0057ff)';
  if (pct > 0.1) return '#f59e0b';
  return '#ef4444';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [toast, setToast] = useState('');
  const [editingPurchase, setEditingPurchase] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      if (userData.pets?.length > 0 && (userData.pets[0].id || userData.pets[0].public_id)) {
        const pet = userData.pets[0];
        const petId = pet.id || pet.public_id;
        // Keep localStorage fresh for Recommendations page
        localStorage.setItem('petId', petId);
        localStorage.setItem('petData', JSON.stringify(pet));
        const purchaseData = await getPurchases(petId);
        setPurchases(Array.isArray(purchaseData) ? purchaseData : purchaseData.purchases || []);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearToken();
        navigate('/login', { replace: true });
        return;
      }
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Close account dropdown on click outside
  useEffect(() => {
    if (!accountOpen) return;
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [accountOpen]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Check for pending purchase intent from pre-login flow
  useEffect(() => {
    if (loading || !user?.pets?.length) return;
    const pendingId = sessionStorage.getItem('pendingPurchaseProductId');
    if (!pendingId) return;
    sessionStorage.removeItem('pendingPurchaseProductId');
    const petId = user.pets[0].id || user.pets[0].public_id;
    getRecommendations(petId)
      .then((data) => {
        const foods = (data.recommendations || []).map((r, i) => transformRecommendation(r, i));
        const match = foods.find((f) => f.id === pendingId || f.compareId === pendingId);
        if (match) {
          setPendingProduct(match);
          setShowPurchaseModal(true);
        }
      })
      .catch(() => {});
  }, [loading, user]);

  const pet = user?.pets?.[0] || null;
  const activePurchase = useMemo(() => {
    return purchases.find((p) => p.status === 'active') || null;
  }, [purchases]);

  const remaining = activePurchase ? daysRemaining(activePurchase) : null;
  const usedPct = activePurchase ? depletionPercent(activePurchase) : 0;

  const totalBagDays = useMemo(() => {
    if (!activePurchase?.purchased_at || !activePurchase?.estimated_depletion_at) return 0;
    const start = new Date(activePurchase.purchased_at).getTime();
    const end = new Date(activePurchase.estimated_depletion_at).getTime();
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }, [activePurchase]);

  const spending = useMemo(() => {
    if (purchases.length < 2) return null;
    const total = purchases.reduce((sum, p) => sum + (p.cost || 0), 0);
    const sorted = [...purchases].sort((a, b) => new Date(a.purchased_at) - new Date(b.purchased_at));
    const firstDate = new Date(sorted[0].purchased_at);
    const lastDate = new Date(sorted[sorted.length - 1].purchased_at);
    const months = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30));
    return {
      total,
      bags: purchases.length,
      avgPerMonth: total / months,
    };
  }, [purchases]);

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('petId');
    localStorage.removeItem('petData');
    localStorage.removeItem('sessionToken');
    navigate('/', { replace: true });
  };

  const handlePurchaseLogged = useCallback(async () => {
    setShowPurchaseModal(false);
    try {
      const petId = user?.pets?.[0]?.id || user?.pets?.[0]?.public_id;
      if (petId) {
        const purchaseData = await getPurchases(petId);
        setPurchases(Array.isArray(purchaseData) ? purchaseData : purchaseData.purchases || []);
      }
    } catch {
      // Fallback: full re-fetch
      fetchData();
    }
  }, [user, fetchData]);

  const confirmDeletePurchase = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      await deletePurchase(deleteConfirmId);
      setDeleteConfirmId(null);
      const petId = user?.pets?.[0]?.id || user?.pets?.[0]?.public_id;
      if (petId) {
        const purchaseData = await getPurchases(petId);
        setPurchases(Array.isArray(purchaseData) ? purchaseData : purchaseData.purchases || []);
      }
      setToast('Purchase deleted');
      setTimeout(() => setToast(''), 2500);
    } catch {
      setDeleteConfirmId(null);
      setToast('Failed to delete purchase');
      setTimeout(() => setToast(''), 2500);
    }
  }, [deleteConfirmId, user]);

  const handleExtendBag = useCallback(async () => {
    if (!activePurchase?.id) return;
    try {
      await extendPurchase(activePurchase.id);
      const petId = user?.pets?.[0]?.id || user?.pets?.[0]?.public_id;
      if (petId) {
        const purchaseData = await getPurchases(petId);
        setPurchases(Array.isArray(purchaseData) ? purchaseData : purchaseData.purchases || []);
      }
      setToast('Extended by 7 days');
      setTimeout(() => setToast(''), 2500);
    } catch {
      setToast('Failed to extend');
      setTimeout(() => setToast(''), 2500);
    }
  }, [activePurchase, user]);

  if (loading) {
    return (
      <div className="dashboard-page page-transition">
        <div className="dashboard-skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-card" />
          <div className="skeleton-card skeleton-card--tall" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page page-transition">
        <div className="dashboard-error">
          <p>{error}</p>
          <button className="dash-btn-primary" onClick={fetchData}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page page-transition">
      {/* Header */}
      <header className="dashboard-header">
        <Link to="/dashboard" className="dashboard-header-left dash-logo-link">
          <img src="/logo.png" alt="Pet AI Assistant" className="dashboard-logo" />
          <span className="dashboard-header-title">Pet AI Assistant</span>
        </Link>
        <nav className="dashboard-nav">
          <Link to="/recommendations" className="dash-nav-link dash-nav-recommendations">
            <span className="nav-full">Recommendations</span>
            <span className="nav-short">Foods</span>
          </Link>
          <Link to="/dashboard" className="dash-nav-link dash-nav-link--active">Dashboard</Link>
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

      <main className="dashboard-content">
        {/* Personalized greeting */}
        {pet && (
          <div className="dash-greeting">
            <h1 className="dash-greeting-text">
              {getGreeting()}, {pet.name}!
            </h1>
            {remaining != null && (
              <p className="dash-greeting-sub">
                {remaining > 7
                  ? `${remaining} days of food remaining`
                  : remaining > 0
                    ? `Only ${remaining} day${remaining !== 1 ? 's' : ''} of food left — time to reorder!`
                    : 'Your bag may be empty — time to restock!'}
              </p>
            )}
          </div>
        )}

        {/* Section 1: Pet Card — same layout as Recommendations profile card */}
        <section className="pet-profile">
          {pet ? (
            <>
              <div className="profile-card">
                <div className="pet-avatar">
                  <div className="pet-avatar-wrapper">
                    <div className="pet-avatar-inner">🐕</div>
                  </div>
                </div>
                <div className="pet-details">
                  <h2>
                    <span className="pet-name-icon">🐾</span>
                    <span>{pet.name}</span>
                  </h2>
                  <div className="pet-info-grid">
                    <div className="pet-info-item">
                      <strong>Breed Size</strong>
                      <span>{capitalize(pet.breedSize)}</span>
                    </div>
                    <div className="pet-info-item">
                      <strong>Age</strong>
                      <span>{capitalize(pet.ageGroup)}</span>
                    </div>
                    <div className="pet-info-item">
                      <strong>Activity Level</strong>
                      <span>{capitalize(pet.activityLevel)}</span>
                    </div>
                    <div className="pet-info-item">
                      <strong>Dietary Goal</strong>
                      <span>{formatGoal(pet.weightGoal)}</span>
                    </div>
                  </div>
                  <div className="pet-info-item dash-allergy-item">
                    <strong>Allergies</strong>
                    <div className="allergies">
                      {pet.allergies?.length > 0 ? (
                        pet.allergies.map((allergy, idx) => (
                          <span key={idx} className="pill display-only">{allergy}</span>
                        ))
                      ) : (
                        <span className="no-allergies">None reported</span>
                      )}
                    </div>
                  </div>
                  <div className="dash-pet-actions">
                    <Link to={`/recommendations${(pet?.id || pet?.public_id) ? `?petId=${pet.id || pet.public_id}` : ''}`} className="dash-btn-primary">View Recommendations</Link>
                  </div>
                </div>
              </div>

              {/* Brand Strip — same as Recommendations */}
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
            </>
          ) : (
            <div className="dash-empty-card">
              <p className="dash-empty-title">No pet profile linked</p>
              <p className="dash-empty-desc">
                We couldn't link a pet profile to your account. This can happen if your browser data was cleared between signing up and clicking the login link.
              </p>
              <Link to="/dashboard/add-pet" className="dash-btn-primary">Create a New Pet Profile</Link>
            </div>
          )}
        </section>

        {/* Section 2: Active Food */}
        <section className="dash-section">
          <h2 className="dash-section-title">{pet ? `${pet.name}'s Active Food` : 'Active Food'}</h2>
          {activePurchase ? (
            <div className="dash-active-food-card">
              <div className="dash-active-food-top">
                <img
                  src={activePurchase.product_snapshot?.image || PLACEHOLDER_IMG}
                  alt={`${activePurchase.product_snapshot?.brand || ''} ${activePurchase.product_snapshot?.line || 'Product'}`}
                  className="dash-active-food-img"
                />
                <div className="dash-active-food-info">
                  <div className="dash-food-header">
                    <h3 className="dash-active-food-name">
                      {activePurchase.product_snapshot?.brand} {activePurchase.product_snapshot?.line || activePurchase.product_id}
                    </h3>
                    {activePurchase.match_score && (
                      <span className="dash-food-score">&#9733; {activePurchase.match_score} Match</span>
                    )}
                    <button type="button" className="dash-edit-purchase" onClick={() => setEditingPurchase(true)}>Edit</button>
                  </div>
                  <span className="dash-active-food-size">
                    {activePurchase.bag_size_kg}kg bag
                    {activePurchase.cost ? ` \u00b7 ${fmtMoney(activePurchase.cost)}` : ''}
                  </span>
                </div>
              </div>

              {/* Depletion hero zone */}
              <div className={`dash-depletion-zone${remaining != null && remaining <= 2 ? ' dash-depletion-zone--urgent' : remaining != null && remaining <= 7 ? ' dash-depletion-zone--warning' : ''}`}>
                {remaining != null && (
                  <p className={`dash-depletion-days${remaining <= 2 ? ' dash-depletion-days--urgent' : remaining <= 7 ? ' dash-depletion-days--warning' : ''}`}>
                    ~{remaining} day{remaining !== 1 ? 's' : ''} left
                  </p>
                )}
                {activePurchase.estimated_depletion_at && (
                  <p className="dash-depletion-date">
                    Runs out approximately {formatDate(activePurchase.estimated_depletion_at)}
                  </p>
                )}
                <div className="dash-depletion-bar">
                  <div
                    className="dash-depletion-fill"
                    style={{
                      width: `${100 - usedPct}%`,
                      background: progressColor(remaining, totalBagDays),
                    }}
                  />
                </div>
                <div className="dash-depletion-labels">
                  <span>Purchased {formatDate(activePurchase.purchased_at)}</span>
                  <span>{remaining != null && remaining > 0 ? `${remaining} day${remaining !== 1 ? 's' : ''}` : 'Empty'}</span>
                </div>
                {remaining != null && remaining <= 0 && (
                  <button className="dash-extend-btn" onClick={handleExtendBag}>
                    I still have some (+7 days)
                  </button>
                )}
              </div>

              {/* Stats row */}
              <div className="dash-food-stats">
                {activePurchase.cups_per_day && (
                  <div className="dash-food-stat">
                    <span className="dash-food-stat-value">{activePurchase.cups_per_day} cups</span>
                    <span className="dash-food-stat-label">/day</span>
                  </div>
                )}
                {activePurchase.cost && totalBagDays > 0 && (
                  <div className="dash-food-stat">
                    <span className="dash-food-stat-value">{fmtMoney(activePurchase.cost / totalBagDays)}</span>
                    <span className="dash-food-stat-label">/day</span>
                  </div>
                )}
                {totalBagDays > 0 && (
                  <div className="dash-food-stat">
                    <span className="dash-food-stat-value">{totalBagDays} days</span>
                    <span className="dash-food-stat-label">/bag</span>
                  </div>
                )}
              </div>

              {/* Reorder warning */}
              {remaining != null && remaining <= 5 && (
                <div className="dash-reorder-warning">
                  Running low on {activePurchase.product_snapshot?.brand || 'food'}?
                </div>
              )}

              {/* Food tenure counter */}
              {activePurchase?.purchased_at && (
                <p className="dash-food-tenure">
                  {pet?.name || 'Your dog'} has been eating{' '}
                  {activePurchase.product_snapshot?.brand || 'this food'} for{' '}
                  <strong>
                    {Math.ceil((Date.now() - new Date(activePurchase.purchased_at).getTime()) / 86400000)} days
                  </strong>
                </p>
              )}

              <div className="dash-active-food-actions">
                <button type="button" className="dash-btn-outline" onClick={() => setShowPurchaseModal(true)}>
                  Log New Purchase
                </button>
                {activePurchase.product_snapshot?.source_url ? (
                  <a
                    href={activePurchase.product_snapshot.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dash-btn-primary"
                  >
                    Reorder from {activePurchase.product_snapshot?.retailer || 'Retailer'} &rarr;
                  </a>
                ) : (
                  <Link to={`/recommendations${(pet?.id || pet?.public_id) ? `?petId=${pet.id || pet.public_id}` : ''}`} className="dash-btn-primary">
                    Browse Recommendations
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="dash-empty-card">
              <p className="dash-empty-title">No food tracked yet</p>
              <p className="dash-empty-desc">
                Found a food you love from {pet?.name || 'your dog'}'s recommendations? Log your first purchase to start tracking.
              </p>
              <Link to={`/recommendations${(pet?.id || pet?.public_id) ? `?petId=${pet.id || pet.public_id}` : ''}`} className="dash-btn-primary">Browse Recommendations</Link>
            </div>
          )}
        </section>

        {/* Section 3: Purchase History */}
        {purchases.length > 0 && (
          <section className="dash-section">
            <h2 className="dash-section-title">Purchase History</h2>
            <div className="dash-purchase-table">
              <div className="dash-purchase-row dash-purchase-row--header">
                <span>Date</span>
                <span></span>
                <span>Product</span>
                <span>Cost</span>
                <span></span>
              </div>
              {[...purchases]
                .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at))
                .map((p, i, arr) => {
                  const prevProduct = arr[i + 1]?.product_id;
                  const switched = prevProduct && prevProduct !== p.product_id;
                  return (
                    <div key={p.id || i} className="dash-purchase-row">
                      <span>{formatDate(p.purchased_at)}</span>
                      <img
                        src={p.product_snapshot?.image || PLACEHOLDER_IMG}
                        alt=""
                        className="dash-purchase-thumb"
                      />
                      <span className="dash-purchase-product">
                        {p.product_snapshot?.brand} {p.product_snapshot?.line || p.product_id}
                        {switched && <span className="dash-purchase-switch">switched</span>}
                      </span>
                      <span>{p.cost ? fmtMoney(p.cost) : '\u2014'}</span>
                      <button
                        type="button"
                        className="dash-purchase-delete"
                        onClick={() => setDeleteConfirmId(p.id)}
                        aria-label="Delete purchase"
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4M6.67 7.33v4M9.33 7.33v4M3.33 4l.67 9.33a1.33 1.33 0 0 0 1.33 1.34h5.34a1.33 1.33 0 0 0 1.33-1.34L12.67 4" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Section 4: Spending Summary */}
        {spending && (
          <section className="dash-section">
            <div className="dash-spending-summary">
              Total: {fmtMoney(spending.total)} &middot; {spending.bags} bag{spending.bags !== 1 ? 's' : ''} &middot; Avg {fmtMoney(spending.avgPerMonth)}/month
            </div>
          </section>
        )}

        <p className="dash-feedback">
          Found a problem?{' '}
          <a href="mailto:jaberi.mahyar@gmail.com?subject=Pet AI Assistant — Bug Report" className="dash-feedback-link">Let us know &rarr;</a>
        </p>
      </main>

      {/* Purchase Modal */}
      {showPurchaseModal && pet && (
        <LogPurchaseModal
          pet={pet}
          product={pendingProduct || undefined}
          onClose={() => { setShowPurchaseModal(false); setPendingProduct(null); }}
          onSuccess={() => {
            handlePurchaseLogged();
            setPendingProduct(null);
            setToast('Purchase logged!');
            setTimeout(() => setToast(''), 2500);
          }}
        />
      )}

      {editingPurchase && activePurchase && pet && (
        <LogPurchaseModal
          pet={pet}
          editPurchase={activePurchase}
          onClose={() => setEditingPurchase(false)}
          onSuccess={() => {
            setEditingPurchase(false);
            handlePurchaseLogged();
            setToast('Purchase updated!');
            setTimeout(() => setToast(''), 2500);
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="purchase-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="purchase-delete-confirm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this purchase?</h3>
            <p>This will remove the purchase from your history. This cannot be undone.</p>
            <div className="purchase-delete-actions">
              <button type="button" className="dash-btn-outline" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button type="button" className="dash-btn-danger" onClick={confirmDeletePurchase}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div className="dash-toast" role="alert">{toast}</div>
      )}
    </div>
  );
};

export default Dashboard;
