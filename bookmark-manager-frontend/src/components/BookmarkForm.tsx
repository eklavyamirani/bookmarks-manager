import React, { useState } from 'react';

interface BookmarkFormProps {
  onAddBookmark: (title: string, url: string) => void;
}

const BookmarkForm: React.FC<BookmarkFormProps> = ({ onAddBookmark }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && url.trim()) {
      onAddBookmark(title, url);
      // Clear form fields
      setTitle('');
      setUrl('');
    }
  };

  return (
    <div className="bookmark-form">
      <h2>Add New Bookmark</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter bookmark title"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="url">URL</label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
        </div>
        <button type="submit" className="add-button">Add Bookmark</button>
      </form>
    </div>
  );
};

export default BookmarkForm;