import { Bookmark } from "../models/Bookmark";

const STORAGE_KEY = 'bookmark-manager-offline-data';
const LAST_SYNC_KEY = 'bookmark-manager-last-sync';

export interface OfflineData {
  bookmarks: Bookmark[];
  lastSync: string;
}

export class OfflineStorageService {
  static getOfflineData(): OfflineData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      
      if (data) {
        return {
          bookmarks: JSON.parse(data),
          lastSync: lastSync || new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error reading offline data:', error);
    }
    
    return {
      bookmarks: [],
      lastSync: new Date().toISOString()
    };
  }

  static saveOfflineData(bookmarks: Bookmark[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  static addBookmarkOffline(bookmark: Omit<Bookmark, 'id'>): Bookmark {
    const data = this.getOfflineData();
    const maxId = Math.max(...data.bookmarks.map(b => b.id), 0);
    const newBookmark: Bookmark = {
      ...bookmark,
      id: maxId + 1
    };
    
    data.bookmarks.push(newBookmark);
    this.saveOfflineData(data.bookmarks);
    
    return newBookmark;
  }

  static updateBookmarkOffline(id: number, updates: Partial<Bookmark>): Bookmark | null {
    const data = this.getOfflineData();
    const bookmarkIndex = data.bookmarks.findIndex(b => b.id === id);
    
    if (bookmarkIndex !== -1) {
      data.bookmarks[bookmarkIndex] = {
        ...data.bookmarks[bookmarkIndex],
        ...updates
      };
      this.saveOfflineData(data.bookmarks);
      return data.bookmarks[bookmarkIndex];
    }
    
    return null;
  }

  static deleteBookmarkOffline(id: number): boolean {
    const data = this.getOfflineData();
    const initialLength = data.bookmarks.length;
    data.bookmarks = data.bookmarks.filter(b => b.id !== id);
    
    if (data.bookmarks.length < initialLength) {
      this.saveOfflineData(data.bookmarks);
      return true;
    }
    
    return false;
  }

  static clearOfflineData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }
}