import React from 'react';
import { Bookmark } from '../models/Bookmark';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onMarkAsRead: (id: number) => void;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ bookmarks, onMarkAsRead }) => {
  return (
    <div className="bookmark-list">
      <h2>Bookmarks</h2>
      {bookmarks.length === 0 ? (
        <p>No bookmarks available.</p>
      ) : (
        <ul className="bookmark-items">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id} className={`bookmark-item ${bookmark.read_date ? 'read' : 'unread'}`}>
              <div className="bookmark-info">
                <h3>
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                    {bookmark.title}
                  </a>
                </h3>
                <p className="bookmark-url">{bookmark.url}</p>
                <p className="bookmark-date">
                  Created: {new Date(bookmark.create_date).toLocaleDateString()}
                </p>
                {bookmark.read_date && (
                  <p className="bookmark-date">
                    Read: {new Date(bookmark.read_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="bookmark-actions">
                {!bookmark.read_date && (
                  <button 
                    onClick={() => onMarkAsRead(bookmark.id)}
                    className="mark-read-button"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BookmarkList;