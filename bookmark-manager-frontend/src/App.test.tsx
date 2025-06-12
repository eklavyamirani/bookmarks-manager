import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { AuthService } from './services/AuthService';

// Mock the AuthService
jest.mock('./services/AuthService');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('App Component', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUser.mockClear();
  });

  test('renders bookmark manager title', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue({ authenticated: false });
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/bookmark manager/i)).toBeInTheDocument();
    });
  });

  test('shows login message when not authenticated', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue({ authenticated: false });
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/please log in with your github account/i)).toBeInTheDocument();
    });
  });

  test('shows login button when not authenticated', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue({ authenticated: false });
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login with github/i })).toBeInTheDocument();
    });
  });

  test('shows bookmarks content when authenticated', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue({
      authenticated: true,
      user: {
        login: 'testuser',
        name: 'Test User',
        url: 'https://github.com/testuser'
      }
    });
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/welcome, test user!/i)).toBeInTheDocument();
    });
  });
});