// === Pre-populate form with existing data (for Edit mode) ===
window.addEventListener('DOMContentLoaded', function() {
  const existingData = localStorage.getItem('petData');

  if (existingData) {
    try {
      const petData = JSON.parse(existingData);

      // Pre-fill all form fields
      if (petData.name) {
        document.getElementById('pet-name').value = petData.name;
      }
      if (petData.ageGroup) {
        document.getElementById('pet-age').value = petData.ageGroup;
      }
      if (petData.breedSize) {
        document.getElementById('breed-size').value = petData.breedSize;
      }
      if (petData.activityLevel) {
        document.getElementById('activity-level').value = petData.activityLevel;
      }
      if (petData.weightGoal) {
        document.getElementById('dietary-goal').value = petData.weightGoal;
      }
      if (petData.allergies && petData.allergies.length > 0) {
        // Join allergies array with commas for display
        document.getElementById('pet-allergies').value = petData.allergies.join(', ');
      }
    } catch (error) {
      console.error('Error loading existing pet data:', error);
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

  // Parse allergies from text input (comma-separated)
  const allergyInput = document.getElementById('pet-allergies').value.trim();
  const allergies = allergyInput
    ? allergyInput.split(',').map(a => a.trim().toLowerCase()).filter(Boolean)
    : [];

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
