-- Create auth_keys table to store valid access keys
CREATE TABLE IF NOT EXISTS auth_keys (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    wallet TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CONSTRAINT key_length CHECK (LENGTH(key) >= 6)
);

-- Create index for faster key lookups
CREATE INDEX IF NOT EXISTS auth_keys_key_idx ON auth_keys(key);

-- Create function to update last_used_at timestamp
CREATE OR REPLACE FUNCTION update_last_used_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp on key usage
CREATE TRIGGER update_auth_key_timestamp
BEFORE UPDATE ON auth_keys
FOR EACH ROW
EXECUTE FUNCTION update_last_used_timestamp();

-- Insert some example keys (you should replace these with your own keys)
INSERT INTO auth_keys (key, wallet) 
VALUES 
    ('tox123', '0x1234567890abcdef1234567890abcdef12345678'),
    ('key456', '0xabcdef1234567890abcdef1234567890abcdef12'),
    ('deadfnf', NULL)
ON CONFLICT (key) DO NOTHING;

-- Create RLS (Row Level Security) policies for the table
ALTER TABLE auth_keys ENABLE ROW LEVEL SECURITY;

-- Create policy that allows only reads (for authentication checks)
CREATE POLICY "Allow reading keys for validation" ON auth_keys
    FOR SELECT
    USING (true);

-- Prevent inserts/updates/deletes except for authenticated service roles
CREATE POLICY "Only service role can modify keys" ON auth_keys
    FOR ALL
    USING (auth.role() = 'service_role'); 