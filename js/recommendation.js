document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ recommendation.js is loaded");

  const petData = JSON.parse(localStorage.getItem('petData'));
  if (!petData) return;

  const goal = petData.weightGoal?.toLowerCase().trim();

  // Populate pet profile
  document.getElementById('pet-name').textContent = petData.name || 'Unknown Pet';
  document.getElementById('pet-breed').textContent = capitalize(petData.breedSize);
  document.getElementById('pet-age').textContent = formatAgeGroup(petData.ageGroup);
  document.getElementById('pet-activity').textContent = capitalize(petData.activityLevel);
  document.getElementById('pet-goal').textContent = formatGoal(petData.weightGoal);

  // Render allergies
  const allergyContainer = document.getElementById('allergy-list');
  allergyContainer.innerHTML = petData.allergies?.length
    ? petData.allergies.map(createDisplayOnlyPill).map(p => p.outerHTML).join('')
    : '<span class="no-allergies">None reported</span>';

  // Reorder sections
  const recommendations = document.querySelector(".food-recommendations");
  const mostPopular = document.getElementById("section-most-popular");
  const bestValue = document.getElementById("section-best-value");
  const lowFat = document.getElementById("section-low-fat");
  const highProtein = document.getElementById("section-high-protein");

// Cleanly remove both conditional sections first
  [lowFat, highProtein].forEach(section => {
    if (section?.parentElement === recommendations) {
      recommendations.removeChild(section);
    }
  });

  // Always append Most Popular and Best Value
  recommendations.querySelectorAll('.food-section').forEach(section => section.remove());
  if (mostPopular) recommendations.appendChild(mostPopular);
  if (bestValue) recommendations.appendChild(bestValue);

  // Always hide both conditional sections by default
  if (goal !== 'weight-loss' && lowFat?.parentElement === recommendations) {
    recommendations.removeChild(lowFat);
  }
  if (goal !== 'muscle-gain' && highProtein?.parentElement === recommendations) {
    recommendations.removeChild(highProtein);
  }

  // Only show conditional sections for specific goals (NOT for maintenance)
  if (goal === "weight-loss" && lowFat) {
    lowFat.style.display = 'block';
    recommendations.appendChild(lowFat);
  } else if (goal === "muscle-gain" && highProtein) {
    highProtein.style.display = 'block';
    recommendations.appendChild(highProtein);
  }

  // Filter food cards
  filterFoodCards(petData);

  // Hide empty sections
  hideEmptySections();

  // Edit button
  const editBtn = document.getElementById('edit-btn');
  if (editBtn) {
    console.log("✅ Edit button loaded properly.");
    editBtn.addEventListener('click', () => {
      console.log("👉 Edit button clicked.");
      window.location.href = 'index.html';
    });
  } else {
    console.error("❌ Edit button NOT found.");
  }
});

function filterFoodCards(petData) {
  const age = petData.ageGroup?.toLowerCase();
  const breedSize = petData.breedSize?.toLowerCase();
  const allergies = (petData.allergies || []).map(a => a.toLowerCase());

  document.querySelectorAll('.food-card').forEach(card => {
    const tags = (card.dataset.tags || "").toLowerCase().split(/\s+/);
    let hide = false;

    // Age
    if (age && !tags.includes(age)) hide = true;
    if (tags.includes('puppy') && age !== 'puppy') hide = true;

    // Breed size
    if (breedSize === 'small' && !tags.includes('small') && !tags.includes('regular')) hide = true;
    if ((breedSize === 'large' || breedSize === 'giant') && !tags.includes('large') && !tags.includes('regular')) hide = true;

    // Allergies
    if (tags.some(tag => allergies.includes(tag))) hide = true;

    card.style.display = hide ? 'none' : 'block';
  });
}

function hideEmptySections() {
  ['section-most-popular', 'section-best-value', 'section-low-fat', 'section-high-protein'].forEach(id => {
    const section = document.getElementById(id);
    if (!section) return; // ← fix the crash

    const visible = section.querySelectorAll('.food-card:not([style*="display: none"])');
    section.style.display = visible.length ? 'block' : 'none';
  });
}


function createDisplayOnlyPill(label) {
  const pill = document.createElement("span");
  pill.className = "pill display-only";
  pill.textContent = label;
  return pill;
}

const capitalize = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
const formatGoal = goal =>
  goal === 'weight-loss' ? 'Weight Loss' :
  goal === 'muscle-gain' ? 'Muscle Gain' :
  goal === 'maintenance' ? 'Weight Maintenance' :
  capitalize(goal);
const formatAgeGroup = age =>
  age === 'puppy' ? 'Puppy (under 1 year)' :
  age === 'adult' ? 'Adult (1–7 years)' :
  age === 'senior' ? 'Senior (8+ years)' :
  capitalize(age);