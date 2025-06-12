export interface User {
  login: string;
  name: string;
  url: string;
}

export interface AuthState {
  authenticated: boolean;
  user?: User;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export class AuthService {
  static async getCurrentUser(): Promise<AuthState> {
    try {
      const response = await fetch(`${API_BASE_URL}/../auth/user`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      return { authenticated: false };
    } catch (error) {
      console.error('Error checking authentication:', error);
      return { authenticated: false };
    }
  }

  static login(): void {
    window.location.href = `${API_BASE_URL}/../auth/login`;
  }

  static async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/../auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
    
    // Redirect to home page after logout
    window.location.href = '/';
  }
}