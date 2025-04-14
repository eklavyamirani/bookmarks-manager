import React, { useEffect } from 'react';
import { Bookmark } from '../models/Bookmark';

// Helper function to format dates properly
const formatDate = (dateInput: any): string => {
  // Log the exact input for debugging
  console.log('Date input:', dateInput, 'Type:', typeof dateInput);
  
  // Handle null, undefined or empty string cases
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return 'No date available';
  }
  
  try {
    let date;
    
    // If it's already a Date object
    if (dateInput instanceof Date) {
      date = dateInput;
    } 
    // If it's a string, try to parse it
    else if (typeof dateInput === 'string') {
      // Try to parse the date string
      date = new Date(dateInput);
    } 
    // If it's a number (timestamp)
    else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    }
    // If it's an object with a date property
    else if (typeof dateInput === 'object') {
      // Try to extract date information from the object
      const possibleDateString = dateInput.toString();
      date = new Date(possibleDateString);
    }
    
    // Check if date is valid
    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // If we reached here, date couldn't be parsed successfully
    console.warn(`Could not parse date:`, dateInput);
    return 'Date format error';
  } catch (error) {
    console.error('Error parsing date:', dateInput, error);
    return 'Date error';
  }
};

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onMarkAsRead: (id: number) => void;
  onDeleteBookmark: (id: number) => void;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ bookmarks, onMarkAsRead, onDeleteBookmark }) => {
  
  useEffect(() => {
    if (bookmarks.length > 0) {
      console.log('All bookmarks date info:');
      bookmarks.forEach(bookmark => {
        console.log(`ID ${bookmark.id} - Type: ${typeof bookmark.create_date}, Value: "${bookmark.create_date}", Raw: ${JSON.stringify(bookmark)}`);
      });
    }
  }, [bookmarks]);

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
                  <a href={bookmark.url || bookmark.link} target="_blank" rel="noopener noreferrer">
                    {bookmark.title || bookmark.url || bookmark.link || "Untitled"}
                  </a>
                </h3>
                <p className="bookmark-url">{bookmark.url || bookmark.link}</p>
                <p className="bookmark-date">
                  Created: {formatDate(bookmark.create_date || bookmark.created_at)}
                </p>
                {bookmark.read_date && (
                  <p className="bookmark-date">
                    Read: {formatDate(bookmark.read_date)}
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
                <button 
                  onClick={() => onDeleteBookmark(bookmark.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BookmarkList;