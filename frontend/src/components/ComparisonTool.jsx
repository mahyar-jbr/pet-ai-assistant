import { useEffect, useMemo, useRef, useCallback } from 'react';
import { buildComparisonSections, formatCompareLabel, formatProductName } from '../utils/foodUtils';
import ScoreRing from './ScoreRing';

const SECTION_ICONS = {
  star: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l1.85 3.75 4.15.6-3 2.93.71 4.12L8 10.88 4.29 12.9l.71-4.12-3-2.93 4.15-.6L8 1.5z" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 1.5h5.59l7.41 7.41-5.59 5.59-7.41-7.41V1.5z" />
      <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1.5h4M6.5 1.5v4.5L2 14.5h12L9.5 6V1.5" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2" width="11" height="12.5" rx="1.5" />
      <path d="M5.5 1.5h5v2h-5z" />
      <line x1="5.5" y1="7" x2="10.5" y2="7" />
      <line x1="5.5" y1="9.5" x2="10.5" y2="9.5" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="8" width="3" height="6.5" rx="0.5" />
      <rect x="6.5" y="4" width="3" height="10.5" rx="0.5" />
      <rect x="11.5" y="1.5" width="3" height="13" rx="0.5" />
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14.5S2 8 8 4c4-2.5 6.5-2.5 6.5-2.5S14 6 10 10c-2.5 2.5-8 4.5-8 4.5z" />
      <path d="M2 14.5C5 11.5 8 9 10 7" />
    </svg>
  ),
};

