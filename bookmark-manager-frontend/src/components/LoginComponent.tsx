import React from 'react';
import { useAuth } from './AuthProvider';

const LoginComponent: React.FC = () => {
  const { authenticated, user, login, logout } = useAuth();

  if (authenticated && user) {
    return (
      <div className="auth-info">
        <span>Welcome, {user.name || user.login}!</span>
        <button onClick={logout} className="auth-button logout-button">
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="auth-info">
      <span>Please log in to manage your bookmarks</span>
      <button onClick={login} className="auth-button login-button">
        Login with GitHub
      </button>
    </div>
  );
};

export default LoginComponent;