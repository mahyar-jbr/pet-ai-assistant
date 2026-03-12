import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPet } from '../api/petApi';
import '../styles/form.css';

/* ─── Step configuration ─── */
const TOTAL_STEPS = 7;

const BREED_OPTIONS = [
  { value: 'small', label: 'Small', desc: 'Under 20 lbs / 9 kg', icon: '🐕' },
  { value: 'medium', label: 'Medium', desc: '20–50 lbs / 9–23 kg', icon: '🐕‍🦺' },
  { value: 'large', label: 'Large', desc: 'Over 50 lbs / 23 kg', icon: '🦮' },
];

const AGE_OPTIONS = [
  { value: 'puppy', label: 'Puppy', desc: '0–1 year old', icon: '🐶' },
  { value: 'adult', label: 'Adult', desc: '1–7 years old', icon: '🐕' },
  { value: 'senior', label: 'Senior', desc: '8+ years old', icon: '🐾' },
];

const ACTIVITY_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'Short walks, mostly resting', icon: '😴' },
  { value: 'medium', label: 'Medium', desc: '30–60 min walks daily', icon: '🚶' },
  { value: 'high', label: 'High', desc: '2+ hours active daily', icon: '🏃' },
];

const GOAL_OPTIONS = [
  { value: 'maintenance', label: 'Maintenance', desc: 'Keep current weight & health', icon: '⚖️' },
  { value: 'weight-loss', label: 'Weight Loss', desc: 'Reduce weight safely', icon: '📉' },
  { value: 'muscle-gain', label: 'Muscle Gain', desc: 'Build lean muscle mass', icon: '💪' },
];

const COMMON_ALLERGENS = [
  'chicken', 'beef', 'wheat', 'corn', 'soy', 'dairy', 'eggs', 'fish',
];

