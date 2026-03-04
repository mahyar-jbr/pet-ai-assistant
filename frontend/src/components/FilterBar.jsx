import { useState, useEffect, useRef, useCallback } from 'react';

const SORT_OPTIONS = [
  { value: 'default', label: 'Recommended' },
  { value: 'price-low', label: 'Price: Low → High' },
  { value: 'price-high', label: 'Price: High → Low' },
  { value: 'protein-high', label: 'Protein: High → Low' },
  { value: 'fat-low', label: 'Fat: Low → High' },
];

const FilterBar = ({
  availableBrands,
  selectedBrands,
  toggleBrand,
  availableProteins,
  selectedProteins,
  toggleProtein,
  grainFreeOnly,
  setGrainFreeOnly,
  priceRanges,
  priceRangeIndex,
  setPriceRangeIndex,
  sortOption,
  setSortOption,
  activeFilterChips,
  removeFilterChip,
}) => {
  const [openFilter, setOpenFilter] = useState(null);
  const barRef = useRef(null);

  const close = useCallback(() => setOpenFilter(null), []);

  // Close on click-outside
  useEffect(() => {
    if (!openFilter) return;
    const handleClick = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openFilter, close]);

  // Close on Escape
  useEffect(() => {
    if (!openFilter) return;
    const handleKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [openFilter, close]);

  const toggle = (name) => setOpenFilter((prev) => (prev === name ? null : name));

  const brandCount = selectedBrands.size;
  const proteinCount = selectedProteins.size;
  const priceActive = priceRangeIndex > 0;
  const sortActive = sortOption !== 'default';

  return (
    <div className="filter-row-wrap" ref={barRef}>
      <div className="filter-row">
        {/* Brand */}
        {availableBrands.length > 1 && (
          <div className="filter-btn-wrap">
            <button
              type="button"
              className={`filter-btn${brandCount ? ' active' : ''}`}
              onClick={() => toggle('brand')}
              aria-expanded={openFilter === 'brand'}
            >
              Brand{brandCount ? ` (${brandCount})` : ''}
              <ChevronIcon />
            </button>
            {openFilter === 'brand' && (
              <div className="filter-popover" role="listbox" aria-label="Brand filter">
                {availableBrands.map((brand) => (
                  <label key={brand} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedBrands.has(brand)}
                      onChange={() => toggleBrand(brand)}
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Protein */}
        {availableProteins.length > 1 && (
          <div className="filter-btn-wrap">
            <button
              type="button"
              className={`filter-btn${proteinCount ? ' active' : ''}`}
              onClick={() => toggle('protein')}
              aria-expanded={openFilter === 'protein'}
            >
              Protein{proteinCount ? ` (${proteinCount})` : ''}
              <ChevronIcon />
            </button>
            {openFilter === 'protein' && (
              <div className="filter-popover" role="listbox" aria-label="Protein filter">
                {availableProteins.map((p) => (
                  <label key={p.name} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedProteins.has(p.name)}
                      onChange={() => toggleProtein(p.name)}
                    />
                    <span>{p.name.charAt(0).toUpperCase() + p.name.slice(1)}</span>
                    <span className="filter-option-count">{p.count}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grain-Free toggle */}
        <button
          type="button"
          className={`filter-btn filter-btn-toggle${grainFreeOnly ? ' active' : ''}`}
          onClick={() => setGrainFreeOnly((prev) => !prev)}
        >
          Grain-Free
        </button>

        {/* Price */}
        <div className="filter-btn-wrap">
          <button
            type="button"
            className={`filter-btn${priceActive ? ' active' : ''}`}
            onClick={() => toggle('price')}
            aria-expanded={openFilter === 'price'}
          >
            Price{priceActive ? `: ${priceRanges[priceRangeIndex].label}` : ''}
            <ChevronIcon />
          </button>
          {openFilter === 'price' && (
            <div className="filter-popover" role="listbox" aria-label="Price filter">
              {priceRanges.map((range, idx) => (
                idx > 0 && (
                  <label key={range.label} className="filter-option">
                    <input
                      type="radio"
                      name="price-range"
                      checked={priceRangeIndex === idx}
                      onChange={() => { setPriceRangeIndex(idx); close(); }}
                    />
                    <span>{range.label}</span>
                  </label>
                )
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="filter-btn-wrap">
          <button
            type="button"
            className={`filter-btn${sortActive ? ' active' : ''}`}
            onClick={() => toggle('sort')}
            aria-expanded={openFilter === 'sort'}
          >
            Sort{sortActive ? `: ${SORT_OPTIONS.find((o) => o.value === sortOption)?.label || ''}` : ''}
            <ChevronIcon />
          </button>
          {openFilter === 'sort' && (
            <div className="filter-popover" role="listbox" aria-label="Sort options">
              {SORT_OPTIONS.map((opt) => (
                <label key={opt.value} className="filter-option">
                  <input
                    type="radio"
                    name="sort-option"
                    checked={sortOption === opt.value}
                    onChange={() => { setSortOption(opt.value); close(); }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="active-filter-row">
          {activeFilterChips.map((chip) => (
            <span key={`${chip.type}-${chip.value}`} className="active-chip">
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label} filter`}
                onClick={() => removeFilterChip(chip)}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="12" y2="12" />
                  <line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ChevronIcon = () => (
  <svg className="filter-btn-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="4 6 8 10 12 6" />
  </svg>
);

export default FilterBar;
