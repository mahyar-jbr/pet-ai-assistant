/* =======================================
   CONFIG
======================================= */
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGY9w6n0sjw341N8bHRAsczyRqP9MCim6QZuRX8sAs6YVkpg8x6rVMW6B7DvuX750HiClYKokdJgbr/pub?gid=107126253&single=true&output=csv&cachebust="
  + Date.now(); // cache-bust so edits show up immediately

const PLACEHOLDER_IMG = 'https://via.placeholder.com/220?text=Dog+Food';
let activeFoodCard = null;
let allFoods = [];
const foodLookup = new Map();
let compareEls = null;
let compareModalOpen = false;
let compareIdCounter = 0;
let compareReturnFocus = null;

/* =======================================
   BOOTSTRAP
======================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const petData = JSON.parse(localStorage.getItem('petData') || '{}');
  if (!petData || !petData.ageGroup) return;

  // Profile header
  byId('pet-name').textContent     = petData.name || 'Unknown Pet';
  byId('pet-breed').textContent    = capitalize(petData.breedSize);
  byId('pet-age').textContent      = formatAgeGroup(petData.ageGroup);
  byId('pet-activity').textContent = capitalize(petData.activityLevel);
  byId('pet-goal').textContent     = formatGoal(petData.weightGoal);

  // Allergies (display-only pills)
  const allergies = (petData.allergies || []).map(a => String(a).toLowerCase());
  byId('allergy-list').innerHTML = allergies.length
    ? allergies.map(createDisplayOnlyPill).map(p => p.outerHTML).join('')
    : '<span class="no-allergies">None reported</span>';

  // Section ordering based on goal
  arrangeSections((petData.weightGoal || '').toLowerCase());

  ensureCompareControls();

  // Load + normalize data
  const rows  = await fetchCSV(SHEET_CSV_URL);
  const foods = rows.map(enrichRow);

  // Store globally for sorting/filtering
  allFoods = foods;

  // Clear any placeholders, render cards
  document.querySelectorAll('.food-grid').forEach(g => g.innerHTML = '');
  foods.forEach(mountCard);

  // Filter by profile + tidy sections
  filterFoodCards(petData);
  hideEmptySections();
  updateResultsCount();

  initializeComparison(foods);
  initializeSortingControls();

  // Edit link
  const editBtn = byId('edit-btn');
  if (editBtn) editBtn.addEventListener('click', () => (window.location.href = 'index.html'));
});

/* =======================================
   FETCH & PARSE
======================================= */
async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: res => resolve(res.data || []),
      error: reject
    });
  });
}

/* =======================================
   NORMALIZE ROWS FROM SHEET
   (to a minimal, card-friendly shape)
======================================= */
const KG_TO_LB = 2.20462;
function parsePrice(val){
  if (val == null) return NaN;
  const n = String(val).replace(/[^0-9.,-]/g,'').replace(',', '.');
  return parseFloat(n);
}
function fmtMoney(n, sym='$'){ return isNaN(n) ? '' : sym + n.toFixed(2); }

function enrichRow(row){
  // tags = union of author tags + derived tags
  const base      = parseTags(row.tags);
  const allergens = parseTags(row.allergen_tags);
  const final = new Set([
    ...base,
    ...allergens,
    ...formToTag(row.format),
    ...stageToTag(row.life_stage),
    ...sizeToTag(row.breed_size),
  ]);
  // alias
  if (final.has('weight-loss')) { final.delete('weight-loss'); final.add('low-fat'); }

  const tags     = Array.from(final);
  const section  = (row.section || '').toLowerCase() || deriveSectionFromTags(tags);
  const price    = parsePrice(row.price);
  const bagLb    = row.size_kg ? parseFloat(row.size_kg) * KG_TO_LB : NaN;
  const unitPrice= (!isNaN(price) && !isNaN(bagLb) && bagLb > 0) ? (price / bagLb) : NaN;
  const name     = row.line || row.id || '';
  const compareId= createCompareId(row);

  return {
    id:   row.id,
    brand: (row.brand || '').trim(),
    line: row.line,
    description: row.description || row.why || '',
    image: row.image || '',
    url:   row.url || '',
    price, bagLb, unitPrice,
    tags, section,
    compareId,
    detail: {
      name,
      ingredients: pickFirst(row, ['ingredients', 'ingredient_list', 'ingredients_list']),
      feeding: extractFacts(row),
      analysis: extractAnalysis(row),
      statement: pickFirst(row, ['aafco_statement','aafco']),
      notes: row.notes || ''
    },
    raw: row
  };
}

/* =======================================
   TAG HELPERS
======================================= */
function parseTags(raw){
  return String(raw || '')
    .toLowerCase()
    .replace(/\s+/g,' ')
    .split(/[,\s]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t
      .replace('low fat','low-fat')
      .replace('high protein','high-protein')
      .replace('high calorie','high-calorie')
      .replace(/^eggs$/, 'egg')
    );
}
function sizeToTag(size){
  const s = String(size || '').toLowerCase();
  if (s.includes('small'))  return ['small'];
  if (s.includes('medium')) return ['regular']; // normalize
  if (s.includes('giant'))  return ['giant'];
  if (s.includes('large'))  return ['large'];
  return [];
}
function stageToTag(stage){
  const s = String(stage || '').toLowerCase();
  if (s.includes('puppy'))  return ['puppy'];
  if (s.includes('senior')) return ['senior'];
  return s ? ['adult'] : [];
}
function formToTag(fmt){
  const f = String(fmt || '').toLowerCase();
  if (f.includes('dry')) return ['dry'];
  if (f.includes('wet')) return ['wet'];
  if (f.includes('raw')) return ['raw'];
  return [];
}
function deriveSectionFromTags(tags){
  const set = new Set(tags);
  if (set.has('high-protein')) return 'high-protein';
  if (set.has('low-fat'))      return 'low-fat';
  if (set.has('high-calorie')) return 'high-calorie';
  if (set.has('most-popular')) return 'most-popular';
  if (set.has('best-value'))   return 'best-value';
  return '';
}

