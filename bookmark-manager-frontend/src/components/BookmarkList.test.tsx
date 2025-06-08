import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BookmarkList from './BookmarkList';
import { Bookmark } from '../models/Bookmark';

// Mock data for testing
const mockBookmarks: Bookmark[] = [
  {
    id: 1,
    title: 'Z Website',
    url: 'https://z-website.com',
    created_at: '2023-01-15T10:00:00Z',
    read_date: null
  },
  {
    id: 2,
    title: 'A Website',
    url: 'https://a-website.com',
    created_at: '2023-01-10T10:00:00Z',
    read_date: null
  },
  {
    id: 3,
    title: 'M Website',
    url: 'https://m-website.com',
    created_at: '2023-01-20T10:00:00Z',
    read_date: null
  }
];

const mockOnMarkAsRead = jest.fn();
const mockOnDeleteBookmark = jest.fn();

describe('BookmarkList Sorting', () => {
  beforeEach(() => {
    mockOnMarkAsRead.mockClear();
    mockOnDeleteBookmark.mockClear();
  });

  test('renders sorting controls', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    expect(screen.getByLabelText('Sort by:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Create Date')).toBeInTheDocument();
    expect(screen.getByTitle(/Currently sorting/)).toBeInTheDocument();
  });

  test('sorts by date descending by default', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const bookmarkItems = screen.getAllByRole('listitem');
    // Should be in date descending order: M Website (2023-01-20), Z Website (2023-01-15), A Website (2023-01-10)
    expect(bookmarkItems[0]).toHaveTextContent('M Website');
    expect(bookmarkItems[1]).toHaveTextContent('Z Website');
    expect(bookmarkItems[2]).toHaveTextContent('A Website');
  });

  test('toggles sort direction when direction button is clicked', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const directionButton = screen.getByTitle(/Currently sorting/);
    
    // Click to change from desc to asc
    fireEvent.click(directionButton);
    
    const bookmarkItems = screen.getAllByRole('listitem');
    // Should be in date ascending order: A Website (2023-01-10), Z Website (2023-01-15), M Website (2023-01-20)
    expect(bookmarkItems[0]).toHaveTextContent('A Website');
    expect(bookmarkItems[1]).toHaveTextContent('Z Website');
    expect(bookmarkItems[2]).toHaveTextContent('M Website');
  });

  test('sorts alphabetically when title sort is selected', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const sortSelect = screen.getByDisplayValue('Create Date');
    
    // Change to title sorting
    fireEvent.change(sortSelect, { target: { value: 'title' } });
    
    const bookmarkItems = screen.getAllByRole('listitem');
    // Should be in alphabetical descending order: Z Website, M Website, A Website
    expect(bookmarkItems[0]).toHaveTextContent('Z Website');
    expect(bookmarkItems[1]).toHaveTextContent('M Website');
    expect(bookmarkItems[2]).toHaveTextContent('A Website');
  });

  test('sorts alphabetically ascending when direction is toggled', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const sortSelect = screen.getByDisplayValue('Create Date');
    const directionButton = screen.getByTitle(/Currently sorting/);
    
    // Change to title sorting and ascending direction
    fireEvent.change(sortSelect, { target: { value: 'title' } });
    fireEvent.click(directionButton);
    
    const bookmarkItems = screen.getAllByRole('listitem');
    // Should be in alphabetical ascending order: A Website, M Website, Z Website
    expect(bookmarkItems[0]).toHaveTextContent('A Website');
    expect(bookmarkItems[1]).toHaveTextContent('M Website');
    expect(bookmarkItems[2]).toHaveTextContent('Z Website');
  });
});