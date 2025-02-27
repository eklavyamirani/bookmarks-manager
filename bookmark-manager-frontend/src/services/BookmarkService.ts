import { Bookmark } from "../models/Bookmark";

// Initial mock data
const mockBookmarks: Bookmark[] = [
  {
    id: 1,
    url: "https://reactjs.org",
    title: "React Documentation",
    create_date: new Date(2023, 0, 15).toISOString(),
    read_date: null,
  },
  {
    id: 2,
    url: "https://typescript-lang.org",
    title: "TypeScript Documentation",
    create_date: new Date(2023, 1, 10).toISOString(),
    read_date: new Date(2023, 1, 12).toISOString(),
  },
  {
    id: 3,
    url: "https://developer.mozilla.org",
    title: "MDN Web Docs",
    create_date: new Date(2023, 2, 5).toISOString(),
    read_date: null,
  },
];

// In-memory store for our mock API
let bookmarks = [...mockBookmarks];

export const BookmarkService = {
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
  // Updated to accept just title and url
  addBookmark: async (bookmark: { title: string; url: string }): Promise<Bookmark> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newBookmark: Bookmark = {
          id: Math.max(...bookmarks.map(b => b.id), 0) + 1,
          ...bookmark,
          create_date: new Date().toISOString(),
          read_date: null
        };
        bookmarks.push(newBookmark);
        resolve(newBookmark);
      }, 300);
    });
  }
};