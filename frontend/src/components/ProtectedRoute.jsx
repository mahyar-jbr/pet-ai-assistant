/**
 * ProtectedRoute — Redirects to /login if not authenticated.
 * Wraps protected routes in App.jsx.
 * @param {ReactNode} children
 */
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