/* =======================================
   CARD RENDERING
======================================= */
const PRIMARY_TAGS = new Set(['high-protein','low-fat','high-calorie','most-popular','best-value']);
const AGE_TAGS     = new Set(['puppy','adult','senior']);
const SIZE_TAGS    = new Set(['small','regular','large','giant']);
const FORM_TAGS    = new Set(['dry','wet','raw']);

function normalizeProfileSize(size){
  const s = (size || '').toLowerCase();
  return s === 'medium' ? 'regular' : s;
}

function splitTagsForDisplay(tags, profile){
  const primary = tags.filter(t => PRIMARY_TAGS.has(t));

  const profAge  = (profile?.ageGroup || '').toLowerCase();
  const profSize = normalizeProfileSize(profile?.breedSize);

  const age  = tags.find(t => AGE_TAGS.has(t));
  const size = tags.find(t => SIZE_TAGS.has(t));

  // only show when it differs from the user's profile
  const showAge  = age  && age  !== profAge  && age !== 'adult';
  const showSize = size && size !== profSize;

  // ingredients/attributes (exclude primary/age/size/form)
  const ingredients = tags.filter(t =>
    !PRIMARY_TAGS.has(t) && !AGE_TAGS.has(t) && !SIZE_TAGS.has(t) && !FORM_TAGS.has(t)
  );

  return { primary, age: showAge ? age : null, size: showSize ? size : null, ingredients };
}

function reasonsForMatch(profile, tags){
  const r = [];
  const goal = (profile?.weightGoal || '').toLowerCase();
  if (goal === 'muscle-gain' && tags.includes('high-protein')) r.push('High-protein for conditioning');
  if (goal === 'weight-loss' && tags.includes('low-fat'))       r.push('Lower fat to aid weight control');
  if (tags.includes('joint-support')) r.push('Supports joint health');
  if (tags.includes('grain-free'))    r.push('Grain-free formula');
  return r.slice(0, 2);
}

function createCard(food){
  const el = document.createElement('div');
  el.className = 'food-card better-card';
  el.dataset.tags = (food.tags || []).join(', ');
  el.dataset.foodId = food.compareId || food.id || food.line || food.brand || '';

  const title   = food.line || food.id || 'Unnamed Product';
  const imgSrc  = food.image || 'https://via.placeholder.com/96';
  const priceLn = (!isNaN(food.price) && !isNaN(food.bagLb))
    ? `${fmtMoney(food.price)} / ${food.bagLb.toFixed(food.bagLb % 1 ? 1 : 0)}lb`
    : (!isNaN(food.price) ? fmtMoney(food.price) : '');
  const unitLn  = (!isNaN(food.unitPrice)) ? ` (${fmtMoney(food.unitPrice)}/lb)` : '';

  const profile = JSON.parse(localStorage.getItem('petData') || '{}');
  const { primary, age, size, ingredients } = splitTagsForDisplay(food.tags || [], profile);
  const reasons = reasonsForMatch(profile, food.tags || []);
  const shownIngr = ingredients.slice(0, 4);
  const moreCnt   = Math.max(0, ingredients.length - shownIngr.length);

  const open  = food.url ? `<a class="thumb" href="${food.url}" target="_blank" rel="noopener">` : `<div class="thumb">`;
  const close = food.url ? `</a>` : `</div>`;

  const eyebrow = food.brand
    ? `<div class="eyebrow"><span class="brand-eyebrow">${food.brand}</span></div>`
    : '';

  const detailPanelHTML = renderDetailPanel(food);
  const nutritionHTML = renderNutritionIndicators(food);

  el.innerHTML = `
    <div class="card-quick-actions">
      <button class="quick-action-btn" data-action="favorite" title="Add to favorites" aria-label="Add to favorites">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>
      <button class="quick-action-btn" data-action="compare" title="Add to comparison" aria-label="Add to comparison">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
    <div class="card-top">
      ${open}
        <img loading="lazy" src="${imgSrc}" alt="${title}"
             onerror="this.onerror=null;this.src='https://via.placeholder.com/96';">
      ${close}
      <div class="main">
        <div class="header">
          ${eyebrow}
          <h4 class="title">${title}</h4>
        </div>
        <div class="price-line">
          ${priceLn ? `<span class="price">${priceLn}</span>` : ''}
          ${unitLn ? `<span class="unit">${unitLn}</span>` : ''}
        </div>
        ${reasons.length ? `<p class="why">${reasons.join(' · ')}</p>` : ''}
        <div class="badges">
          ${primary.map(b => `<span class="badge badge-accent">${b.replace('-', ' ')}</span>`).join('')}
          ${age  ? `<span class="badge">${age}</span>`   : ''}
          ${size ? `<span class="badge">${size}</span>` : ''}
        </div>
        ${nutritionHTML}
        <div class="chips">
          ${shownIngr.map(t => `<span class="chip">${t}</span>`).join('')}
          ${moreCnt ? `<span class="chip more" title="${ingredients.join(', ')}">+${moreCnt}</span>` : ''}
        </div>
      </div>
      ${food.url ? `<div class="cta"><a class="btn" href="${food.url}" target="_blank" rel="noopener">View</a></div>` : ''}
    </div>
    ${detailPanelHTML}
  `;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-expanded', 'false');
  el.tabIndex = 0;
  el.addEventListener('click', evt => {
    if (evt.target.closest('a')) return;
    if (evt.target.closest('.quick-action-btn')) {
      handleQuickAction(evt, food, el);
      return;
    }
    handleFoodSelection(el);
  });
  el.addEventListener('keydown', evt => {
    if (evt.target.closest('a, button')) return;
    if (evt.key === 'Enter' || evt.key === ' ' || evt.key === 'Spacebar'){
      evt.preventDefault();
      handleFoodSelection(el);
    }
  });
  return el;
}

