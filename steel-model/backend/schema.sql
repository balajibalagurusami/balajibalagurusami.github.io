CREATE TABLE IF NOT EXISTS steel_review_comments (
  id TEXT PRIMARY KEY,
  parent TEXT REFERENCES steel_review_comments(id),
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  view TEXT NOT NULL,
  date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS steel_review_comments_date ON steel_review_comments(date DESC);
