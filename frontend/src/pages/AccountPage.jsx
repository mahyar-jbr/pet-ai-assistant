/**
 * AccountPage — Account settings: email display, logout, delete account with confirmation.
 * Protected route.
 * @route /account
 */
import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, deleteAccount } from '../api/petApi';
import { clearToken } from '../utils/auth';
import '../styles/login.css';

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((data) => setUser(data.user || data))
      .catch(() => {
        clearToken();
        navigate('/login', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('petId');
    localStorage.removeItem('petData');
    localStorage.removeItem('sessionToken');
    navigate('/', { replace: true });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      clearToken();
      localStorage.removeItem('petId');
      localStorage.removeItem('petData');
      localStorage.removeItem('sessionToken');
      navigate('/', { replace: true });
    } catch {
      setDeleting(false);
      setDeleteError('Failed to delete account. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="login-page page-transition">
        <div className="login-card">
          <div className="login-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page page-transition">
      <Link to="/dashboard" className="account-back-link">&larr; Dashboard</Link>
      <div className="login-card">
        <img src="/logo.png" alt="BowlWise" className="login-logo" />
        <h1 className="login-title">Account Settings</h1>

        <div className="account-field">
          <label className="account-label">Email</label>
          <p className="account-value">{user?.email || 'Unknown'}</p>
        </div>

        <div className="account-summary">
          <p>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}</p>
          <p>{user?.pets?.length || 0} pet{(user?.pets?.length || 0) !== 1 ? 's' : ''}</p>
        </div>

        <a href="mailto:jaberi.mahyar@gmail.com?subject=BowlWise — Bug Report" className="account-feedback-link">Report an issue</a>

        <hr className="account-divider" />

        <div className="account-actions">
          <button type="button" className="account-logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>

        <p className="legal-links-small">
          <Link to="/privacy">Privacy Policy</Link> &middot; <Link to="/terms">Terms of Service</Link>
        </p>

        <hr className="account-divider" />

        {!showDelete ? (
          <button
            type="button"
            className="account-delete-trigger"
            onClick={() => setShowDelete(true)}
          >
            Delete Account
          </button>
        ) : (
          <div className="account-delete-confirm">
            <p className="account-delete-warning">
              This will permanently delete your account, pet profiles, and purchase history. This cannot be undone.
            </p>
            <div className="account-delete-actions">
              <button
                type="button"
                className="account-delete-btn"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button
                type="button"
                className="account-cancel-btn"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>
              {deleteError && <p className="login-error">{deleteError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
