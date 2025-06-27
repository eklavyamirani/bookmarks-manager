CREATE TABLE IF NOT EXISTS public.saved_links (
    id SERIAL PRIMARY KEY,
    link VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    read_date TIMESTAMP NULL,
    ip_address VARCHAR(45),
    title VARCHAR(255)
);