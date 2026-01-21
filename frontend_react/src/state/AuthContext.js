import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides auth state (user, token) and actions (login/register/logout). */
  const [token, setToken] = useState(api.token.get());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // initial profile fetch
  const [error, setError] = useState(null);

  const refreshMe = useCallback(async () => {
    const t = api.token.get();
    setToken(t);
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.profile.me();
      setUser(res.user || res);
      setError(null);
    } catch (e) {
      // token invalid/expired
      api.token.clear();
      setToken(null);
      setUser(null);
      setError(e.message || 'Session expired');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async ({ usernameOrEmail, password }) => {
    const res = await api.auth.login({ usernameOrEmail, password });
    api.token.set(res.token);
    setToken(res.token);
    setUser(res.user);
    setError(null);
    return res.user;
  }, []);

  const register = useCallback(async ({ username, email, password }) => {
    const res = await api.auth.register({ username, email, password });
    api.token.set(res.token);
    setToken(res.token);
    setUser(res.user);
    setError(null);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    api.token.clear();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const updateProfile = useCallback(async ({ username, email }) => {
    const res = await api.profile.update({ username, email });
    setUser(res.user || res);
    return res.user || res;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      isAuthed: Boolean(token && user),
      actions: {
        login,
        register,
        logout,
        refreshMe,
        updateProfile,
      },
    }),
    [token, user, loading, error, login, register, logout, refreshMe, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access auth context. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
