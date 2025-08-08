-- Add to your existing schema.sql file

-- Agency accounts table
CREATE TABLE public.agencies (
    agency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
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

-- Clean up expired sessions (run this as a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM agency_sessions WHERE expires_at < NOW();
    DELETE FROM auth_attempts WHERE attempt_time < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