function renderNutritionIndicators(food){
  const analysis = food.detail?.analysis || [];
  const indicators = [];

  const protein = analysis.find(item => item.label?.toLowerCase().includes('protein'));
  const fat = analysis.find(item => item.label?.toLowerCase().includes('fat'));
  const fiber = analysis.find(item => item.label?.toLowerCase().includes('fiber'));

  if (protein && protein.value) {
    indicators.push(`
      <div class="nutrition-badge protein">
        <div class="nutrition-badge-icon">P</div>
        <span class="nutrition-badge-label">Protein</span>
        <span class="nutrition-badge-value">${protein.value}${protein.value.includes('%') ? '' : '%'}</span>
      </div>
    `);
  }

  if (fat && fat.value) {
    indicators.push(`
      <div class="nutrition-badge fat">
        <div class="nutrition-badge-icon">F</div>
        <span class="nutrition-badge-label">Fat</span>
        <span class="nutrition-badge-value">${fat.value}${fat.value.includes('%') ? '' : '%'}</span>
      </div>
    `);
  }

  if (fiber && fiber.value) {
    indicators.push(`
      <div class="nutrition-badge fiber">
        <div class="nutrition-badge-icon">Fb</div>
        <span class="nutrition-badge-label">Fiber</span>
        <span class="nutrition-badge-value">${fiber.value}${fiber.value.includes('%') ? '' : '%'}</span>
      </div>
    `);
  }

  return indicators.length ? `<div class="nutrition-indicators">${indicators.join('')}</div>` : '';
}

function handleQuickAction(evt, food, card){
  evt.stopPropagation();
  const btn = evt.target.closest('.quick-action-btn');
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === 'favorite') {
    btn.classList.toggle('active');
    const isFavorite = btn.classList.contains('active');

    // Store favorites in localStorage
    const favorites = JSON.parse(localStorage.getItem('favoriteFoods') || '[]');
    const foodId = food.compareId || food.id;

    if (isFavorite) {
      if (!favorites.includes(foodId)) {
        favorites.push(foodId);
      }
      btn.title = 'Remove from favorites';
      btn.setAttribute('aria-label', 'Remove from favorites');
    } else {
      const index = favorites.indexOf(foodId);
      if (index > -1) {
        favorites.splice(index, 1);
      }
      btn.title = 'Add to favorites';
      btn.setAttribute('aria-label', 'Add to favorites');
    }

    localStorage.setItem('favoriteFoods', JSON.stringify(favorites));
  } else if (action === 'compare') {
    openCompareModal();
  }
}

function mountCard(food){
  const secName = (food.section || '').toLowerCase();
  const target =
    document.querySelector(`#section-${secName} .food-grid`) ||
    document.querySelector('#section-most-popular .food-grid');
  if (target) target.appendChild(createCard(food));
}

/* =======================================
   PAGE BEHAVIORS
======================================= */
function arrangeSections(goal){
  const wrap        = q('.food-recommendations');
  const mostPopular = byId('section-most-popular');
  const bestValue   = byId('section-best-value');
  const lowFat      = byId('section-low-fat');
  const highProtein = byId('section-high-protein');

  wrap.querySelectorAll('.food-section').forEach(s => s.remove());

  if (goal === 'weight-loss' && lowFat){
    lowFat.style.display = 'block';
    wrap.appendChild(lowFat);
    if (mostPopular) wrap.appendChild(mostPopular);
    if (bestValue)   wrap.appendChild(bestValue);
    if (highProtein) highProtein.style.display = 'none';
    return;
  }
  if (goal === 'muscle-gain' && highProtein){
    highProtein.style.display = 'block';
    wrap.appendChild(highProtein);
    if (mostPopular) wrap.appendChild(mostPopular);
    if (bestValue)   wrap.appendChild(bestValue);
    if (lowFat)      lowFat.style.display = 'none';
    return;
  }
  if (mostPopular) wrap.appendChild(mostPopular);
  if (bestValue)   wrap.appendChild(bestValue);
  if (lowFat)      lowFat.style.display = 'none';
  if (highProtein) highProtein.style.display = 'none';
}

function filterFoodCards(petData){
  const age       = (petData.ageGroup  || '').toLowerCase();
  const breedSize = (petData.breedSize || '').toLowerCase();
  const allergies = (petData.allergies || []).map(a => a.toLowerCase());

  document.querySelectorAll('.food-card').forEach(card => {
    const tags = parseTags(card.dataset.tags);
    let ok = true;

    // Age
    if (age === 'puppy')         ok = ok && tags.includes('puppy');
    else if (age === 'senior')   ok = ok && tags.includes('senior');
    else if (tags.includes('puppy') || tags.includes('senior')) ok = false; // adult profile

    // Size (medium behaves like "regular")
    if (breedSize === 'small')   ok = ok && (tags.includes('small') || tags.includes('regular'));
    if (breedSize === 'large' || breedSize === 'giant')
                                 ok = ok && (tags.includes('large') || tags.includes('regular'));
    if (breedSize === 'medium')  ok = ok && tags.includes('regular');

    // Allergies exclude
    if (allergies.length && tags.some(t => allergies.includes(t))) ok = false;

    if (!ok){
      if (card === activeFoodCard){
        collapseCard(card);
        activeFoodCard = null;
      }
      card.style.display = 'none';
    } else {
      card.style.display = 'block';
    }
  });
  updateComparisonOptions();
  updateResultsCount();
}

function hideEmptySections(){
  ['section-most-popular','section-best-value','section-low-fat','section-high-protein'].forEach(id => {
    const section = byId(id);
    if (!section) return;
    const visible = section.querySelectorAll('.food-card:not([style*="display: none"])');
    section.style.display = visible.length ? 'block' : 'none';
  });
}

