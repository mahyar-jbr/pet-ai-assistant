import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AllergyPills from '../components/AllergyPills';
import { createPet } from '../api/petApi';
import '../styles/form.css';

const PetForm = () => {
  const navigate = useNavigate();
  const [allergies, setAllergies] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    ageGroup: '',
    breedSize: '',
    activityLevel: '',
    weightGoal: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate form with existing data (for Edit mode)
  useEffect(() => {
    const existingData = localStorage.getItem('petData');
    if (existingData) {
      try {
        const petData = JSON.parse(existingData);
        setFormData({
          name: petData.name || '',
          ageGroup: petData.ageGroup || '',
          breedSize: petData.breedSize || '',
          activityLevel: petData.activityLevel || '',
          weightGoal: petData.weightGoal || ''
        });
        if (petData.allergies && petData.allergies.length > 0) {
          setAllergies(petData.allergies.map(a => a.toLowerCase()));
        }
      } catch (error) {
        console.error('Error loading existing pet data:', error);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAllergy = (allergy) => {
    const normalizedAllergy = allergy.trim().toLowerCase();
    if (normalizedAllergy && !allergies.includes(normalizedAllergy)) {
      setAllergies(prev => [...prev, normalizedAllergy]);
    }
  };

  const handleRemoveAllergy = (allergy) => {
    setAllergies(prev => prev.filter(a => a !== allergy));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const petData = {
      ...formData,
      allergies
    };

    try {
      // Clear any previously stored pet ID to force creating a fresh profile
      localStorage.removeItem('petId');

      // Create pet in backend
      const result = await createPet(petData);
      console.log('✅ Pet saved:', result);

      // Save locally for client-side use
      localStorage.setItem('petData', JSON.stringify(petData));
      localStorage.setItem('petId', result.id);

      // Navigate to recommendations page
      navigate('/recommendations');
    } catch (error) {
      console.error('❌ Error saving pet:', error);
      alert('There was a problem saving your pet profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="form-card">
        <h1>Enter Your Dog's Info</h1>
        <p className="subtitle">
          Let's create a personalized profile to find the perfect food for your furry friend
        </p>

        <form id="pet-form" onSubmit={handleSubmit}>
          {/* Pet Name Input */}
          <label htmlFor="pet-name">Pet Name</label>
          <input
            type="text"
            id="pet-name"
            name="name"
            placeholder="Enter name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          {/* Row for Age and Breed */}
          <div className="input-row">
            {/* Pet Age */}
            <div className="input-group">
              <label htmlFor="pet-age">Age Group</label>
              <select
                id="pet-age"
                name="ageGroup"
                value={formData.ageGroup}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>Select age group</option>
                <option value="puppy">Puppy (0–1 year)</option>
                <option value="adult">Adult (1–7 years)</option>
                <option value="senior">Senior (8+ years)</option>
              </select>
            </div>

            {/* Breed Size Selection */}
            <div className="input-group">
              <label htmlFor="breed-size">Breed Size</label>
              <select
                id="breed-size"
                name="breedSize"
                value={formData.breedSize}
                onChange={handleInputChange}
                required
              >
                <option value="">Select size</option>
                <option value="small">Small (under 20 lbs / 9 kg)</option>
                <option value="medium">Medium (20–50 lbs / 9–23 kg)</option>
                <option value="large">Large (over 50 lbs / 23 kg)</option>
              </select>
            </div>
          </div>

          {/* Row for Activity Level and Dietary Goal */}
          <div className="input-row">
            {/* Activity Level */}
            <div className="input-group">
              <label htmlFor="activity-level">Activity Level</label>
              <select
                id="activity-level"
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>Select activity level</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Dietary Goal */}
            <div className="input-group">
              <label htmlFor="dietary-goal">Dietary Goal</label>
              <select
                id="dietary-goal"
                name="weightGoal"
                value={formData.weightGoal}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>Select dietary goal</option>
                <option value="maintenance">Maintenance</option>
                <option value="weight-loss">Weight Loss</option>
                <option value="muscle-gain">Muscle Gain</option>
              </select>
            </div>
          </div>

          {/* Allergy Input Section */}
          <AllergyPills
            allergies={allergies}
            onAdd={handleAddAllergy}
            onRemove={handleRemoveAllergy}
          />

          {/* Form Submission Button */}
          <button
            type="submit"
            className={`submit-btn ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Show Food Recommendation'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PetForm;
