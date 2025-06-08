import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import BookmarkList from './components/BookmarkList';
import BookmarkForm from './components/BookmarkForm';
import { Bookmark } from './models/Bookmark';
import { BookmarkService, toggleApiMode, getApiMode, getNetworkStatus } from './services/BookmarkService';
import { NetworkService, NetworkStatus } from './services/NetworkService';

function App(): React.ReactElement {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<string>(getApiMode());
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(getNetworkStatus());

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await BookmarkService.getAllBookmarks();
      setBookmarks(data);
      setError(null);
    } catch (err) {
      const errorMessage = networkStatus.isOnline ? 'Failed to load bookmarks' : 'Offline: Showing cached bookmarks';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [networkStatus.isOnline]);

  useEffect(() => {
    // Load bookmarks when component mounts
    fetchBookmarks();

    // Set up network status monitoring
    const unsubscribe = NetworkService.addNetworkListener((status) => {
      setNetworkStatus(status);
      if (status.isOnline) {
        // When coming back online, refresh bookmarks
        fetchBookmarks();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchBookmarks]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const updatedBookmark = await BookmarkService.markAsRead(id);
      setBookmarks(prevBookmarks => 
        prevBookmarks.map(bookmark => 
          bookmark.id === id ? updatedBookmark : bookmark
        )
      );
    } catch (err) {
      const errorMessage = networkStatus.isOnline ? 'Failed to mark bookmark as read' : 'Bookmark updated offline';
      setError(errorMessage);
      console.error(err);
    }
  };

  const handleAddBookmark = async (title: string, url: string) => {
    try {
      const newBookmark = await BookmarkService.addBookmark({ title, url });
      setBookmarks(prevBookmarks => [...prevBookmarks, newBookmark]);
    } catch (err) {
      const errorMessage = networkStatus.isOnline ? 'Failed to add bookmark' : 'Bookmark added offline';
      setError(errorMessage);
      console.error(err);
    }
  };

  const handleDeleteBookmark = async (id: number) => {
    try {
      await BookmarkService.deleteBookmark(id);
      setBookmarks(prevBookmarks => prevBookmarks.filter(bookmark => bookmark.id !== id));
    } catch (err) {
      const errorMessage = networkStatus.isOnline ? 'Failed to delete bookmark' : 'Bookmark deleted offline';
      setError(errorMessage);
      console.error(err);
    }
  };

  const handleToggleApiMode = () => {
    toggleApiMode();
    setApiMode(getApiMode());
    fetchBookmarks(); // Reload bookmarks with new API mode
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bookmark Manager</h1>
        <div className="status-bar">
          <div className="api-toggle">
            <span>API Mode: {apiMode}</span>
            <button onClick={handleToggleApiMode}>Toggle API Mode</button>
          </div>
          <div className="network-status">
            <span className={`status-indicator ${networkStatus.isOnline ? 'online' : 'offline'}`}>
              {networkStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
            {!networkStatus.isOnline && <span className="offline-note">Changes will sync when online</span>}
          </div>
        </div>
      </header>
      <main className="App-main">
        <div className="container">
          {error && <div className="error-message">{error}</div>}
          
          <BookmarkForm onAddBookmark={handleAddBookmark} />
          
          {loading ? (
            <p>Loading bookmarks...</p>
          ) : (
            <BookmarkList 
              bookmarks={bookmarks} 
              onMarkAsRead={handleMarkAsRead}
              onDeleteBookmark={handleDeleteBookmark}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;