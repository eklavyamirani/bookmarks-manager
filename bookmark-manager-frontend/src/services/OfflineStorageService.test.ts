import { OfflineStorageService } from '../services/OfflineStorageService';
import { Bookmark } from '../models/Bookmark';

describe('OfflineStorageService', () => {
  const mockBookmark: Bookmark = {
    id: 1,
    title: 'Test Bookmark',
    url: 'https://example.com',
    created_at: '2023-01-01T00:00:00.000Z',
    read_date: null
  };

  beforeEach(() => {
    // Clear localStorage before each test
    OfflineStorageService.clearOfflineData();
  });

  afterEach(() => {
    // Clean up after each test
    OfflineStorageService.clearOfflineData();
  });

  test('should save and retrieve bookmarks from offline storage', () => {
    const bookmarks = [mockBookmark];
    
    OfflineStorageService.saveOfflineData(bookmarks);
    const retrievedData = OfflineStorageService.getOfflineData();
    
    expect(retrievedData.bookmarks).toEqual(bookmarks);
    expect(retrievedData.lastSync).toBeDefined();
  });

  test('should add bookmark offline', () => {
    const newBookmark = OfflineStorageService.addBookmarkOffline({
      title: 'New Bookmark',
      url: 'https://new.com',
      created_at: '2023-01-02T00:00:00.000Z',
      read_date: null
    });

    expect(newBookmark.id).toBe(1);
    expect(newBookmark.title).toBe('New Bookmark');
    
    const data = OfflineStorageService.getOfflineData();
    expect(data.bookmarks).toHaveLength(1);
    expect(data.bookmarks[0]).toEqual(newBookmark);
  });

  test('should update bookmark offline', () => {
    // First add a bookmark
    const bookmarks = [mockBookmark];
    OfflineStorageService.saveOfflineData(bookmarks);

    // Update it
    const readDate = '2023-01-01T12:00:00.000Z';
    const updatedBookmark = OfflineStorageService.updateBookmarkOffline(1, {
      read_date: readDate
    });

    expect(updatedBookmark).toBeTruthy();
    expect(updatedBookmark?.read_date).toBe(readDate);

    const data = OfflineStorageService.getOfflineData();
    expect(data.bookmarks[0].read_date).toBe(readDate);
  });

  test('should delete bookmark offline', () => {
    // First add a bookmark
    const bookmarks = [mockBookmark];
    OfflineStorageService.saveOfflineData(bookmarks);

    const success = OfflineStorageService.deleteBookmarkOffline(1);
    expect(success).toBe(true);

    const data = OfflineStorageService.getOfflineData();
    expect(data.bookmarks).toHaveLength(0);
  });

  test('should return empty data when no offline data exists', () => {
    const data = OfflineStorageService.getOfflineData();
    
    expect(data.bookmarks).toEqual([]);
    expect(data.lastSync).toBeDefined();
  });
});