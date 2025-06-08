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
  },
  {
    id: 4,
    title: 'React Documentation',
    url: 'https://reactjs.org',
    created_at: '2023-01-25T10:00:00Z',
    read_date: null
  },
  {
    id: 5,
    title: 'GitHub Repository',
    url: 'https://github.com/user/repo',
    created_at: '2023-01-30T10:00:00Z',
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
    // Should be in date descending order: GitHub Repository (2023-01-30), React Documentation (2023-01-25), M Website (2023-01-20), Z Website (2023-01-15), A Website (2023-01-10)
    expect(bookmarkItems[0]).toHaveTextContent('GitHub Repository');
    expect(bookmarkItems[1]).toHaveTextContent('React Documentation');
    expect(bookmarkItems[2]).toHaveTextContent('M Website');
    expect(bookmarkItems[3]).toHaveTextContent('Z Website');
    expect(bookmarkItems[4]).toHaveTextContent('A Website');
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
    // Should be in date ascending order: A Website (2023-01-10), Z Website (2023-01-15), M Website (2023-01-20), React Documentation (2023-01-25), GitHub Repository (2023-01-30)
    expect(bookmarkItems[0]).toHaveTextContent('A Website');
    expect(bookmarkItems[1]).toHaveTextContent('Z Website');
    expect(bookmarkItems[2]).toHaveTextContent('M Website');
    expect(bookmarkItems[3]).toHaveTextContent('React Documentation');
    expect(bookmarkItems[4]).toHaveTextContent('GitHub Repository');
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
    // Should be in alphabetical descending order: Z Website, React Documentation, M Website, GitHub Repository, A Website
    expect(bookmarkItems[0]).toHaveTextContent('Z Website');
    expect(bookmarkItems[1]).toHaveTextContent('React Documentation');
    expect(bookmarkItems[2]).toHaveTextContent('M Website');
    expect(bookmarkItems[3]).toHaveTextContent('GitHub Repository');
    expect(bookmarkItems[4]).toHaveTextContent('A Website');
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
    // Should be in alphabetical ascending order: A Website, GitHub Repository, M Website, React Documentation, Z Website
    expect(bookmarkItems[0]).toHaveTextContent('A Website');
    expect(bookmarkItems[1]).toHaveTextContent('GitHub Repository');
    expect(bookmarkItems[2]).toHaveTextContent('M Website');
    expect(bookmarkItems[3]).toHaveTextContent('React Documentation');
    expect(bookmarkItems[4]).toHaveTextContent('Z Website');
  });
});

describe('BookmarkList Search', () => {
  beforeEach(() => {
    mockOnMarkAsRead.mockClear();
    mockOnDeleteBookmark.mockClear();
  });

  test('renders search input', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    expect(screen.getByLabelText('Search:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search titles and URLs...')).toBeInTheDocument();
  });

  test('filters bookmarks by title', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search titles and URLs...');
    
    // Search for "React"
    fireEvent.change(searchInput, { target: { value: 'React' } });
    
    const bookmarkItems = screen.getAllByRole('listitem');
    expect(bookmarkItems).toHaveLength(1);
    expect(bookmarkItems[0]).toHaveTextContent('React Documentation');
  });

  test('filters bookmarks by URL', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search titles and URLs...');
    
    // Search for "github"
    fireEvent.change(searchInput, { target: { value: 'github' } });
    
    const bookmarkItems = screen.getAllByRole('listitem');
    expect(bookmarkItems).toHaveLength(1);
    expect(bookmarkItems[0]).toHaveTextContent('GitHub Repository');
  });

  test('search is case insensitive', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search titles and URLs...');
    
    // Search for "REACT" in uppercase
    fireEvent.change(searchInput, { target: { value: 'REACT' } });
    
    const bookmarkItems = screen.getAllByRole('listitem');
    expect(bookmarkItems).toHaveLength(1);
    expect(bookmarkItems[0]).toHaveTextContent('React Documentation');
  });

  test('search returns multiple results when multiple bookmarks match', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search titles and URLs...');
    
    // Search for "Website" which appears in multiple titles
    fireEvent.change(searchInput, { target: { value: 'Website' } });
    
    const bookmarkItems = screen.getAllByRole('listitem');
    expect(bookmarkItems).toHaveLength(3);
    expect(bookmarkItems[0]).toHaveTextContent('M Website');
    expect(bookmarkItems[1]).toHaveTextContent('Z Website');
    expect(bookmarkItems[2]).toHaveTextContent('A Website');
  });

  test('shows no results message when search has no matches', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search titles and URLs...');
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No bookmarks match your search criteria.')).toBeInTheDocument();
  });

  test('clearing search shows all bookmarks again', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search titles and URLs...');
    
    // Search for "React"
    fireEvent.change(searchInput, { target: { value: 'React' } });
    let bookmarkItems = screen.getAllByRole('listitem');
    expect(bookmarkItems).toHaveLength(1);
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    bookmarkItems = screen.getAllByRole('listitem');
    expect(bookmarkItems).toHaveLength(5);
  });

  test('search works in combination with sorting', () => {
    render(
      <BookmarkList 
        bookmarks={mockBookmarks}
        onMarkAsRead={mockOnMarkAsRead}
        onDeleteBookmark={mockOnDeleteBookmark}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search titles and URLs...');
    const sortSelect = screen.getByDisplayValue('Create Date');
    
    // Search for "Website" and change to title sorting
    fireEvent.change(searchInput, { target: { value: 'Website' } });
    fireEvent.change(sortSelect, { target: { value: 'title' } });
    
    const bookmarkItems = screen.getAllByRole('listitem');
    expect(bookmarkItems).toHaveLength(3);
    // Should be sorted alphabetically descending: Z Website, M Website, A Website
    expect(bookmarkItems[0]).toHaveTextContent('Z Website');
    expect(bookmarkItems[1]).toHaveTextContent('M Website');
    expect(bookmarkItems[2]).toHaveTextContent('A Website');
  });
});