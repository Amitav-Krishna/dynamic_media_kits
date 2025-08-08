-- Minimal authentication schema for immediate testing
-- Run this SQL to create the required tables

-- Drop tables if they exist (be careful in production!)
DROP TABLE IF EXISTS public.auth_attempts;
DROP TABLE IF EXISTS public.agency_sessions;
DROP TABLE IF EXISTS public.agencies;

-- Agency accounts table (minimal version)
CREATE TABLE public.agencies (
    agency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Sessions table for secure session management
CREATE TABLE public.agency_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(agency_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Rate limiting table
CREATE TABLE public.auth_attempts (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address INET NOT NULL,
    attempt_time TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_agency_sessions_agency_id ON agency_sessions(agency_id);
CREATE INDEX idx_agency_sessions_expires_at ON agency_sessions(expires_at);
CREATE INDEX idx_auth_attempts_email_time ON auth_attempts(email, attempt_time);
CREATE INDEX idx_auth_attempts_ip_time ON auth_attempts(ip_address, attempt_time);

-- Clean up expired sessions function (optional - can be run as cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM agency_sessions WHERE expires_at < NOW();
    DELETE FROM auth_attempts WHERE attempt_time < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Insert a test agency for immediate testing (optional)
-- Password is "TestPass123!" (hashed with bcrypt)
-- INSERT INTO agencies (name, email, password_hash)
-- VALUES ('Test Agency', 'test@example.com', '$2a$12$example_
