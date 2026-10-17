import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, UNAUTHORIZED_EVENT } from '../lib/api.js';
import { ROLES } from '../lib/constants.js';

const AuthContext = createContext(null);

/**
 * Owns the session: the JWT in localStorage and the current user object.
 * On mount it re-validates the stored token against GET /api/auth/me so a
 * stale or forged token is discarded instead of trusted.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.me();
        if (!cancelled) setUser(response.data.user);
      } catch {
        tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The API layer broadcasts this when a request comes back 401.
  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const persist = (data) => {
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  };

  const login = useCallback(async (credentials) => {
    const response = await api.login(credentials);
    return persist(response.data);
  }, []);

  const register = useCallback(async (payload) => {
    const response = await api.register(payload);
    return persist(response.data);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === ROLES.ADMIN,
      isCitizen: user?.role === ROLES.CITIZEN,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>.');
  return context;
}

export default AuthContext;
