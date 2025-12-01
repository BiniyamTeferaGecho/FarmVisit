// FrontEnd/src/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    // show spinner while checking refresh
    return <div className="p-6">Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    // send to login with original location so we can return after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}