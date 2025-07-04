import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const playerName = localStorage.getItem('playerName');

  if (!playerName) {
    return <Navigate to="/name" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 