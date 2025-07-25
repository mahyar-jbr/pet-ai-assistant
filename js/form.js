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
    const trimmed = allergy.trim();
    if (trimmed && ![...document.querySelectorAll('.pill')].some(p => p.textContent.trim() === trimmed)) {
      const pill = createAllergyPill(trimmed);
      allergyTags.insertBefore(pill, addBtn);
    }
  }
});

// === Form Submission and Data Storage ===
document.getElementById('pet-form').addEventListener('submit', function (e) {
  e.preventDefault(); // Prevent page reload

  // Collect form input values
  const name = document.getElementById('pet-name').value.trim();
  const ageGroup = document.getElementById('pet-age').value.trim();
  const breedSize = document.getElementById('breed-size').value;
  const activity = document.getElementById('activity-level').value;
  const goal = document.getElementById('dietary-goal').value;

  // Get allergy pills (excluding the "+Add" button)
  const allergyTags = document.querySelectorAll('#allergy-tags .pill:not(.add)');
  const allergies = Array.from(allergyTags).map(pill =>
    pill.childNodes[0]?.nodeValue.trim()
  );

  // Construct object for localStorage AND backend
  const petData = {
    name,
    ageGroup,
    breedSize,
    activityLevel: activity,
    weightGoal: goal,
    allergies
  };

  // === POST to backend ===
  fetch('http://localhost:8080/api/pets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(petData)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to save pet to backend');
      }
      return response.json();
    })
    .then(data => {
      console.log('✅ Pet saved:', data);

      // Also save locally for client-side use
      localStorage.setItem('petData', JSON.stringify(petData));

      // Then redirect
      window.location.href = 'recommendation.html';
    })
    .catch(error => {
      console.error('❌ Error saving pet:', error);
      alert('There was a problem saving your pet profile. Please try again.');
    });
});
