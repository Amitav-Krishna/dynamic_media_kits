CREATE TABLE public.users (
	user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name TEXT NOT NULL,
	username TEXT UNIQUE NOT NULL,
	sport TEXT,
	follower_count INTEGER,
	platforms TEXT
);

CREATE TABLE public.posts (
	post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	title TEXT NOT NULL,
	content TEXT NOT NULL,
	view_count INTEGER,
	user_id UUID NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(user_id)
);

