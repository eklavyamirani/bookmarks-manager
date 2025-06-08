import { Bookmark } from "../models/Bookmark";
import { ApiBookmarkService } from "./ApiBookmarkService";
import { OfflineStorageService } from "./OfflineStorageService";
import { NetworkService } from "./NetworkService";

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

// Enhanced service with offline capabilities
const OfflineCapableService = {
  getAllBookmarks: async (): Promise<Bookmark[]> => {
    const networkStatus = NetworkService.getNetworkStatus();
    
    if (networkStatus.isOnline) {
      try {
        const onlineBookmarks = useRealApi 
          ? await ApiBookmarkService.getAllBookmarks()
          : await MockService.getAllBookmarks();
        
        // Cache the data for offline use
        OfflineStorageService.saveOfflineData(onlineBookmarks);
        return onlineBookmarks;
      } catch (error) {
        console.log('Network request failed, falling back to offline data:', error);
        // Fall back to offline data if network request fails
        const offlineData = OfflineStorageService.getOfflineData();
        return offlineData.bookmarks;
      }
    } else {
      console.log('Offline mode: Loading bookmarks from local storage');
      const offlineData = OfflineStorageService.getOfflineData();
      return offlineData.bookmarks;
    }
  },

  markAsRead: async (id: number): Promise<Bookmark> => {
    const networkStatus = NetworkService.getNetworkStatus();
    
    if (networkStatus.isOnline) {
      try {
        const updatedBookmark = useRealApi
          ? await ApiBookmarkService.markAsRead(id)
          : await MockService.markAsRead(id);
        
        // Update offline storage
        OfflineStorageService.updateBookmarkOffline(id, { read_date: updatedBookmark.read_date });
        return updatedBookmark;
      } catch (error) {
        console.log('Network request failed, updating offline:', error);
        // Fall back to offline update
        const updatedBookmark = OfflineStorageService.updateBookmarkOffline(id, { 
          read_date: new Date().toISOString() 
        });
        if (!updatedBookmark) {
          throw new Error("Bookmark not found");
        }
        return updatedBookmark;
      }
    } else {
      console.log('Offline mode: Marking bookmark as read locally');
      const updatedBookmark = OfflineStorageService.updateBookmarkOffline(id, { 
        read_date: new Date().toISOString() 
      });
      if (!updatedBookmark) {
        throw new Error("Bookmark not found");
      }
      return updatedBookmark;
    }
  },

  addBookmark: async (bookmark: { title: string; url: string }): Promise<Bookmark> => {
    const networkStatus = NetworkService.getNetworkStatus();
    
    if (networkStatus.isOnline) {
      try {
        const newBookmark = useRealApi
          ? await ApiBookmarkService.addBookmark(bookmark)
          : await MockService.addBookmark(bookmark);
        
        // Update offline storage
        const offlineData = OfflineStorageService.getOfflineData();
        offlineData.bookmarks.push(newBookmark);
        OfflineStorageService.saveOfflineData(offlineData.bookmarks);
        
        return newBookmark;
      } catch (error) {
        console.log('Network request failed, adding bookmark offline:', error);
        // Fall back to offline creation
        const newBookmark = OfflineStorageService.addBookmarkOffline({
          ...bookmark,
          created_at: new Date().toISOString(),
          read_date: null
        });
        return newBookmark;
      }
    } else {
      console.log('Offline mode: Adding bookmark locally');
      const newBookmark = OfflineStorageService.addBookmarkOffline({
        ...bookmark,
        created_at: new Date().toISOString(),
        read_date: null
      });
      return newBookmark;
    }
  },

  deleteBookmark: async (id: number): Promise<void> => {
    const networkStatus = NetworkService.getNetworkStatus();
    
    if (networkStatus.isOnline) {
      try {
        useRealApi
          ? await ApiBookmarkService.deleteBookmark(id)
          : await MockService.deleteBookmark(id);
        
        // Update offline storage
        OfflineStorageService.deleteBookmarkOffline(id);
      } catch (error) {
        console.log('Network request failed, deleting bookmark offline:', error);
        // Fall back to offline deletion
        const success = OfflineStorageService.deleteBookmarkOffline(id);
        if (!success) {
          throw new Error("Bookmark not found");
        }
      }
    } else {
      console.log('Offline mode: Deleting bookmark locally');
      const success = OfflineStorageService.deleteBookmarkOffline(id);
      if (!success) {
        throw new Error("Bookmark not found");
      }
    }
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

export const getNetworkStatus = () => {
  return NetworkService.getNetworkStatus();
};

// Export the enhanced service that handles offline scenarios
export const BookmarkService = OfflineCapableService;

// Initialize network monitoring
NetworkService.initialize();