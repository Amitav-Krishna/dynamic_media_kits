-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agencies table for managing multiple athlete accounts
CREATE TABLE public.agencies (
    agency_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    logo_url TEXT,
    brand_color TEXT DEFAULT '#1f2937',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table for athlete profiles (updated with agency relationship)
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    sport TEXT,
    follower_count INTEGER DEFAULT 0,
    platforms TEXT,
    agency_id UUID,
    is_verified BOOLEAN DEFAULT false,
    profile_image_url TEXT,
    bio TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (agency_id) REFERENCES agencies(agency_id) ON DELETE SET NULL
);

-- Posts table for content analysis
CREATE TABLE public.posts (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    user_id UUID NOT NULL,
    platform TEXT,
    external_post_id TEXT,
    sentiment_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Follower growth tracking
CREATE TABLE public.follower_growth (
    growth_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    platform TEXT NOT NULL,
    follower_count INTEGER NOT NULL,
    growth_rate DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Brand collaborations
CREATE TABLE public.collaborations (
    collaboration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    brand_name TEXT NOT NULL,
    campaign_type TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Agency sessions for authentication
CREATE TABLE public.agency_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (agency_id) REFERENCES agencies(agency_id) ON DELETE CASCADE
);

-- Media kit configurations per athlete
CREATE TABLE public.media_kit_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    layout_style TEXT DEFAULT 'media', -- 'media', 'data-driven', 'minimal'
    sections_visible JSONB DEFAULT '{"hero": true, "social": true, "growth": true, "content": true, "audience": true, "brands": true, "testimonials": false, "contact": true}',
    custom_colors JSONB,
    vanity_url TEXT UNIQUE,
    is_public BOOLEAN DEFAULT true,
    password_protected BOOLEAN DEFAULT false,
    access_password TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_agency_id ON public.users(agency_id);
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at);
CREATE INDEX idx_follower_growth_user_id ON public.follower_growth(user_id);
CREATE INDEX idx_follower_growth_recorded_at ON public.follower_growth(recorded_at);
CREATE INDEX idx_collaborations_user_id ON public.collaborations(user_id);
CREATE INDEX idx_agency_sessions_token ON public.agency_sessions(session_token);
CREATE INDEX idx_agency_sessions_expires ON public.agency_sessions(expires_at);
CREATE INDEX idx_media_kit_configs_user_id ON public.media_kit_configs(user_id);
CREATE INDEX idx_media_kit_configs_vanity_url ON public.media_kit_configs(vanity_url);

-- Insert sample agencies
INSERT INTO public.agencies (name, email, password_hash, logo_url, brand_color) VALUES
('Elite Sports Management', 'contact@elitesports.com', '$2b$10$rQGE0UF1YZQ5XQ5XQ5XQ5u', 'https://example.com/elite-logo.png', '#2563eb'),
('ProAthlete Partners', 'hello@proathlete.com', '$2b$10$rQGE0UF1YZQ5XQ5XQ5XQ5u', 'https://example.com/pro-logo.png', '#dc2626'),
('Independent Management', 'info@independent.com', '$2b$10$rQGE0UF1YZQ5XQ5XQ5XQ5u', NULL, '#059669');

-- Insert sample athletes with agency relationships
INSERT INTO public.users (name, username, sport, follower_count, platforms, agency_id, is_verified, bio, contact_email) VALUES
('Marcus Thompson', 'marcusthompson', 'Basketball', 125000, 'Instagram,TikTok,YouTube', (SELECT agency_id FROM agencies WHERE name = 'Elite Sports Management'), true, 'Professional basketball player | 2x All-Star | Inspiring the next generation', 'marcus@elitesports.com'),
('Sarah Chen', 'sarahchen_fit', 'Fitness', 89000, 'Instagram,TikTok', (SELECT agency_id FROM agencies WHERE name = 'ProAthlete Partners'), true, 'Fitness coach & wellness advocate | Helping you unlock your potential', 'sarah@proathlete.com'),
('Alex Rodriguez', 'alexrod_soccer', 'Soccer', 67000, 'Instagram,X,YouTube', (SELECT agency_id FROM agencies WHERE name = 'Elite Sports Management'), false, 'Rising soccer star | MLS draft prospect | Living the dream', 'alex@elitesports.com'),
('Independent Athlete', 'indie_runner', 'Track & Field', 34000, 'Instagram', NULL, false, 'Marathon runner | Boston qualifier | Running for a cause', 'indie@runner.com');

-- Insert sample follower growth data
INSERT INTO public.follower_growth (user_id, platform, follower_count, growth_rate, recorded_at) VALUES
-- Marcus Thompson growth over 12 weeks
((SELECT user_id FROM users WHERE username = 'marcusthompson'), 'Instagram', 125000, 2.5, NOW()),
((SELECT user_id FROM users WHERE username = 'marcusthompson'), 'Instagram', 122000, 3.1, NOW() - INTERVAL '1 week'),
((SELECT user_id FROM users WHERE username = 'marcusthompson'), 'Instagram', 118000, 2.8, NOW() - INTERVAL '2 weeks'),
((SELECT user_id FROM users WHERE username = 'marcusthompson'), 'Instagram', 115000, 1.9, NOW() - INTERVAL '3 weeks'),
-- Sarah Chen growth
((SELECT user_id FROM users WHERE username = 'sarahchen_fit'), 'Instagram', 89000, 4.2, NOW()),
((SELECT user_id FROM users WHERE username = 'sarahchen_fit'), 'Instagram', 85000, 3.8, NOW() - INTERVAL '1 week'),
((SELECT user_id FROM users WHERE username = 'sarahchen_fit'), 'Instagram', 82000, 4.1, NOW() - INTERVAL '2 weeks');

-- Insert sample posts
INSERT INTO public.posts (title, content, view_count, likes, user_id, platform, sentiment_score, created_at) VALUES
('Game Day Preparation', 'Getting ready for tonight''s big game! The preparation starts hours before tipoff...', 45000, 3200, (SELECT user_id FROM users WHERE username = 'marcusthompson'), 'Instagram', 0.85, NOW() - INTERVAL '2 days'),
('Morning Workout Routine', 'Start your day strong with this 20-minute HIIT workout that will boost your energy...', 32000, 2100, (SELECT user_id FROM users WHERE username = 'sarahchen_fit'), 'TikTok', 0.92, NOW() - INTERVAL '1 day'),
('Training Camp Highlights', 'Incredible week at training camp! Pushed my limits and learned so much...', 28000, 1800, (SELECT user_id FROM users WHERE username = 'alexrod_soccer'), 'Instagram', 0.78, NOW() - INTERVAL '3 days');

-- Insert sample collaborations
INSERT INTO public.collaborations (user_id, brand_name, campaign_type, start_date, end_date, status) VALUES
((SELECT user_id FROM users WHERE username = 'marcusthompson'), 'Nike', 'Signature Shoe Campaign', '2024-01-01', '2024-12-31', 'active'),
((SELECT user_id FROM users WHERE username = 'sarahchen_fit'), 'Protein World', 'Supplement Partnership', '2024-02-01', '2024-07-31', 'active'),
((SELECT user_id FROM users WHERE username = 'alexrod_soccer'), 'Adidas', 'Rising Stars Program', '2024-03-01', '2024-08-31', 'active');

-- Insert sample media kit configurations
INSERT INTO public.media_kit_configs (user_id, layout_style, sections_visible, vanity_url, is_public) VALUES
((SELECT user_id FROM users WHERE username = 'marcusthompson'), 'data-driven', '{"hero": true, "social": true, "growth": true, "content": true, "audience": true, "brands": true, "testimonials": true, "contact": true}', 'marcus-thompson-elite', true),
((SELECT user_id FROM users WHERE username = 'sarahchen_fit'), 'media', '{"hero": true, "social": true, "growth": true, "content": true, "audience": false, "brands": true, "testimonials": false, "contact": true}', 'sarah-chen-fitness', true),
((SELECT user_id FROM users WHERE username = 'alexrod_soccer'), 'minimal', '{"hero": true, "social": true, "growth": true, "content": true, "audience": true, "brands": false, "testimonials": false, "contact": true}', 'alex-rodriguez-soccer', true);
