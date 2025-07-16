CREATE TABLE public.users (
	user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name TEXT,
	username TEXT UNIQUE,
	sport TEXT,
	follower_count INTEGER,
	platforms TEXT
);
INSERT INTO users (name, username, sport, follower_count, platforms) VALUES('Air Bud', 'golden_receiver', 'Football', 200000, 'YouTube, TikTok');

CREATE TABLE public.posts (
	post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	title TEXT NOT NULL,
	content TEXT NOT NULL,
	view_count INTEGER,
	user_id UUID NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(user_id)
);

