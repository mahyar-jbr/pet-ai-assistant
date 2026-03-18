/**
 * SaveResultsBanner — Inline card in food grid prompting anonymous users to create an account.
 * Triggers on first overlay close or scroll past 5th card. Dismissable with 30-day lockout after 3 dismissals.
 * @param {string} petName
 * @param {boolean} triggerOverlayClose
 * @param {boolean} triggerScrollPast5
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

const DISMISS_COUNT_KEY = 'saveResultsDismissCount';
const DISMISS_UNTIL_KEY = 'saveResultsDismissUntil';
const SESSION_DISMISS_KEY = 'saveResultsDismissed';

const SaveResultsBanner = ({ petName = '', triggerOverlayClose = false, triggerScrollPast5 = false }) => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) return;
    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return;

    // Check 30-day lockout
    const dismissUntil = localStorage.getItem(DISMISS_UNTIL_KEY);
    if (dismissUntil && Date.now() < parseInt(dismissUntil, 10)) return;

    // Show when either trigger fires
    if (triggerOverlayClose || triggerScrollPast5) {
      setVisible(true);
    }
  }, [triggerOverlayClose, triggerScrollPast5]);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');

    // Increment dismiss count, lock out after 3
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(DISMISS_COUNT_KEY, String(count));
    if (count >= 3) {
      // Lock out for 30 days
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    }
  };

  const handleSave = () => {
    navigate('/login');
  };

  if (!visible || isAuthenticated()) return null;

  return (
    <div className="save-results-card">
      <div className="save-results-card-icon">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--button-bg, #0057ff)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      </div>
      <h3 className="save-results-card-title">
        Save {petName ? `${petName}'s` : 'Your'} Results
      </h3>
      <ul className="save-results-card-list">
        <li>Track purchases &amp; reorders</li>
        <li>See how long your bag lasts</li>
        <li>Get your dashboard</li>
      </ul>
      <button type="button" className="save-results-card-btn" onClick={handleSave}>
        Save My Results
      </button>
      <p className="save-results-card-note">No password needed.</p>
      <button type="button" className="save-results-card-dismiss" onClick={handleDismiss}>
        Not now
      </button>
    </div>
  );
};

export default SaveResultsBanner;
