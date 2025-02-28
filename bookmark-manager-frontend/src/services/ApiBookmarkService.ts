import { Bookmark } from "../models/Bookmark";

// Use relative path for API requests - the proxy setting in package.json will handle routing to http://localhost:5000
const API_BASE_URL = '/api/bookmarks';

export const ApiBookmarkService = {
  // Get all bookmarks from API
  getAllBookmarks: async (): Promise<Bookmark[]> => {
    const response = await fetch(API_BASE_URL);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  },

  // Mark a bookmark as read via API
  markAsRead: async (id: number): Promise<Bookmark> => {
    const response = await fetch(`${API_BASE_URL}/${id}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  },

  // Add a new bookmark via API
  addBookmark: async (bookmark: { title: string; url: string }): Promise<Bookmark> => {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: bookmark.title,
        url: bookmark.url
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  },

  // Delete a bookmark via API
  deleteBookmark: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
  }
};