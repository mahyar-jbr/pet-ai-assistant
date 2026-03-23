/**
 * MagicLinkVerify — Processes magic link token from email. Shows spinner during verification,
 * green checkmark on success (1s), then redirects to /dashboard. Passes session_token for pet claiming.
 * @route /auth/verify/:token
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { verifyMagicLink } from '../api/petApi';
import { setToken } from '../utils/auth';
import '../styles/login.css';

const MagicLinkVerify = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const sessionToken = localStorage.getItem('sessionToken') || undefined;
        const data = await verifyMagicLink(token, sessionToken);
        if (cancelled) return;
        setToken(data.access_token);
        setSuccess(true);
        setTimeout(() => {
          if (!cancelled) navigate('/dashboard', { replace: true });
        }, 1000);
      } catch {
        if (cancelled) return;
        setError('This link is invalid or expired.');
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div className="login-page page-transition">
      <div className="login-card">
        <img src="/logo.png" alt="BowlWise" className="login-logo" />
        {error ? (
          <>
            <h2 className="login-subtitle">{error}</h2>
            <Link to="/login" className="login-resend verify-action-link">
              Request a new one
            </Link>
          </>
        ) : success ? (
          <>
            <div className="verify-checkmark">&#10003;</div>
            <p className="login-description verify-success-text">Welcome! Redirecting to your dashboard...</p>
          </>
        ) : (
          <>
            <div className="login-spinner" />
            <p className="login-description">Verifying your link...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MagicLinkVerify;
