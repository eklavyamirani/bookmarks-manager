export interface Bookmark {
  id: number;
  url?: string;
  link?: string;  // Backend uses 'link' instead of 'url'
  title: string | null;
  created_at?: string;  // Backend uses 'created_at' for the creation date
  read_date: string | null;
}