import React, { useEffect, useState, useMemo } from 'react';
import { Bookmark } from '../models/Bookmark';

// Helper function to format dates properly
const formatDate = (dateInput: any): string => {
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
    return 'Date format error';
  } catch (error) {
    console.error('Error parsing date:', dateInput, error);
    return 'Date error';
  }
};

type SortField = 'date' | 'title';
type SortDirection = 'asc' | 'desc';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onMarkAsRead: (id: number) => void;
  onDeleteBookmark: (id: number) => void;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ bookmarks, onMarkAsRead, onDeleteBookmark }) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filtering and sorting function
  const sortedBookmarks = useMemo(() => {
    // First filter bookmarks based on search term
    const filtered = bookmarks.filter((bookmark) => {
      if (!searchTerm.trim()) return true;
      
      const title = (bookmark.title || '').toLowerCase();
      const url = (bookmark.url || bookmark.link || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return title.includes(searchLower) || url.includes(searchLower);
    });
    
    // Then sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.created_at || '');
        const dateB = new Date(b.created_at || '');
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return sortDirection === 'asc' 
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } else {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        
        return sortDirection === 'asc' 
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      }
    });
    
    return sorted;
  }, [bookmarks, sortField, sortDirection, searchTerm]);
  
  useEffect(() => {
    // Debug logging removed for production
  }, [bookmarks]);

  return (
    <div className="bookmark-list">
      <div className="bookmark-list-header">
        <h2>Bookmarks</h2>
        <div className="controls-container">
          <div className="search-controls">
            <label htmlFor="search-input">Search:</label>
            <input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search titles and URLs..."
              className="search-input"
            />
          </div>
          <div className="sort-controls">
            <label htmlFor="sort-field">Sort by:</label>
            <select 
              id="sort-field"
              value={sortField} 
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="sort-select"
            >
              <option value="date">Create Date</option>
              <option value="title">Title (A-Z)</option>
            </select>
            
            <button 
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="sort-direction-button"
              title={`Currently sorting ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
      
      {bookmarks.length === 0 ? (
        <p>No bookmarks available.</p>
      ) : sortedBookmarks.length === 0 ? (
        <p>No bookmarks match your search criteria.</p>
      ) : (
        <ul className="bookmark-items">
          {sortedBookmarks.map((bookmark) => (
            <li key={bookmark.id} className={`bookmark-item ${bookmark.read_date ? 'read' : 'unread'}`}>
              <div className="bookmark-info">
                <h3>
                  <a href={bookmark.url || bookmark.link} target="_blank" rel="noopener noreferrer">
                    {bookmark.title || bookmark.url || bookmark.link || "Untitled"}
                  </a>
                </h3>
                <p className="bookmark-url">{bookmark.url || bookmark.link}</p>
                <p className="bookmark-date">
                  Created: {formatDate(bookmark.created_at)}
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