/* =======================================
   COMPARISON UI
======================================= */
function ensureCompareControls(){
  if (compareEls) return compareEls;
  const toggle    = byId('compare-toggle');
  const modal     = byId('compare-modal');
  const backdrop  = byId('compare-backdrop');
  const closeBtn  = byId('compare-close');
  const selectA   = byId('compare-select-a');
  const selectB   = byId('compare-select-b');
  const empty     = byId('compare-empty');
  const content   = byId('compare-content');
  const sections  = byId('compare-sections');
  const nameA     = byId('compare-name-a');
  const nameB     = byId('compare-name-b');
  const brandA    = byId('compare-brand-a');
  const brandB    = byId('compare-brand-b');
  const dialog    = modal ? modal.querySelector('.compare-dialog') : null;
  if (!toggle || !modal || !selectA || !selectB) return null;

  compareEls = {
    toggle,
    modal,
    backdrop,
    closeBtn,
    selectA,
    selectB,
    empty,
    content,
    sections,
    nameA,
    nameB,
    brandA,
    brandB,
    dialog
  };

  toggle.addEventListener('click', openCompareModal);
  closeBtn?.addEventListener('click', closeCompareModal);
  backdrop?.addEventListener('click', closeCompareModal);
  selectA.addEventListener('change', renderComparison);
  selectB.addEventListener('change', renderComparison);
  document.addEventListener('keydown', onCompareKeydown);
  return compareEls;
}

function initializeComparison(foods){
  const els = ensureCompareControls();
  foodLookup.clear();
  allFoods = Array.isArray(foods) ? foods.slice() : [];
  allFoods.forEach((food, idx) => {
    if (!food.compareId) food.compareId = createCompareId(food.raw || {}, idx);
    foodLookup.set(food.compareId, food);
  });

  allFoods.sort((a, b) => formatCompareLabel(a).localeCompare(formatCompareLabel(b)));

  if (!els) return;
  updateComparisonOptions(true);
}

function openCompareModal(){
  const els = ensureCompareControls();
  if (!els) return;
  compareReturnFocus = document.activeElement;
  compareModalOpen = true;
  els.modal.hidden = false;
  document.body.classList.add('compare-open');
  els.toggle?.setAttribute('aria-expanded', 'true');
  updateComparisonOptions();
  renderComparison();
  requestAnimationFrame(() => els.dialog?.focus());
}

function closeCompareModal(){
  if (!compareModalOpen || !compareEls) return;
  compareModalOpen = false;
  compareEls.modal.hidden = true;
  document.body.classList.remove('compare-open');
  compareEls.toggle?.setAttribute('aria-expanded', 'false');
  (compareReturnFocus || compareEls.toggle)?.focus();
  compareReturnFocus = null;
}

function onCompareKeydown(event){
  if (event.key === 'Escape' && compareModalOpen){
    closeCompareModal();
  }
}

function renderComparison(){
  if (!compareEls) return;
  const idA = compareEls.selectA.value;
  const idB = compareEls.selectB.value;
  const foodA = foodLookup.get(idA);
  const foodB = foodLookup.get(idB);

  if (!foodA || !foodB){
    compareEls.content.hidden = true;
    compareEls.empty.hidden = false;
    return;
  }
  if (foodA.compareId === foodB.compareId){
    compareEls.content.hidden = true;
    compareEls.empty.hidden = false;
    return;
  }

  // Update product headers
  compareEls.nameA.textContent = formatProductName(foodA);
  compareEls.nameB.textContent = formatProductName(foodB);
  compareEls.brandA.textContent = cleanText(foodA.brand) || 'Unknown Brand';
  compareEls.brandB.textContent = cleanText(foodB.brand) || 'Unknown Brand';

  // Build comparison sections
  const sections = buildComparisonSections(foodA, foodB);
  compareEls.sections.innerHTML = '';

  sections.forEach(section => {
    if (!section || !section.rows.length) return;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'compare-section';

    const header = document.createElement('div');
    header.className = 'compare-section-header';
    header.innerHTML = `
      <div class="compare-section-icon">${section.icon}</div>
      <h3 class="compare-section-title">${section.title}</h3>
    `;
    sectionEl.appendChild(header);

    const rowsContainer = document.createElement('div');
    rowsContainer.className = 'compare-section-rows';

    section.rows.forEach(row => {
      if (!row) return;
      const rowEl = document.createElement('div');
      rowEl.className = 'compare-row';

      const label = document.createElement('div');
      label.className = 'compare-row-label';
      label.textContent = row.label;
      rowEl.appendChild(label);

      const valueA = document.createElement('div');
      valueA.className = 'compare-row-value';
      if (!row.valueA) valueA.classList.add('empty');
      if (row.winnerA) valueA.classList.add('winner');
      valueA.textContent = row.valueA || '—';
      rowEl.appendChild(valueA);

      const valueB = document.createElement('div');
      valueB.className = 'compare-row-value';
      if (!row.valueB) valueB.classList.add('empty');
      if (row.winnerB) valueB.classList.add('winner');
      valueB.textContent = row.valueB || '—';
      rowEl.appendChild(valueB);

      rowsContainer.appendChild(rowEl);
    });

    sectionEl.appendChild(rowsContainer);
    compareEls.sections.appendChild(sectionEl);
  });

  compareEls.empty.hidden = true;
  compareEls.content.hidden = false;
}

