import React, { useEffect, useState } from 'react';
import './App.css';
import BookmarkList from './components/BookmarkList';
import BookmarkForm from './components/BookmarkForm';
import LoginComponent from './components/LoginComponent';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Bookmark } from './models/Bookmark';
import { BookmarkService, toggleApiMode, getApiMode } from './services/BookmarkService';

function AppContent(): React.ReactElement {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<string>(getApiMode());
  const { authenticated } = useAuth();

  useEffect(() => {
    // Load bookmarks when component mounts or auth state changes
    if (authenticated) {
      fetchBookmarks();
    } else {
      setLoading(false);
      setBookmarks([]);
    }
  }, [authenticated]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const data = await BookmarkService.getAllBookmarks();
      setBookmarks(data);
      setError(null);
    } catch (err) {
      setError('Failed to load bookmarks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const updatedBookmark = await BookmarkService.markAsRead(id);
      setBookmarks(prevBookmarks => 
        prevBookmarks.map(bookmark => 
          bookmark.id === id ? updatedBookmark : bookmark
        )
      );
    } catch (err) {
      setError('Failed to mark bookmark as read');
      console.error(err);
    }
  };

  const handleAddBookmark = async (title: string, url: string) => {
    try {
      const newBookmark = await BookmarkService.addBookmark({ title, url });
      setBookmarks(prevBookmarks => [...prevBookmarks, newBookmark]);
    } catch (err) {
      setError('Failed to add bookmark');
      console.error(err);
    }
  };

  const handleDeleteBookmark = async (id: number) => {
    try {
      await BookmarkService.deleteBookmark(id);
      setBookmarks(prevBookmarks => prevBookmarks.filter(bookmark => bookmark.id !== id));
    } catch (err) {
      setError('Failed to delete bookmark');
      console.error(err);
    }
  };

  const handleToggleApiMode = () => {
    toggleApiMode();
    setApiMode(getApiMode());
    if (authenticated) {
      fetchBookmarks(); // Reload bookmarks with new API mode
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bookmark Manager</h1>
        <div className="header-controls">
          <div className="api-toggle">
            <span>API Mode: {apiMode}</span>
            <button onClick={handleToggleApiMode}>Toggle API Mode</button>
          </div>
          <LoginComponent />
        </div>
      </header>
      <main className="App-main">
        <div className="container">
          {error && <div className="error-message">{error}</div>}
          
          {!authenticated ? (
            <div className="auth-message">
              <p>Please log in with your GitHub account to access your bookmarks.</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;