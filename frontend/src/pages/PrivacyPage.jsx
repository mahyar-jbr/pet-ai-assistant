/**
 * PrivacyPage — Privacy policy. Public route, no auth required.
 * @route /privacy
 */
import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/login.css';

const PrivacyPage = () => {
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="legal-page page-transition">
      <div className="login-card legal-card">
        <h1 className="login-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: March 2026</p>

        <div className="legal-body">
          <p>Pet AI Assistant ("we", "our") respects your privacy. This policy explains what data we collect, why, and how we protect it.</p>

          <h2>What We Collect</h2>
          <ul>
            <li>Email address (for account creation and login via magic link)</li>
            <li>Pet profile information (name, breed size, age, activity level, dietary goal, allergies)</li>
            <li>Purchase history (products purchased, bag size, feeding amounts)</li>
            <li>Device information (browser type, screen size, referring page)</li>
          </ul>

          <h2>Why We Collect It</h2>
          <ul>
            <li><strong>Email:</strong> to authenticate your account via magic link (passwordless login)</li>
            <li><strong>Pet profile:</strong> to generate personalized food recommendations</li>
            <li><strong>Purchase history:</strong> to track food consumption and estimate reorder timing</li>
            <li><strong>Device info:</strong> to improve the app experience and fix bugs</li>
          </ul>

          <h2>How We Protect It</h2>
          <ul>
            <li>All data transmitted over HTTPS (encrypted in transit)</li>
            <li>Passwords are never collected (we use passwordless magic link authentication)</li>
            <li>Authentication tokens are hashed before storage</li>
            <li>Database hosted on MongoDB Atlas (data encrypted in transit)</li>
          </ul>

          <h2>Third-Party Services</h2>
          <ul>
            <li><strong>Resend</strong> (resend.com): processes your email address to deliver login links</li>
            <li><strong>Vercel</strong> (vercel.com): hosts the frontend, collects anonymous usage analytics</li>
            <li><strong>MongoDB Atlas:</strong> stores your data on encrypted servers</li>
          </ul>

          <h2>Your Rights</h2>
          <ul>
            <li><strong>Access:</strong> view your data anytime on your Dashboard and Account page</li>
            <li><strong>Deletion:</strong> delete your account and all associated data from Account Settings</li>
            <li><strong>Correction:</strong> contact us to update any incorrect information</li>
          </ul>

          <h2>Data Retention</h2>
          <ul>
            <li>Your data is kept as long as your account exists</li>
            <li>When you delete your account, all personal data (profile, pets, purchases) is permanently deleted</li>
          </ul>

          <h2>Contact</h2>
          <p>For privacy questions: <a href="mailto:jaberi.mahyar@gmail.com" className="legal-link">jaberi.mahyar@gmail.com</a></p>

          <p className="legal-note">This policy may be updated. Changes will be posted on this page.</p>
        </div>

        <div className="legal-footer">
          <Link to="/terms" className="legal-link">Terms of Service</Link>
          <span className="legal-dot">&middot;</span>
          <Link to="/" className="legal-link">Back to App</Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
