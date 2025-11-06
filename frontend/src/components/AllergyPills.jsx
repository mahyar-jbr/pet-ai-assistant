import { useState } from 'react';

const AllergyPills = ({ allergies, onAdd, onRemove }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = inputValue.trim();
      if (value) {
        onAdd(value);
        setInputValue('');
      }
    }
  };

  return (
    <div>
      <label htmlFor="pet-allergies">Known Allergies (Optional)</label>

      {allergies.length > 0 && (
        <div id="allergy-pills-container">
          {allergies.map((allergy) => (
            <span key={allergy} className="allergy-pill">
              {allergy}
              <button
                type="button"
                className="remove-pill"
                onClick={() => onRemove(allergy)}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        id="pet-allergies"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type and press Enter to add"
      />
    </div>
  );
};

export default AllergyPills;