function buildComparisonSections(foodA, foodB){
  const sections = [];

  // Pricing Section
  const pricingRows = [];
  const priceA = foodA.price;
  const priceB = foodB.price;
  const unitPriceA = foodA.unitPrice;
  const unitPriceB = foodB.unitPrice;

  pricingRows.push(createSmartCompareRow('Price',
    formatPriceValue(foodA), formatPriceValue(foodB),
    priceA, priceB, 'lower'));
  pricingRows.push(createSmartCompareRow('Unit Price',
    formatUnitPriceValue(foodA), formatUnitPriceValue(foodB),
    unitPriceA, unitPriceB, 'lower'));
  pricingRows.push(createSmartCompareRow('Bag Size',
    formatBagSizeValue(foodA), formatBagSizeValue(foodB),
    foodA.bagLb, foodB.bagLb, 'higher'));

  sections.push({
    title: 'Pricing & Value',
    icon: '💰',
    rows: pricingRows.filter(Boolean)
  });

  // Nutritional Analysis Section
  const analysisRows = [];
  const analysisA = mapFromPairs(foodA.detail?.analysis);
  const analysisB = mapFromPairs(foodB.detail?.analysis);

  Array.from(new Set([...analysisA.keys(), ...analysisB.keys()]))
    .sort()
    .forEach(label => {
      const rawA = analysisA.get(label);
      const rawB = analysisB.get(label);
      const numA = parseFloat(rawA);
      const numB = parseFloat(rawB);

      let preferHigher = label.toLowerCase().includes('protein') || label.toLowerCase().includes('omega');
      let preferLower = label.toLowerCase().includes('fiber') || label.toLowerCase().includes('ash') || label.toLowerCase().includes('moisture');

      analysisRows.push(createSmartCompareRow(
        shortenAnalysisLabel(label),
        formatAnalysisValue(label, rawA),
        formatAnalysisValue(label, rawB),
        numA, numB,
        preferHigher ? 'higher' : (preferLower ? 'lower' : null)
      ));
    });

  if (analysisRows.length) {
    sections.push({
      title: 'Guaranteed Analysis',
      icon: '🔬',
      rows: analysisRows.filter(Boolean)
    });
  }

  // Feeding Facts Section
  const factsRows = [];
  const factsA = mapFromPairs(foodA.detail?.feeding);
  const factsB = mapFromPairs(foodB.detail?.feeding);

  Array.from(new Set([...factsA.keys(), ...factsB.keys()]))
    .sort()
    .forEach(label => {
      const rawA = factsA.get(label);
      const rawB = factsB.get(label);
      const numA = parseFloat(rawA);
      const numB = parseFloat(rawB);

      factsRows.push(createSmartCompareRow(
        label,
        formatFactValue(label, rawA),
        formatFactValue(label, rawB),
        numA, numB,
        label.toLowerCase().includes('calorie') ? 'higher' : null
      ));
    });

  if (factsRows.length) {
    sections.push({
      title: 'Feeding Information',
      icon: '📊',
      rows: factsRows.filter(Boolean)
    });
  }

  // Ingredients Section
  const ingredientsRows = [];
  const highlightsA = formatTagList(foodA.tags, 8);
  const highlightsB = formatTagList(foodB.tags, 8);

  if (highlightsA || highlightsB) {
    ingredientsRows.push({
      label: 'Highlights',
      valueA: highlightsA,
      valueB: highlightsB,
      winnerA: false,
      winnerB: false
    });
  }

  const ingredientsA = formatIngredientsList(foodA.detail?.ingredients);
  const ingredientsB = formatIngredientsList(foodB.detail?.ingredients);

  if (ingredientsA || ingredientsB) {
    ingredientsRows.push({
      label: 'Top Ingredients',
      valueA: ingredientsA,
      valueB: ingredientsB,
      winnerA: false,
      winnerB: false
    });
  }

  const statementA = cleanText(foodA.detail?.statement);
  const statementB = cleanText(foodB.detail?.statement);

  if (statementA || statementB) {
    ingredientsRows.push({
      label: 'AAFCO Statement',
      valueA: statementA,
      valueB: statementB,
      winnerA: false,
      winnerB: false
    });
  }

  if (ingredientsRows.length) {
    sections.push({
      title: 'Ingredients & Formulation',
      icon: '🌾',
      rows: ingredientsRows
    });
  }

  return sections.filter(s => s.rows.length > 0);
}

function createSmartCompareRow(label, valueA, valueB, numA, numB, preference){
  if (!valueA && !valueB) return null;

  let winnerA = false;
  let winnerB = false;

  if (preference && !isNaN(numA) && !isNaN(numB) && numA !== numB) {
    if (preference === 'lower') {
      winnerA = numA < numB;
      winnerB = numB < numA;
    } else if (preference === 'higher') {
      winnerA = numA > numB;
      winnerB = numB > numA;
    }
  }

  return {
    label,
    valueA: valueA || '',
    valueB: valueB || '',
    winnerA,
    winnerB
  };
}

function buildComparisonRows(foodA, foodB){
  const rows = [];

  const statementA = cleanText(foodA.detail?.statement);
  const statementB = cleanText(foodB.detail?.statement);
  const notesA     = cleanText(foodA.detail?.notes);
  const notesB     = cleanText(foodB.detail?.notes);

  rows.push(createCompareRow('Brand', cleanText(foodA.brand), cleanText(foodB.brand), false));
  rows.push(createCompareRow('Product Name', formatProductName(foodA), formatProductName(foodB), false));
  rows.push(createCompareRow('Price', formatPriceValue(foodA), formatPriceValue(foodB)));
  rows.push(createCompareRow('Unit Price', formatUnitPriceValue(foodA), formatUnitPriceValue(foodB)));
  rows.push(createCompareRow('Bag Size', formatBagSizeValue(foodA), formatBagSizeValue(foodB)));

  const analysisA = mapFromPairs(foodA.detail?.analysis);
  const analysisB = mapFromPairs(foodB.detail?.analysis);
  Array.from(new Set([...analysisA.keys(), ...analysisB.keys()]))
    .sort()
    .forEach(label => {
      rows.push(createCompareRow(
        shortenAnalysisLabel(label),
        formatAnalysisValue(label, analysisA.get(label)),
        formatAnalysisValue(label, analysisB.get(label))
      ));
    });

  const factsA = mapFromPairs(foodA.detail?.feeding);
  const factsB = mapFromPairs(foodB.detail?.feeding);
  Array.from(new Set([...factsA.keys(), ...factsB.keys()]))
    .sort()
    .forEach(label => {
      rows.push(createCompareRow(
        label,
        formatFactValue(label, factsA.get(label)),
        formatFactValue(label, factsB.get(label))
      ));
    });

  const highlightsA = formatTagList(foodA.tags, 8);
  const highlightsB = formatTagList(foodB.tags, 8);
  rows.push(createCompareRow('Highlights', highlightsA, highlightsB));

  rows.push(createCompareRow(
    'Top Ingredients',
    formatIngredientsList(foodA.detail?.ingredients),
    formatIngredientsList(foodB.detail?.ingredients)
  ));

  if (statementA || statementB){
    rows.push(createCompareRow('AAFCO Statement', statementA, statementB));
  }
  if (notesA || notesB){
    rows.push(createCompareRow('Notes', notesA, notesB));
  }

  return rows.filter(Boolean);
}

