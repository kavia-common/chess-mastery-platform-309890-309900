import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

// PUBLIC_INTERFACE
export function ProtectedRoute({ children }) {
  /** Gate content behind authentication. */
  const { isAuthed, loading } = useAuth();
  if (loading) return <div className="pageCenter">Loading…</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}