const PetForm = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState('forward'); // 'forward' | 'backward'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [toast, setToast] = useState('');

  // Form data
  const [name, setName] = useState('');
  const [breedSize, setBreedSize] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Show toast when redirected from recommendations
  useEffect(() => {
    if (searchParams.get('reason') === 'no-profile') {
      setToast('Please create a pet profile first');
      setSearchParams({}, { replace: true });
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Pre-populate from localStorage for Edit mode
  useEffect(() => {
    const existingData = localStorage.getItem('petData');
    if (existingData) {
      try {
        const petData = JSON.parse(existingData);
        if (petData.name) setName(petData.name);
        if (petData.breedSize) setBreedSize(petData.breedSize);
        if (petData.ageGroup) setAgeGroup(petData.ageGroup);
        if (petData.activityLevel) setActivityLevel(petData.activityLevel);
        if (petData.weightGoal) setWeightGoal(petData.weightGoal);
        if (petData.allergies?.length > 0) {
          setAllergies(petData.allergies.map(a => a.toLowerCase()));
        }
        // If profile exists and has required fields, this is an edit
        if (petData.ageGroup && localStorage.getItem('petId')) {
          setIsEditMode(true);
        }
      } catch (error) {
        console.error('Error loading existing pet data:', error);
      }
    }
  }, []);

  // Navigation helpers
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1: return name.trim().length > 0;
      case 2: return breedSize !== '';
      case 3: return ageGroup !== '';
      case 4: return activityLevel !== '';
      case 5: return weightGoal !== '';
      case 6: return true; // allergies are optional
      case 7: return true; // review — always can submit
      default: return false;
    }
  }, [currentStep, name, breedSize, ageGroup, activityLevel, weightGoal]);

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setDirection('forward');
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, canProceed]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle Enter key to proceed on text inputs
  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canProceed()) goNext();
    }
  };

  // Allergy helpers
  const toggleAllergen = (allergen) => {
    const normalized = allergen.toLowerCase();
    setAllergies(prev =>
      prev.includes(normalized)
        ? prev.filter(a => a !== normalized)
        : [...prev, normalized]
    );
  };

  const addCustomAllergy = () => {
    const value = customAllergyInput.trim().toLowerCase();
    if (value && !allergies.includes(value)) {
      setAllergies(prev => [...prev, value]);
    }
    setCustomAllergyInput('');
  };

  const handleAllergyKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomAllergy();
    }
  };

  const removeAllergy = (allergy) => {
    setAllergies(prev => prev.filter(a => a !== allergy));
  };

  // Submit handler — same API call as before
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    const petData = {
      name: name.trim(),
      ageGroup,
      breedSize,
      activityLevel,
      weightGoal,
      allergies,
      screen_width: window.innerWidth,
    };

    try {
      localStorage.removeItem('petId');
      const result = await createPet(petData);
      localStorage.setItem('petData', JSON.stringify(petData));
      localStorage.setItem('petId', result.id);
      navigate('/recommendations');
    } catch (error) {
      console.error('Error saving pet:', error);
      setSubmitError('There was a problem saving your pet profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Display name for headings (fallback for early steps)
  const displayName = name.trim() || 'your dog';

  /* ─── Render helpers ─── */

  // Reusable option card renderer
  const renderOptionCards = (options, selected, onSelect) => (
    <div className="wizard-options">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`wizard-option-card ${selected === opt.value ? 'selected' : ''}`}
          onClick={() => onSelect(opt.value)}
        >
          <span className="wizard-option-icon">{opt.icon}</span>
          <span className="wizard-option-label">{opt.label}</span>
          <span className="wizard-option-desc">{opt.desc}</span>
        </button>
      ))}
    </div>
  );

  // Step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-question">What's your dog's name?</h2>
            <p className="wizard-hint">We'll personalize everything just for them.</p>
            <input
              type="text"
              className="wizard-name-input"
              placeholder="e.g. Max, Bella, Charlie..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              autoFocus
              maxLength={50}
            />
            {/* Trust signals */}
            <div className="wizard-trust-signals">
              <span className="trust-signal">
                <svg viewBox="0 0 16 16" fill="none" className="trust-icon">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 8l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Brand-independent
              </span>
              <span className="trust-signal">
                <svg viewBox="0 0 16 16" fill="none" className="trust-icon">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 8l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Free, no account needed
              </span>
              <span className="trust-signal">
                <svg viewBox="0 0 16 16" fill="none" className="trust-icon">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 8l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Transparent scoring
              </span>
            </div>
            {/* How it works */}
            <div className="wizard-how-it-works">
              <h4 className="how-it-works-title">How It Works</h4>
              <div className="how-it-works-steps">
                <div className="how-it-works-step">
                  <div className="how-step-number">1</div>
                  <p>Tell us about your dog</p>
                </div>
                <div className="how-it-works-step">
                  <div className="how-step-number">2</div>
                  <p>Our algorithm scores 80+ foods from 3 premium brands</p>
                </div>
                <div className="how-it-works-step">
                  <div className="how-step-number">3</div>
                  <p>Get personalized matches ranked by fit</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-question">How big is {displayName}?</h2>
            <p className="wizard-hint">This helps us find the right kibble size and formula.</p>
            {renderOptionCards(BREED_OPTIONS, breedSize, setBreedSize)}
          </div>
        );

      case 3:
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-question">How old is {displayName}?</h2>
            <p className="wizard-hint">Different life stages need different nutrition.</p>
            {renderOptionCards(AGE_OPTIONS, ageGroup, setAgeGroup)}
          </div>
        );

      case 4:
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-question">How active is {displayName}?</h2>
            <p className="wizard-hint">Activity level determines calorie and protein needs.</p>
            {renderOptionCards(ACTIVITY_OPTIONS, activityLevel, setActivityLevel)}
          </div>
        );

      case 5:
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-question">What's {displayName}'s dietary goal?</h2>
            <p className="wizard-hint">We'll tailor nutritional targets to this goal.</p>
            {renderOptionCards(GOAL_OPTIONS, weightGoal, setWeightGoal)}
          </div>
        );

      case 6:
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-question">Any food allergies?</h2>
            <p className="wizard-hint">We'll exclude foods with these ingredients. Skip if none.</p>

            {/* Common allergen chips */}
            <div className="wizard-allergen-chips">
              {COMMON_ALLERGENS.map(allergen => (
                <button
                  key={allergen}
                  type="button"
                  className={`allergen-chip ${allergies.includes(allergen) ? 'active' : ''}`}
                  onClick={() => toggleAllergen(allergen)}
                >
                  {allergen}
                  {allergies.includes(allergen) && (
                    <svg className="allergen-check" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Custom allergy input */}
            <div className="wizard-custom-allergy">
              <input
                type="text"
                placeholder="Add other allergy..."
                value={customAllergyInput}
                onChange={(e) => setCustomAllergyInput(e.target.value)}
                onKeyDown={handleAllergyKeyDown}
                maxLength={50}
              />
              <button
                type="button"
                className="add-allergy-btn"
                onClick={addCustomAllergy}
                disabled={!customAllergyInput.trim()}
              >
                Add
              </button>
            </div>

            {/* Show custom (non-common) allergies as removable pills */}
            {allergies.filter(a => !COMMON_ALLERGENS.includes(a)).length > 0 && (
              <div className="wizard-custom-pills">
                {allergies.filter(a => !COMMON_ALLERGENS.includes(a)).map(allergy => (
                  <span key={allergy} className="allergy-pill">
                    {allergy}
                    <button type="button" className="remove-pill" onClick={() => removeAllergy(allergy)}>
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="wizard-step-content">
            <h2 className="wizard-question">Here's {displayName}'s profile</h2>
            <p className="wizard-hint">Review the details below, then get your matches!</p>

            <div className="wizard-review-card">
              <div className="review-row">
                <span className="review-label">Name</span>
                <span className="review-value">{name.trim()}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Breed Size</span>
                <span className="review-value">{BREED_OPTIONS.find(o => o.value === breedSize)?.label || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Age Group</span>
                <span className="review-value">{AGE_OPTIONS.find(o => o.value === ageGroup)?.label || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Activity Level</span>
                <span className="review-value">{ACTIVITY_OPTIONS.find(o => o.value === activityLevel)?.label || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Dietary Goal</span>
                <span className="review-value">{GOAL_OPTIONS.find(o => o.value === weightGoal)?.label || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Allergies</span>
                <span className="review-value">
                  {allergies.length > 0 ? allergies.join(', ') : 'None'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container">
      <div className="form-card wizard-card">
        {/* Logo — visible on all steps */}
        <img src="/logo.png" alt="Pet AI Assistant" className="form-logo" />

        {/* Progress bar */}
        <div className="wizard-progress">
          <div className="wizard-progress-bar">
            <div
              className="wizard-progress-fill"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <span className="wizard-progress-text">Step {currentStep} of {TOTAL_STEPS}</span>
        </div>

        {/* Step content with transition */}
        <div className={`wizard-step wizard-${direction}`} key={currentStep}>
          {renderStep()}
        </div>

        {/* Inline error banner */}
        {submitError && (
          <div className="wizard-error-banner">
            <svg className="wizard-error-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#dc2626" strokeWidth="1.5" />
              <line x1="10" y1="6" x2="10" y2="11" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="14" r="1" fill="#dc2626" />
            </svg>
            <span className="wizard-error-text">{submitError}</span>
            <button
              type="button"
              className="wizard-error-dismiss"
              onClick={() => setSubmitError('')}
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}

        {/* Back to Results — visible in edit mode */}
        {isEditMode && (
          <button type="button" className="wizard-cancel-btn" onClick={() => navigate('/recommendations')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Results
          </button>
        )}

        {/* Navigation buttons */}
        <div className="wizard-nav">
          {currentStep > 1 && (
            <button type="button" className="wizard-back-btn" onClick={goBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="wizard-back-icon">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          )}
          <div className="wizard-nav-spacer" />
          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              className="wizard-next-btn"
              onClick={goNext}
              disabled={!canProceed()}
            >
              {currentStep === 6 ? (allergies.length === 0 ? 'Skip' : 'Next') : 'Next'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="wizard-next-icon">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className={`wizard-submit-btn ${isSubmitting ? 'loading' : ''}`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Finding matches...' : `Get ${displayName}'s Recommendations`}
            </button>
          )}
        </div>

        {/* Takes 60 seconds notice on step 1 */}
        {currentStep === 1 && (
          <p className="wizard-time-notice">Takes about 60 seconds</p>
        )}
      </div>
      {/* Redirect toast */}
      {toast && (
        <div className="form-toast" role="alert">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="7" />
            <line x1="8" y1="5" x2="8" y2="8.5" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" stroke="none" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
};

export default PetForm;
