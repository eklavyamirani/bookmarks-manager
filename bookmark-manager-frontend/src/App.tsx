import React, { useEffect, useState } from 'react';
import './App.css';
import BookmarkList from './components/BookmarkList';
import BookmarkForm from './components/BookmarkForm';
import { Bookmark } from './models/Bookmark';
import { BookmarkService } from './services/BookmarkService';

function App(): React.ReactElement {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load bookmarks when component mounts
    fetchBookmarks();
  }, []);

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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bookmark Manager</h1>
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
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;