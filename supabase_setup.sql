-- Create a table for group shares
CREATE TABLE group_shares (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  url TEXT,
  title TEXT,
  sender TEXT NOT NULL,
  group_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries by group_id
CREATE INDEX idx_group_shares_group_id ON group_shares(group_id);

-- Enable row-level security (RLS)
ALTER TABLE group_shares ENABLE ROW LEVEL SECURITY;

-- Create security policies to allow anyone to insert and read
CREATE POLICY "Allow anyone to insert" ON group_shares
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Allow anyone to select" ON group_shares
  FOR SELECT TO authenticated, anon
  USING (true);

-- Create a function to clean up old records (optional)
-- You can set up a cron job to run this daily or weekly
CREATE OR REPLACE FUNCTION cleanup_old_shares()
RETURNS void
LANGUAGE SQL
AS $$
  DELETE FROM group_shares
  WHERE created_at < NOW() - INTERVAL '30 days';
$$; 