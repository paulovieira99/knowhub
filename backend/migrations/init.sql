-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    hashed_pw   TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL
);

-- Entries (knowledge base items)
CREATE TABLE IF NOT EXISTS entries (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    entry_type  VARCHAR(32) NOT NULL DEFAULT 'note',  -- note | code | tip | file | image
    language    VARCHAR(32),                           -- for code entries
    is_pinned   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    -- Full-text search vector
    search_vec  TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(content, '')), 'B')
    ) STORED
);

-- Entry <-> Tags
CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id INTEGER REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);

-- File attachments
CREATE TABLE IF NOT EXISTS attachments (
    id          SERIAL PRIMARY KEY,
    entry_id    INTEGER REFERENCES entries(id) ON DELETE CASCADE,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type   TEXT,
    size_bytes  BIGINT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_search ON entries USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_entries_title_trgm ON entries USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING GIN(name gin_trgm_ops);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entries_updated
    BEFORE UPDATE ON entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