function createCompareRow(label, valueA, valueB, highlight = true){
  const normA = normalizeCompareValue(valueA);
  const normB = normalizeCompareValue(valueB);
  if (!normA && !normB && highlight) return null;
  const differs = highlight && normA && normB && normA !== normB;
  return {
    label,
    valueA: valueA || '',
    valueB: valueB || '',
    highlight,
    differs
  };
}

function formatCompareLabel(food){
  const brand = cleanText(food.brand);
  const name  = formatProductName(food);
  const price = formatPriceValue(food);
  const pieces = [];
  if (brand && name) pieces.push(`${brand} — ${name}`);
  else if (brand) pieces.push(brand);
  else if (name) pieces.push(name);
  if (price) pieces.push(`(${price})`);
  return pieces.join(' ');
}

function formatProductHeader(food){
  const brand = cleanText(food.brand);
  const name  = formatProductName(food);
  if (brand && name) return `${brand} • ${name}`;
  return brand || name || 'Selected Food';
}

function formatProductName(food){
  return cleanText(food.detail?.name || food.line || food.id || 'Unnamed Product');
}

function formatPriceValue(food){
  return Number.isFinite(food.price) ? fmtMoney(food.price) : '';
}

function formatUnitPriceValue(food){
  return Number.isFinite(food.unitPrice) ? `${fmtMoney(food.unitPrice)}/lb` : '';
}

function formatBagSizeValue(food){
  if (!Number.isFinite(food.bagLb) || food.bagLb <= 0) return '';
  const precision = food.bagLb % 1 ? 1 : 0;
  return `${food.bagLb.toFixed(precision)} lb`;
}

function mapFromPairs(arr){
  const map = new Map();
  (arr || []).forEach(item => {
    if (item?.label) map.set(item.label, item.value);
  });
  return map;
}

function shortenAnalysisLabel(label){
  return String(label || '')
    .replace(/^crude\s+/i, '')
    .replace(/\s*\(minimum\)/i, '(min)')
    .replace(/\s*\(maximum\)/i, '(max)');
}

function formatAnalysisValue(label, value){
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^\d+(\.\d+)?$/.test(trimmed)){
    return /moisture|fiber|ash|protein|fat/i.test(label) ? `${trimmed}%` : trimmed;
  }
  return trimmed;
}

function formatFactValue(label, value){
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^\d+(\.\d+)?$/.test(trimmed)){
    if (/cup/i.test(label)) return `${trimmed} kcal`;
    if (/kg/i.test(label))  return `${trimmed} kcal/kg`;
  }
  return trimmed;
}

function formatTagList(tags, limit = 8){
  if (!Array.isArray(tags) || !tags.length) return '';
  const formatted = tags
    .map(tag => tag.replace(/-/g, ' '))
    .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1))
    .filter((tag, idx, arr) => arr.indexOf(tag) === idx);
  return formatted.slice(0, limit).join(', ');
}

function formatIngredientsList(raw){
  const text = cleanText(raw);
  if (!text) return '';
  return text
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(', ');
}

function cleanText(val){
  const str = val == null ? '' : String(val).trim();
  return str;
}

function normalizeCompareValue(val){
  const str = cleanText(val);
  return str ? str.toLowerCase() : '';
}

function createCompareId(row, fallbackIndex = 0){
  const brand = cleanText(row.brand);
  const line  = cleanText(row.line || row.name || row.id);
  const id    = cleanText(row.id);
  let base = [id, brand, line].filter(Boolean).join('::');
  if (!base) base = `food-${fallbackIndex}-${++compareIdCounter}`;
  return base.replace(/\s+/g, '-').toLowerCase();
}

function getVisibleFoodIds(){
  return Array.from(document.querySelectorAll('.food-card'))
    .filter(card => card.style.display !== 'none' && card.offsetParent !== null)
    .map(card => card.dataset.foodId)
    .filter(Boolean);
}

function updateComparisonOptions(forceReset = false){
  const els = ensureCompareControls();
  if (!els || !allFoods.length) return;

  const visibleIds = new Set(getVisibleFoodIds());
  const availableFoods = allFoods.filter(food => visibleIds.has(food.compareId));
  const prevA = els.selectA.value;
  const prevB = els.selectB.value;

  if (!availableFoods.length){
    const emptyOption = '<option value="">No foods available</option>';
    els.selectA.innerHTML = emptyOption;
    els.selectB.innerHTML = emptyOption;
    els.selectA.disabled = true;
    els.selectB.disabled = true;
    els.empty.hidden = false;
    els.empty.textContent = 'Adjust the selections on the main page to compare foods.';
    els.table.hidden = true;
    return;
  }

  els.selectA.disabled = false;
  els.selectB.disabled = false;

  const optionsMarkup = ['<option value="">Select food…</option>']
    .concat(availableFoods.map(food => `<option value="${food.compareId}">${formatCompareLabel(food)}</option>`))
    .join('');

  els.selectA.innerHTML = optionsMarkup;
  els.selectB.innerHTML = optionsMarkup;

  const availableIds = new Set(availableFoods.map(food => food.compareId));

  let selectedA = (!forceReset && availableIds.has(prevA)) ? prevA : availableFoods[0].compareId;
  let selectedB = (!forceReset && availableIds.has(prevB)) ? prevB : '';

  if (!selectedB || selectedB === selectedA){
    const alternative = availableFoods.find(food => food.compareId !== selectedA);
    selectedB = alternative ? alternative.compareId : '';
  }

  els.selectA.value = selectedA;
  els.selectB.value = selectedB;

  renderComparison();
}

/* =======================================
   SMALL HELPERS
======================================= */
function createDisplayOnlyPill(label){
  const pill = document.createElement('span');
  pill.className = 'pill display-only';
  pill.textContent = label;
  return pill;
}
const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const formatGoal = g =>
  g === 'weight-loss' ? 'Weight Loss' :
  g === 'muscle-gain' ? 'Muscle Gain' :
  g === 'maintenance' ? 'Weight Maintenance' :
  capitalize(g);
