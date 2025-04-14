export interface Bookmark {
  id: number;
  url?: string;
  link?: string;  // Backend uses 'link' instead of 'url'
  title: string | null;
  create_date?: string;
  created_at?: string;  // Backend uses 'created_at' instead of 'create_date'
  read_date: string | null;
}