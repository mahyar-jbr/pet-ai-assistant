// === Dynamic Theme Switching Based on Selected Breed ===
const breedSelect = document.getElementById("pet-breed");

breedSelect.addEventListener("change", () => {
  // Remove all existing theme classes to prevent stacking
  document.body.classList.remove(
    "golden-theme",
    "cane-theme",
    "doberman-theme",
    "border-collie-theme", 
    "husky-theme",
    "labrador-theme"
  );

  // Add the new theme class based on selected breed
  const breed = breedSelect.value;
  if (breed === "Doberman") {
    document.body.classList.add("doberman-theme");
  } else if (breed === "Golden Retriever") {
    document.body.classList.add("golden-theme");
  } else if (breed === "Cane Corso") {
    document.body.classList.add("cane-theme");
  } else if (breed === "Border Collie") {
    document.body.classList.add("border-collie-theme");
  } else if (breed === "Husky") {
    document.body.classList.add("husky-theme");
  } else if (breed === "Labrador") {
    document.body.classList.add("labrador-theme");
  }
});

// === Allergy Tag Functionality ===

// Get the container and +Add button
const allergyTags = document.getElementById("allergy-tags");
const addBtn = document.getElementById("addAllergy");

/**
 * Creates a removable allergy pill element with close (×) button
 * @param {string} label - The text content of the pill
 * @returns {HTMLElement} - The DOM element representing the pill
 */
function createAllergyPill(label) {
  const pill = document.createElement("span");
  pill.className = "pill removable";
  pill.textContent = label;

  const close = document.createElement("span");
  close.className = "close-btn";
  close.innerHTML = "&times;";
  pill.appendChild(close);

  // Enable removal on click
  close.addEventListener("click", () => pill.remove());

  return pill;
}

// Show prompt and add new allergy pill dynamically
addBtn.addEventListener("click", () => {
  const allergy = prompt("Enter allergy:");
  if (allergy) {
    const pill = createAllergyPill(allergy);
    allergyTags.insertBefore(pill, addBtn);
  }
});

// === Form Submission and Data Storage ===
document.getElementById('pet-form').addEventListener('submit', function(e) {
  e.preventDefault(); // Prevent page reload on form submission

  // Collect form input values
  const name = document.getElementById('pet-name').value.trim();
  const age = document.getElementById('pet-age').value.trim();
  const breed = document.getElementById('pet-breed').value;
  const activity = document.getElementById('activity-level').value;
  const goal = document.getElementById('dietary-goal').value;

  // Extract allergy labels from pills, ignoring the "+Add" button
  const allergyTags = document.querySelectorAll('#allergy-tags .pill:not(.add)');
  const allergies = Array.from(allergyTags).map(pill =>
    pill.childNodes[0]?.nodeValue.trim()
  );

  // Construct object to store all pet data
  const petData = {
    name,
    age,
    breed,
    activity,
    goal,
    allergies
  };

  // Save pet profile data to localStorage for use on next page
  localStorage.setItem('petData', JSON.stringify(petData));

  // Redirect to the recommendation page
  window.location.href = 'recommendation.html';
});