const formatAgeGroup = a =>
  a === 'puppy'  ? 'Puppy (under 1 year)' :
  a === 'adult'  ? 'Adult (1–7 years)' :
  a === 'senior' ? 'Senior (8+ years)' :
  capitalize(a);

// tiny DOM shorthands
function byId(id){ return document.getElementById(id); }
function q(sel){ return document.querySelector(sel); }

/* =======================================
   DETAIL PANEL HELPERS
======================================= */
function handleFoodSelection(card){
  if (card === activeFoodCard){
    collapseCard(card);
    activeFoodCard = null;
    return;
  }
  if (activeFoodCard) collapseCard(activeFoodCard);
  expandCard(card);
  activeFoodCard = card;
}

function expandCard(card){
  const panel = card.querySelector('.detail-panel');
  if (!panel) return;
  card.classList.add('expanded');
  card.setAttribute('aria-expanded', 'true');

  panel.hidden = false;
  panel.style.overflow = 'hidden';
  panel.style.maxHeight = '0px';
  requestAnimationFrame(() => {
    panel.style.maxHeight = panel.scrollHeight + 'px';
  });
  panel.addEventListener('transitionend', function handler(event){
    if (event.propertyName === 'max-height' && card.classList.contains('expanded')){
      panel.style.maxHeight = 'none';
      panel.style.overflow = 'visible';
      panel.removeEventListener('transitionend', handler);
    }
  }, { once: true });
}

function collapseCard(card){
  const panel = card.querySelector('.detail-panel');
  if (!panel || panel.hidden) return;
  card.classList.remove('expanded');
  card.setAttribute('aria-expanded', 'false');
  panel.style.overflow = 'hidden';
  panel.style.maxHeight = panel.scrollHeight + 'px';
  requestAnimationFrame(() => {
    panel.style.maxHeight = '0px';
  });
  panel.addEventListener('transitionend', function handler(event){
    if (event.propertyName === 'max-height' && !card.classList.contains('expanded')){
      panel.hidden = true;
      panel.style.maxHeight = '';
      panel.style.overflow = '';
      panel.removeEventListener('transitionend', handler);
    }
  }, { once: true });
}

