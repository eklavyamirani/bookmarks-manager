import { Bookmark } from "../models/Bookmark";
import { ApiBookmarkService } from "./ApiBookmarkService";

// Initial mock data
const mockBookmarks: Bookmark[] = [
  {
    id: 1,
    url: "https://reactjs.org",
    title: "React Documentation",
    created_at: new Date(2023, 0, 15).toISOString(),
    read_date: null,
  },
  {
    id: 2,
    url: "https://typescript-lang.org",
    title: "TypeScript Documentation",
    created_at: new Date(2023, 1, 10).toISOString(),
    read_date: new Date(2023, 1, 12).toISOString(),
  },
  {
    id: 3,
    url: "https://developer.mozilla.org",
    title: "MDN Web Docs",
    created_at: new Date(2023, 2, 5).toISOString(),
    read_date: null,
  },
];

// In-memory store for our mock API
let bookmarks = [...mockBookmarks];

// Mock service implementation
const MockService = {
  // Get all bookmarks
  getAllBookmarks: async (): Promise<Bookmark[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...bookmarks]);
      }, 300); // Simulate network delay
    });
  },
  
  // Mark a bookmark as read
  markAsRead: async (id: number): Promise<Bookmark> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const bookmarkIndex = bookmarks.findIndex((b) => b.id === id);
        if (bookmarkIndex !== -1) {
          bookmarks[bookmarkIndex] = {
            ...bookmarks[bookmarkIndex],
            read_date: new Date().toISOString(),
          };
          resolve(bookmarks[bookmarkIndex]);
        } else {
          reject(new Error("Bookmark not found"));
        }
      }, 300);
    });
  },
  
  // Add a new bookmark
  addBookmark: async (bookmark: { title: string; url: string }): Promise<Bookmark> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newBookmark: Bookmark = {
          id: Math.max(...bookmarks.map(b => b.id), 0) + 1,
          ...bookmark,
          created_at: new Date().toISOString(),
          read_date: null
        };
        bookmarks.push(newBookmark);
        resolve(newBookmark);
      }, 300);
    });
  },
  
  // Delete a bookmark
  deleteBookmark: async (id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const bookmarkIndex = bookmarks.findIndex((b) => b.id === id);
        if (bookmarkIndex !== -1) {
          bookmarks.splice(bookmarkIndex, 1);
          resolve();
        } else {
          reject(new Error("Bookmark not found"));
        }
      }, 300);
    });
  }
};

// Determine which service to use
// This can be controlled by environment variables, local storage, or UI toggle
let useRealApi = false; // Default to mock API

export const toggleApiMode = () => {
  useRealApi = !useRealApi;
  return useRealApi;
};

export const getApiMode = () => {
  return useRealApi ? "Backend API" : "Mock API";
};

// Export the combined service that delegates to either the mock or real API
export const BookmarkService = {
  getAllBookmarks: async (): Promise<Bookmark[]> => {
    return useRealApi 
      ? ApiBookmarkService.getAllBookmarks() 
      : MockService.getAllBookmarks();
  },
  
  markAsRead: async (id: number): Promise<Bookmark> => {
    return useRealApi 
      ? ApiBookmarkService.markAsRead(id) 
      : MockService.markAsRead(id);
  },
  
  addBookmark: async (bookmark: { title: string; url: string }): Promise<Bookmark> => {
    return useRealApi 
      ? ApiBookmarkService.addBookmark(bookmark) 
      : MockService.addBookmark(bookmark);
  },
  
  deleteBookmark: async (id: number): Promise<void> => {
    return useRealApi 
      ? ApiBookmarkService.deleteBookmark(id) 
      : MockService.deleteBookmark(id);
  }
};