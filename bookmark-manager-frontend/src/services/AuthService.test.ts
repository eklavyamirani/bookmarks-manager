import { AuthService } from './AuthService';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AuthService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('getCurrentUser', () => {
    test('returns authenticated state when user is logged in', async () => {
      const mockUser = {
        authenticated: true,
        user: {
          login: 'testuser',
          name: 'Test User',
          url: 'https://github.com/testuser'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      const result = await AuthService.getCurrentUser();
      
      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith('/api/../auth/user', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
    });

    test('returns unauthenticated state when user is not logged in', async () => {
      const mockResponse = { authenticated: false };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await AuthService.getCurrentUser();
      
      expect(result).toEqual({ authenticated: false });
    });

    test('returns unauthenticated state when request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await AuthService.getCurrentUser();
      
      expect(result).toEqual({ authenticated: false });
    });
  });

  describe('logout', () => {
    test('calls logout endpoint', async () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { ...window.location, href: '' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await AuthService.logout();

      expect(mockFetch).toHaveBeenCalledWith('/api/../auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      expect(window.location.href).toBe('/');
    });
  });
});