/**
 * App — Root component with route definitions.
 *
 * Routes:
 *   /                    → PetForm (redirects to /dashboard if authenticated)
 *   /login               → LoginPage (magic link email entry)
 *   /auth/verify/:token  → MagicLinkVerify (processes magic link)
 *   /recommendations     → Recommendations (food results)
 *   /dashboard           → Dashboard (protected — pet profile, purchases)
 *   /dashboard/add-pet   → PetForm (protected — add pet to account)
 *   /account             → AccountPage (protected — settings, logout, delete)
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';

// Disable browser's automatic scroll restoration
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}
import PetForm from './pages/PetForm';
import Recommendations from './pages/Recommendations';
import LoginPage from './pages/LoginPage';
import MagicLinkVerify from './pages/MagicLinkVerify';
import Dashboard from './pages/Dashboard';
import AccountPage from './pages/AccountPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const AuthRedirect = ({ children }) => {
  const [params] = useSearchParams();
  if (params.get('new') === 'true') return children;
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <ErrorBoundary>
    <Router>
      <Routes>
        <Route path="/" element={<AuthRedirect><PetForm /></AuthRedirect>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify/:token" element={<MagicLinkVerify />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/add-pet" element={<ProtectedRoute><PetForm /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