function renderDetailPanel(food){
  const detail = food.detail || {};
  const brand = food.brand ? escapeHTML(food.brand) : '';
  const name = escapeHTML(detail.name || food.line || food.id || 'Selected Product');
  const description = escapeHTML((food.description || detail.notes || '').trim());
  const imageSrc = escapeHTML(food.image || PLACEHOLDER_IMG);

  const analysisItems = Array.isArray(detail.analysis) && detail.analysis.length
    ? detail.analysis
    : null;
  const analysisHTML = analysisItems
    ? analysisItems.map(item => renderListItem(item.label, item.value)).join('')
    : `<li class="detail-list-empty">No guaranteed analysis provided.</li>`;

  const facts = Array.isArray(detail.feeding) ? detail.feeding.slice() : [];
  if (detail.statement) facts.push({ label: 'AAFCO Statement', value: detail.statement });
  const factsHTML = facts.length
    ? facts.map(item => renderListItem(item.label, item.value)).join('')
    : `<li class="detail-list-empty">No additional feeding details provided.</li>`;

  const ingredientsText =
    detail.ingredients ||
    (food.raw && pickFirst(food.raw, ['ingredients', 'ingredient_list', 'ingredients_list'])) ||
    '';

  // Split ingredients for progressive disclosure
  let ingredientsHTML = 'Ingredient list not available.';
  let showToggle = false;
  if (ingredientsText) {
    const parts = ingredientsText.split(',').map(p => p.trim()).filter(Boolean);
    const fullList = parts.length ? parts.join(', ') : ingredientsText;
    ingredientsHTML = escapeHTML(fullList);
  }

  const tagsHTML = (food.tags || []).length
    ? food.tags.map(tag => `<span class="detail-tag">${escapeHTML(tag.replace(/-/g, ' '))}</span>`).join('')
    : `<span class="detail-tag empty">No tags available</span>`;

  const linkHTML = food.url
    ? `<a class="detail-link" href="${escapeHTML(food.url)}" target="_blank" rel="noopener">View Product</a>`
    : '';

  const ingredientsToggleHTML = showToggle
    ? `<button class="ingredients-toggle" onclick="toggleIngredients('${escapeHTML(food.compareId || food.id)}', this, event)">
         <span>Show all ingredients</span>
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <polyline points="6 9 12 15 18 9"></polyline>
         </svg>
       </button>`
    : '';

  return `
    <div class="detail-panel" hidden>
      <div class="detail-shell">
        <header class="detail-heading">
          <div class="detail-heading-text">
            ${brand ? `<p class="detail-brand">${brand}</p>` : ''}
            <h3 class="detail-title">${name}</h3>
            ${description ? `<p class="detail-description">${description}</p>` : ''}
          </div>
          ${linkHTML}
        </header>
        <div class="detail-main">
          <figure class="detail-photo">
            <img loading="lazy"
                 src="${imageSrc}"
                 alt="${name}"
                 onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
          </figure>
          <div class="detail-metrics">
            <div class="detail-metric">
              <h4>
                <div class="detail-section-icon">🔬</div>
                Guaranteed Analysis
              </h4>
              <ul class="detail-list">
                ${analysisHTML}
              </ul>
            </div>
            <div class="detail-metric">
              <h4>
                <div class="detail-section-icon">📊</div>
                Feeding Facts
              </h4>
              <ul class="detail-list">
                ${factsHTML}
              </ul>
            </div>
          </div>
        </div>
        <div class="detail-section detail-ingredients">
          <h4>
            <div class="detail-section-icon">🌾</div>
            Ingredients
          </h4>
          <p>${ingredientsHTML}</p>
          ${ingredientsToggleHTML}
        </div>
        <div class="detail-section detail-tags">
          <h4>
            <div class="detail-section-icon">✨</div>
            Key Attributes
          </h4>
          <div class="detail-tag-list">
            ${tagsHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleIngredients(foodId, btn, event){
  // Prevent card collapse when clicking the toggle button
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const fullEl = document.getElementById(`ingredients-full-${foodId}`);
  if (!fullEl) return;

  const isExpanded = fullEl.classList.contains('show');
  fullEl.classList.toggle('show');
  btn.classList.toggle('expanded');

  const span = btn.querySelector('span');
  if (span) {
    span.textContent = isExpanded ? 'Show all ingredients' : 'Show less';
  }
}

function renderListItem(label, value){
  const safeLabel = escapeHTML(label);
  const safeValue = escapeHTML(value);
  if (!safeValue){
    return `<li>${safeLabel}</li>`;
  }
  return `<li class="has-value"><span>${safeLabel}</span><span>${safeValue}</span></li>`;
}

const ESCAPE_LOOKUP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHTML(input){
  return String(input ?? '').replace(/[&<>"']/g, ch => ESCAPE_LOOKUP[ch] || ch);
}

function pickFirst(obj, keys){
  for (const key of keys){
    const val = obj && obj[key];
    if (val) return typeof val === 'string' ? val.trim() : val;
  }
  return '';
}

const ANALYSIS_FIELDS = [
  { label: 'Crude Protein (min)', keys: ['crude_protein', 'protein_pct', 'protein'] },
  { label: 'Crude Fat (min)', keys: ['crude_fat', 'fat_pct', 'fat'] },
  { label: 'Crude Fiber (max)', keys: ['crude_fiber', 'fiber_pct', 'fiber'] },
  { label: 'Moisture (max)', keys: ['moisture_pct', 'moisture'] },
  { label: 'Ash (max)', keys: ['ash_pct', 'ash'] },
  { label: 'Omega-3 (min)', keys: ['omega3', 'omega_3'] },
  { label: 'Omega-6 (min)', keys: ['omega6', 'omega_6'] }
];

const FACT_FIELDS = [
  { label: 'Calories per cup', keys: ['kcal_per_cup', 'calories_per_cup'] },
  { label: 'Calories per kg', keys: ['kcal_per_kg', 'calories_per_kg'] },
  { label: 'Feeding guidelines', keys: ['feeding_guidelines', 'feeding_instructions'] },
  { label: 'Life-stage suitability', keys: ['life_stage_note', 'life_stage_statement'] }
];

function extractAnalysis(row){
  return ANALYSIS_FIELDS.map(field => {
    const val = pickFirst(row, field.keys);
    if (!val) return null;
    return { label: field.label, value: formatValue(val) };
  }).filter(Boolean);
}

function extractFacts(row){
  return FACT_FIELDS.map(field => {
    const val = pickFirst(row, field.keys);
    if (!val) return null;
    return { label: field.label, value: formatValue(val) };
  }).filter(Boolean);
}

function formatValue(val){
  if (val == null) return '';
  const str = String(val).trim();
  if (str === '') return '';
  if (/^\d+(\.\d+)?$/.test(str)) return str;
  return str.replace(/\s+/g, ' ');
}

/* =======================================
   SORTING & FILTERING CONTROLS
======================================= */
function initializeSortingControls(){
  const sortSelect = byId('sort-select');
  const clearBtn = byId('clear-filters-btn');

  if (sortSelect) {
    sortSelect.addEventListener('change', handleSortChange);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', resetSort);
  }
}

function handleSortChange(evt){
  const sortBy = evt.target.value;
  const cards = Array.from(document.querySelectorAll('.food-card'));
  const visibleCards = cards.filter(card => card.style.display !== 'none');

  if (sortBy === 'default') {
    resetSort();
    return;
  }

  // Sort visible cards
  visibleCards.sort((a, b) => {
    const foodA = getFoodFromCard(a);
    const foodB = getFoodFromCard(b);

    switch (sortBy) {
      case 'price-low':
        return (foodA.price || Infinity) - (foodB.price || Infinity);
      case 'price-high':
        return (foodB.price || 0) - (foodA.price || 0);
      case 'protein-high': {
        const proteinA = getProteinValue(foodA);
        const proteinB = getProteinValue(foodB);
        return proteinB - proteinA;
      }
      case 'fat-low': {
        const fatA = getFatValue(foodA);
        const fatB = getFatValue(foodB);
        return fatA - fatB;
      }
      default:
        return 0;
    }
  });

  // Re-append sorted cards to their sections
  visibleCards.forEach(card => {
    const grid = card.parentElement;
    if (grid) grid.appendChild(card);
  });

  const clearBtn = byId('clear-filters-btn');
  if (clearBtn) clearBtn.style.display = sortBy !== 'default' ? 'inline-flex' : 'none';
}

function resetSort(){
  const sortSelect = byId('sort-select');
  if (sortSelect) sortSelect.value = 'default';

  const clearBtn = byId('clear-filters-btn');
  if (clearBtn) clearBtn.style.display = 'none';

  // Re-render cards in original order
  document.querySelectorAll('.food-grid').forEach(g => g.innerHTML = '');
  allFoods.forEach(mountCard);

  const petData = JSON.parse(localStorage.getItem('petData') || '{}');
  filterFoodCards(petData);
  hideEmptySections();
}

function getFoodFromCard(card){
  const foodId = card.dataset.foodId;
  return foodLookup.get(foodId) || {};
}

function getProteinValue(food){
  const analysis = food.detail?.analysis || [];
  const protein = analysis.find(item => item.label?.toLowerCase().includes('protein'));
  return protein ? parseFloat(protein.value) || 0 : 0;
}

function getFatValue(food){
  const analysis = food.detail?.analysis || [];
  const fat = analysis.find(item => item.label?.toLowerCase().includes('fat'));
  return fat ? parseFloat(fat.value) || 0 : 0;
}

function updateResultsCount(){
  const countEl = byId('results-count');
  if (!countEl) return;

  const visibleCards = Array.from(document.querySelectorAll('.food-card'))
    .filter(card => card.style.display !== 'none');

  const count = visibleCards.length;
  countEl.textContent = `${count} product${count !== 1 ? 's' : ''}`;
}
