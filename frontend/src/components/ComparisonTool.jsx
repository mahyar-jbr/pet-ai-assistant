import { useEffect, useMemo, useRef } from 'react';
import { buildComparisonSections, formatCompareLabel, formatProductName } from '../utils/foodUtils';

const ComparisonTool = ({
  foods = [],
  isOpen,
  selectedA,
  selectedB,
  onOpen,
  onClose,
  onSelectChange,
}) => {
  const dialogRef = useRef(null);
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
    }
    return () => document.body.classList.remove('compare-open');
  }, [isOpen]);

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
      >
        <span className="sr-only">Compare Foods</span>
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
                <h3 id="compare-title">Which food is better for your pet?</h3>
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
                <div className="compare-products">
                  <div className="compare-product-card compare-product-a">
                    <div className="compare-product-header">
                      <span className="compare-product-label">Product A</span>
                    </div>
                    <h4 id="compare-name-a" className="compare-product-name">
                      {formatProductName(foodA)}
                    </h4>
                    <p id="compare-brand-a" className="compare-product-brand">
                      {foodA.brand || 'Unknown Brand'}
                    </p>
                  </div>
                  <div className="compare-product-card compare-product-b">
                    <div className="compare-product-header">
                      <span className="compare-product-label">Product B</span>
                    </div>
                    <h4 id="compare-name-b" className="compare-product-name">
                      {formatProductName(foodB)}
                    </h4>
                    <p id="compare-brand-b" className="compare-product-brand">
                      {foodB.brand || 'Unknown Brand'}
                    </p>
                  </div>
                </div>
              )}

              <div id="compare-sections">
                {sections.map((section) => (
                  <div key={section.title} className="compare-section">
                    <div className="compare-section-header">
                      <div className="compare-section-icon">{section.icon}</div>
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
