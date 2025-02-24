CREATE TABLE IF NOT EXISTS saved_links (
    id SERIAL PRIMARY KEY,
    link VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    title VARCHAR(255)
);

INSERT INTO saved_links (link, ip_address, title) VALUES
('https://example.com/1', '192.168.1.1', 'Example 1'),
('https://example.com/2', '192.168.1.2', 'Example 2'),
('https://example.com/3', '192.168.1.3', 'Example 3'),
('https://example.com/4', '192.168.1.4', 'Example 4'),
('https://example.com/5', '192.168.1.5', 'Example 5'),
('https://example.com/6', '192.168.1.6', 'Example 6'),
('https://example.com/7', '192.168.1.7', 'Example 7'),
('https://example.com/8', '192.168.1.8', 'Example 8'),
('https://example.com/9', '192.168.1.9', 'Example 9'),
('https://example.com/10', '192.168.1.10', 'Example 10'),
('https://example.com/11', '192.168.1.11', 'Example 11'),
('https://example.com/12', '192.168.1.12', 'Example 12'),
('https://example.com/13', '192.168.1.13', 'Example 13'),
('https://example.com/14', '192.168.1.14', 'Example 14'),
('https://example.com/15', '192.168.1.15', 'Example 15'),
('https://example.com/16', '192.168.1.16', 'Example 16'),
('https://example.com/17', '192.168.1.17', 'Example 17'),
('https://example.com/18', '192.168.1.18', 'Example 18'),
('https://example.com/19', '192.168.1.19', 'Example 19'),
('https://example.com/20', '192.168.1.20', 'Example 20');