const ComparisonTool = ({
  foods = [],
  isOpen,
  selectedA,
  selectedB,
  onOpen,
  onClose,
  onSelectChange,
  petName = '',
}) => {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const badgeCount = useMemo(() => {
    const unique = new Set([selectedA, selectedB].filter(Boolean));
    return unique.size;
  }, [selectedA, selectedB]);

  const options = useMemo(() => {
    return foods
      .map((food) => ({
        value: food.compareId,
        label: formatCompareLabel(food) || 'Unnamed Food',
        food,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [foods]);

  const foodA = useMemo(
    () => options.find((option) => option.value === selectedA)?.food,
    [options, selectedA]
  );
  const foodB = useMemo(
    () => options.find((option) => option.value === selectedB)?.food,
    [options, selectedB]
  );

  const sections = useMemo(() => {
    if (!foodA || !foodB || foodA.compareId === foodB.compareId) return [];
    return buildComparisonSections(foodA, foodB);
  }, [foodA, foodB]);

  // Tally winner counts across all sections
  const winnerSummary = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    sections.forEach((section) => {
      section.rows.forEach((row) => {
        if (row.winnerA) winsA++;
        if (row.winnerB) winsB++;
      });
    });
    return { winsA, winsB };
  }, [sections]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('compare-open');
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else {
      document.body.classList.remove('compare-open');
      // Return focus to the trigger button when modal closes
      triggerRef.current?.focus();
    }
    return () => document.body.classList.remove('compare-open');
  }, [isOpen]);

  // Focus trap: keep Tab cycling within the modal while open
  const handleDialogKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === dialogRef.current) {
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

  const handleToggle = () => {
    if (isOpen) onClose();
    else onOpen();
  };

  const handleBackdropClick = (event) => {
    if (event.target.classList.contains('compare-backdrop')) {
      onClose();
    }
  };

  const handleSelectA = (event) => {
    onSelectChange({ primary: event.target.value });
  };

  const handleSelectB = (event) => {
    onSelectChange({ secondary: event.target.value });
  };

  return (
    <>
      <button
        type="button"
        id="compare-toggle"
        className="compare-toggle"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleToggle}
        ref={triggerRef}
      >
        <svg
          className="compare-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="compare-label">Compare</span>
        <span className={`compare-badge ${badgeCount > 0 ? 'active' : ''}`} id="compare-count">
          {badgeCount}
        </span>
      </button>

      <div
        id="compare-modal"
        className="compare-modal"
        hidden={!isOpen}
        onClick={handleBackdropClick}
      >
        <div className="compare-backdrop" />
        <div
          className="compare-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-title"
          tabIndex={-1}
          ref={dialogRef}
          onKeyDown={handleDialogKeyDown}
        >
          <header className="compare-header">
            <div className="compare-header-content">
              <div className="compare-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="9" r="4" />
                  <circle cx="15" cy="15" r="4" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <p className="compare-eyebrow">Side-by-side comparison</p>
                <h3 id="compare-title">Which food is better for {petName || 'your pet'}?</h3>
              </div>
            </div>
            <button
              type="button"
              id="compare-close"
              className="compare-close"
              aria-label="Close comparison"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <section className="compare-picker">
            <div className="compare-column">
              <label htmlFor="compare-select-a">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fill="currentColor"
                    stroke="none"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    A
                  </text>
                </svg>
                First Product
              </label>
              <select id="compare-select-a" value={selectedA} onChange={handleSelectA}>
                <option value="">Select food…</option>
                {options.map((option) => (
                  <option
                    key={`compare-opt-a-${option.value}`}
                    value={option.value}
                    disabled={option.value === selectedB}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="compare-vs">
              <span>VS</span>
            </div>
            <div className="compare-column">
              <label htmlFor="compare-select-b">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fill="currentColor"
                    stroke="none"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    B
                  </text>
                </svg>
                Second Product
              </label>
              <select id="compare-select-b" value={selectedB} onChange={handleSelectB}>
                <option value="">Select food…</option>
                {options.map((option) => (
                  <option
                    key={`compare-opt-b-${option.value}`}
                    value={option.value}
                    disabled={option.value === selectedA}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="compare-results" id="compare-results">
            <div className="compare-empty" id="compare-empty" hidden={sections.length > 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="9" r="2" />
                <circle cx="15" cy="15" r="2" />
                <path d="M9 9l6 6" />
              </svg>
              <h4>Ready to Compare</h4>
              <p>Select two different foods above to see a detailed side-by-side comparison</p>
            </div>
            <div className="compare-content" id="compare-content" hidden={sections.length === 0}>
              {foodA && foodB && (
                <>
                  <div className="compare-products">
                    <div className={`compare-product-card compare-product-a ${winnerSummary.winsA > winnerSummary.winsB ? 'overall-winner' : ''}`}>
                      <div className="compare-product-header">
                        <span className="compare-product-label">Product A</span>
                        {Number.isFinite(foodA.matchScore) && foodA.matchScore > 0 && (
                          <ScoreRing score={foodA.matchScore} compareId={foodA.compareId} />
                        )}
                      </div>
                      <img
                        className="compare-product-img"
                        src={foodA.image || 'https://via.placeholder.com/220?text=Dog+Food'}
                        alt={foodA.line || foodA.id}
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/220?text=Dog+Food'; }}
                      />
                      <h4 id="compare-name-a" className="compare-product-name">
                        {formatProductName(foodA)}
                      </h4>
                      <p id="compare-brand-a" className="compare-product-brand">
                        {foodA.brand || 'Unknown Brand'}
                      </p>
                      {foodA.matchReasons && foodA.matchReasons.length > 0 && (
                        <div className="compare-product-reasons">
                          {foodA.matchReasons.slice(0, 3).map((reason, i) => (
                            <span key={i} className="compare-reason-chip">
                              <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M5.5 8l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                      {winnerSummary.winsA > winnerSummary.winsB && (
                        <div className="compare-winner-badge">
                          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                            <path d="M8 1l2.18 4.41L15 6.11l-3.5 3.41.83 4.82L8 12.01l-4.33 2.33.83-4.82L1 6.11l4.82-.7L8 1z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
                          </svg>
                          Winner ({winnerSummary.winsA} categories)
                        </div>
                      )}
                    </div>
                    <div className={`compare-product-card compare-product-b ${winnerSummary.winsB > winnerSummary.winsA ? 'overall-winner' : ''}`}>
                      <div className="compare-product-header">
                        <span className="compare-product-label">Product B</span>
                        {Number.isFinite(foodB.matchScore) && foodB.matchScore > 0 && (
                          <ScoreRing score={foodB.matchScore} compareId={foodB.compareId} />
                        )}
                      </div>
                      <img
                        className="compare-product-img"
                        src={foodB.image || 'https://via.placeholder.com/220?text=Dog+Food'}
                        alt={foodB.line || foodB.id}
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/220?text=Dog+Food'; }}
                      />
                      <h4 id="compare-name-b" className="compare-product-name">
                        {formatProductName(foodB)}
                      </h4>
                      <p id="compare-brand-b" className="compare-product-brand">
                        {foodB.brand || 'Unknown Brand'}
                      </p>
                      {foodB.matchReasons && foodB.matchReasons.length > 0 && (
                        <div className="compare-product-reasons">
                          {foodB.matchReasons.slice(0, 3).map((reason, i) => (
                            <span key={i} className="compare-reason-chip">
                              <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M5.5 8l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                      {winnerSummary.winsB > winnerSummary.winsA && (
                        <div className="compare-winner-badge">
                          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                            <path d="M8 1l2.18 4.41L15 6.11l-3.5 3.41.83 4.82L8 12.01l-4.33 2.33.83-4.82L1 6.11l4.82-.7L8 1z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
                          </svg>
                          Winner ({winnerSummary.winsB} categories)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Winner summary bar */}
                  {(winnerSummary.winsA > 0 || winnerSummary.winsB > 0) && (
                    <div className="compare-summary-bar">
                      <div className="compare-summary-side compare-summary-a">
                        <span className="compare-summary-count">{winnerSummary.winsA}</span>
                        <span className="compare-summary-text">wins</span>
                      </div>
                      <div className="compare-summary-vs">VS</div>
                      <div className="compare-summary-side compare-summary-b">
                        <span className="compare-summary-count">{winnerSummary.winsB}</span>
                        <span className="compare-summary-text">wins</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div id="compare-sections">
                {sections.map((section) => (
                  <div key={section.title} className="compare-section">
                    <div className="compare-section-header">
                      <div className="compare-section-icon">{SECTION_ICONS[section.icon] || section.icon}</div>
                      <h3 className="compare-section-title">{section.title}</h3>
                    </div>
                    <div className="compare-section-rows">
                      {section.rows.map((row, index) => (
                        <div key={`${section.title}-${row.label}-${index}`} className="compare-row">
                          <div className="compare-row-label">{row.label}</div>
                          <div
                            className={`compare-row-value ${row.winnerA ? 'winner' : ''} ${
                              !row.valueA || row.valueA === '—' ? 'empty' : ''
                            }`}
                          >
                            {row.valueA || '—'}
                          </div>
                          <div
                            className={`compare-row-value ${row.winnerB ? 'winner' : ''} ${
                              !row.valueB || row.valueB === '—' ? 'empty' : ''
                            }`}
                          >
                            {row.valueB || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default ComparisonTool;
