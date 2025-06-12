import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthState, AuthService } from '../services/AuthService';

interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false });
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const newAuthState = await AuthService.getCurrentUser();
      setAuthState(newAuthState);
    } catch (error) {
      console.error('Error refreshing auth:', error);
      setAuthState({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    AuthService.login();
  };

  const logout = async () => {
    await AuthService.logout();
    setAuthState({ authenticated: false });
  };

  useEffect(() => {
    // Check if we're returning from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    refreshAuth();
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAuth,
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};