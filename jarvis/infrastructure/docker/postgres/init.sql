-- JARVIS Neural Enterprise OS - Database Initialization

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For GIN indexes

-- Create schema
CREATE SCHEMA IF NOT EXISTS jarvis;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE jarvis TO jarvis;
GRANT ALL PRIVILEGES ON SCHEMA jarvis TO jarvis;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA jarvis TO jarvis;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA jarvis TO jarvis;

-- Set default search path
ALTER DATABASE jarvis SET search_path TO jarvis, public;

-- Create read-only user for analytics
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jarvis_reader') THEN
        CREATE USER jarvis_reader WITH PASSWORD 'jarvis_reader_pass';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE jarvis TO jarvis_reader;
GRANT USAGE ON SCHEMA jarvis TO jarvis_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA jarvis TO jarvis_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA jarvis GRANT SELECT ON TABLES TO jarvis_reader;

-- Performance tuning
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET random_page_cost = '1.1';

SELECT pg_reload_conf();
