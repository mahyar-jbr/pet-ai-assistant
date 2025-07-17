document.addEventListener('DOMContentLoaded', () => {
  // Retrieve pet data from localStorage
  const petData = JSON.parse(localStorage.getItem('petData'));
  if (!petData) return; // Exit if no data found

  // ================================
  // 1. Apply theme based on breed
  // ================================
  const breed = petData.breed?.toLowerCase(); // Normalize to lowercase
  document.body.className = ""; // Clear any existing theme classes

  // Add the appropriate theme class based on breed name
  if (breed.includes("doberman")) {
    document.body.classList.add("doberman-theme");
  } else if (breed.includes("golden")) {
    document.body.classList.add("golden-theme");
  } else if (breed.includes("cane corso") || breed.includes("corso")) {
    document.body.classList.add("cane-theme");
  } else if (breed.includes("border collie") || breed.includes("collie")) {
    document.body.classList.add("border-collie-theme");
  } else if (breed.includes("husky")) {
    document.body.classList.add("husky-theme");
  } else if (breed.includes("labrador") || breed.includes("chocolate")) {
    document.body.classList.add("labrador-theme");
  }

  // ===================================
  // 2. Populate Pet Profile on Page
  // ===================================
  document.getElementById('pet-name').textContent = petData.name;
  document.getElementById('pet-breed').textContent = petData.breed;
  document.getElementById('pet-age').textContent = `${petData.age} years`;
  document.getElementById('pet-activity').textContent = capitalize(petData.activity);
  document.getElementById('pet-goal').textContent = formatGoal(petData.goal);

  // ===================================
  // 3. Render Allergy Pills (Display-Only)
  // ===================================
  const allergyContainer = document.getElementById('allergy-list');
  allergyContainer.innerHTML = ''; // Clear any existing pills

  petData.allergies.forEach(allergy => {
    const pill = createDisplayOnlyPill(allergy); // Generate pill
    allergyContainer.appendChild(pill);          // Append to DOM
  });
});

/**
 * Utility: Create display-only allergy pill element
 * @param {string} label - The allergy name to display
 * @returns {HTMLElement} - Styled <span> pill element
 */
function createDisplayOnlyPill(label) {
  const pill = document.createElement("span");
  pill.className = "pill display-only"; // Ensures no interactions
  pill.textContent = label;
  return pill;
}

/**
 * Utility: Capitalize the first letter of a word
 * @param {string} word
 * @returns {string}
 */
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Utility: Format dietary goal into user-friendly string
 * @param {string} goal - Raw goal value from data
 * @returns {string} - Human-readable label
 */
function formatGoal(goal) {
  return goal === 'maintenance' ? 'Weight Maintenance'
       : goal === 'weight-loss' ? 'Weight Loss'
       : goal === 'muscle-gain' ? 'Muscle Gain'
       : goal;
}
