/**
 * LogPurchaseModal — 2-step purchase logging modal. Step 1: select product from recommendations.
 * Step 2: confirm bag size, cups/day, see estimates. Matches comparison modal design pattern.
 * @param {Object} pet — pet profile (id, name, breedSize)
 * @param {Object} [product] — pre-selected product (skips step 1)
 * @param {Function} onClose
 * @param {Function} onSuccess
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getRecommendations, createPurchase, updatePurchase } from '../api/petApi';
import { fmtMoney } from '../utils/foodUtils';
import { transformRecommendation } from '../api/petApi';
import '../styles/dashboard.css';

const PLACEHOLDER_IMG = 'https://via.placeholder.com/60?text=Food';

const LogPurchaseModal = ({ pet = {}, product: preselectedProduct = null, editPurchase = null, onClose, onSuccess }) => {
  const isEdit = Boolean(editPurchase);
  // Build a product object from editPurchase snapshot for step 2 display
  const editProduct = isEdit ? {
    id: editPurchase.product_id,
    brand: editPurchase.product_snapshot?.brand || '',
    line: editPurchase.product_snapshot?.line || '',
    image: editPurchase.product_snapshot?.image || '',
    sizeKg: editPurchase.product_snapshot?.size_kg || editPurchase.bag_size_kg,
    price: editPurchase.product_snapshot?.price || editPurchase.cost,
    kcalPerCup: editPurchase.product_snapshot?.kcal_per_cup || 0,
    kcalPerKg: editPurchase.product_snapshot?.kcal_per_kg || 0,
    detail: { name: editPurchase.product_snapshot?.line || '' },
  } : null;
  const [step, setStep] = useState(preselectedProduct || isEdit ? 2 : 1);
  const [selectedProduct, setSelectedProduct] = useState(preselectedProduct || editProduct);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(!preselectedProduct && !isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 2 fields — pre-fill from editPurchase if editing
  const [bagSize, setBagSize] = useState(editPurchase?.bag_size_kg ? String(editPurchase.bag_size_kg) : '');
  const [cupsPerDay, setCupsPerDay] = useState(editPurchase?.cups_per_day ? String(editPurchase.cups_per_day) : '');

  const modalRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Fetch recommendations for step 1 product selection
  useEffect(() => {
    if (preselectedProduct || isEdit) return;
    const fetchRecs = async () => {
      try {
        const data = await getRecommendations((pet.id || pet.public_id));
        const foods = (data.recommendations || []).map((r, i) => transformRecommendation(r, i));
        setRecommendations(foods.slice(0, 5));
      } catch {
        setError('Could not load products.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, [(pet.id || pet.public_id), preselectedProduct]);

  // Set defaults when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setBagSize(selectedProduct.sizeKg ? String(selectedProduct.sizeKg) : '');
      const breedSize = pet.breedSize || pet.breed_size || '';
      const defaultCups = breedSize === 'small' ? '0.75' : breedSize === 'medium' ? '1.5' : '2.5';
      setCupsPerDay(defaultCups);
    }
  }, [selectedProduct]);

  // Focus trap and escape
  useEffect(() => {
    prevFocusRef.current = document.activeElement;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      prevFocusRef.current?.focus?.();
    };
  }, [onClose]);

  // Estimated values
  const bagSizeNum = parseFloat(bagSize) || 0;
  const cupsNum = parseFloat(cupsPerDay) || 0;
  const kcalPerCup = selectedProduct?.kcalPerCup || 0;
  const kcalPerKg = selectedProduct?.kcalPerKg || 0;
  const price = selectedProduct?.price || 0;

  const bagDurationDays = kcalPerCup > 0 && kcalPerKg > 0 && cupsNum > 0 && bagSizeNum > 0
    ? Math.round((bagSizeNum * kcalPerKg) / (cupsNum * kcalPerCup))
    : null;

  const costPerDay = bagDurationDays && price > 0
    ? price / bagDurationDays
    : null;

  const costPerMonth = costPerDay ? costPerDay * 30 : null;

  const depletionDate = bagDurationDays
    ? new Date(Date.now() + bagDurationDays * 24 * 60 * 60 * 1000)
    : null;

  const handleSelectProduct = (food) => {
    setSelectedProduct(food);
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (editPurchase?.id) {
        await updatePurchase(editPurchase.id, {
          bag_size_kg: bagSizeNum,
          cups_per_day: cupsNum,
        });
      } else {
        await createPurchase({
          pet_id: (pet.id || pet.public_id),
          product_id: selectedProduct.id,
          bag_size_kg: bagSizeNum,
          cups_per_day: cupsNum,
          cost: price,
        });
      }
      onSuccess();
    } catch {
      setError(editPurchase ? 'Failed to update purchase.' : 'Failed to log purchase. Please try again.');
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="purchase-modal-backdrop" onClick={handleBackdropClick}>
      <div className="purchase-modal" ref={modalRef} role="dialog" aria-modal="true" aria-label="Log a purchase">
        {/* Header */}
        <div className="purchase-modal-header">
          <h2 className="purchase-modal-title">
            {editPurchase ? 'Edit Purchase' : `Log a Purchase for ${pet.name}`}
          </h2>
          <button type="button" className="purchase-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step 1: Select Product */}
        {step === 1 && (
          <div className="purchase-modal-body">
            <p className="purchase-modal-label">Which food did you buy?</p>
            {loading ? (
              <div className="purchase-modal-loading">Loading products...</div>
            ) : (
              <div className="purchase-product-list">
                {recommendations.map((food) => (
                  <button
                    key={food.compareId}
                    type="button"
                    className="purchase-product-item"
                    onClick={() => handleSelectProduct(food)}
                  >
                    <img src={food.image || PLACEHOLDER_IMG} alt="" className="purchase-product-img" />
                    <span className="purchase-product-name">{food.brand} {food.detail?.name || food.line}</span>
                    <span className="purchase-product-score">{food.matchScore}</span>
                  </button>
                ))}
                <a
                  href={`/recommendations${pet?.id || pet?.public_id ? `?petId=${pet.id || pet.public_id}` : ''}`}
                  className="purchase-search-link"
                  onClick={onClose}
                >
                  Don't see your food? Browse all products &rarr;
                </a>
              </div>
            )}
            {error && <p className="purchase-modal-error">{error}</p>}
          </div>
        )}

        {/* Step 2: Confirm Details */}
        {step === 2 && selectedProduct && (
          <div className="purchase-modal-body">
            <div className="purchase-confirm-product">
              <img src={selectedProduct.image || PLACEHOLDER_IMG} alt="" className="purchase-confirm-img" />
              <div>
                <h3 className="purchase-confirm-name">{selectedProduct.brand} {selectedProduct.detail?.name || selectedProduct.line}</h3>
                {selectedProduct.matchScore > 0 && (
                  <span className="purchase-confirm-score">{selectedProduct.matchScore} Match Score</span>
                )}
              </div>
            </div>

            <div className="purchase-fields">
              <div className="purchase-field">
                <label className="purchase-field-label">Bag size</label>
                <div className="purchase-field-row">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="purchase-field-input"
                    value={bagSize}
                    onChange={(e) => setBagSize(e.target.value)}
                  />
                  <span className="purchase-field-unit">kg</span>
                </div>
              </div>
              <div className="purchase-field">
                <label className="purchase-field-label">{pet.name} eats</label>
                <div className="purchase-field-row">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="purchase-field-input"
                    value={cupsPerDay}
                    onChange={(e) => setCupsPerDay(e.target.value)}
                  />
                  <span className="purchase-field-unit">cups/day</span>
                </div>
              </div>
            </div>

            {bagDurationDays && (
              <div className="purchase-estimates">
                <h4 className="purchase-estimates-title">Estimated</h4>
                <p>This bag should last ~{bagDurationDays} days</p>
                {depletionDate && (
                  <p className="purchase-estimates-sub">
                    (until approximately {depletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </p>
                )}
                {costPerDay && (
                  <p>Cost: ~{fmtMoney(costPerDay)}/day &middot; ~{fmtMoney(costPerMonth)}/month</p>
                )}
              </div>
            )}

            {error && <p className="purchase-modal-error">{error}</p>}

            <button
              type="button"
              className="purchase-submit-btn"
              disabled={submitting || !bagSizeNum || !cupsNum}
              onClick={handleSubmit}
            >
              {submitting ? (editPurchase ? 'Updating...' : 'Logging...') : (editPurchase ? 'Update Purchase' : 'Log Purchase')}
            </button>

            {!preselectedProduct && (
              <button type="button" className="purchase-back-btn" onClick={() => setStep(1)}>
                &larr; Choose a different product
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogPurchaseModal;
