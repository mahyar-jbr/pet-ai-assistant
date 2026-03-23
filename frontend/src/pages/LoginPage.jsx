/**
 * LoginPage — Magic link email entry with 3 states: form, sent confirmation, error.
 * Includes 30-second resend cooldown.
 * @route /login
 */
import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sendMagicLink } from '../api/petApi';
import '../styles/login.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [view, setView] = useState('form'); // 'form' | 'sent' | 'error'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const [resendCooldown, setResendCooldown] = useState(0);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendMagicLink(email);
      setView('sent');
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a few minutes.');
      } else {
        setError('We couldn\u2019t send the link right now. Please try again.');
      }
      setView('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    try {
      await sendMagicLink(email);
      setResendCooldown(30);
    } catch {
      setError('Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, resendCooldown]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleDifferentEmail = () => {
    setEmail('');
    setView('form');
    setError('');
  };

  return (
    <div className="login-page page-transition">
      <div className="login-card">
        <img src="/logo.png" alt="BowlWise" className="login-logo" />
        <h1 className="login-title">BowlWise</h1>

        {view === 'form' || view === 'error' ? (
          <>
            <h2 className="login-subtitle">Sign in to your account</h2>
            <p className="login-description">
              Enter your email and we'll send you a link to sign in.
            </p>
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <input
                  type="email"
                  className={`login-input${error ? ' login-input--error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoFocus
                  autoComplete="email"
                  disabled={loading}
                />
                {error && <span className="login-error">{error}</span>}
              </div>
              <button
                type="submit"
                className="login-submit"
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending...' : 'Send Login Link'}
              </button>
            </form>
            <div className="login-divider">
              <span>or</span>
            </div>
            <p className="login-alt">
              New here? <Link to="/" className="login-alt-link">Start without an account</Link>
            </p>
            <p className="legal-links-small">
              By signing in, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="login-subtitle">Check your email</h2>
            <p className="login-description">
              We sent a login link to <strong>{email}</strong>.
              <br />
              Click the link to sign in. It expires in 15 minutes.
            </p>
            <div className="login-sent-actions">
              <button type="button" className="login-resend" onClick={handleResend} disabled={resendCooldown > 0 || loading}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s...` : loading ? 'Sending...' : 'Resend link'}
              </button>
              {error && <p className="login-error">{error}</p>}
              <button type="button" className="login-alt-action" onClick={handleDifferentEmail}>
                Use a different email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
