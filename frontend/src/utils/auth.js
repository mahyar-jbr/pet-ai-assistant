/**
 * Auth utilities — JWT token management for magic link authentication.
 * Tokens are stored in localStorage under 'authToken'.
 * Used by petApi.js for authenticated API calls and by components
 * to check login state.
 */

import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'authToken';

/** Read JWT from localStorage. Returns null if not set. */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/** Save JWT to localStorage. */
export const setToken = (jwt) => localStorage.setItem(TOKEN_KEY, jwt);

/** Remove JWT from localStorage. */
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/**
 * Check if the user is authenticated.
 * Reads the JWT, decodes the exp claim, and compares to current time.
 * Returns false if token is missing, malformed, or expired.
 */
export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    if (!exp) return false;
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
};

/**
 * Build Authorization header for authenticated API calls.
 * Returns { Authorization: 'Bearer {token}' } or empty object if not logged in.
 */
export const getAuthHeader = () => {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};
