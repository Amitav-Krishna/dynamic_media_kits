"use client";
import { useState, useEffect } from "react";

interface RelevantPost {
  id: string;
  title: string;
  view_count: number;
  likes: number;
  content: string;
}

interface RelevantPostsProps {
  userId: string;
  searchTerm: string;
}

export default function RelevantPosts({
  userId,
  searchTerm,
}: RelevantPostsProps) {
  const [posts, setPosts] = useState<RelevantPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelevantPosts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/posts-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ searchText: searchTerm, userId }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch relevant posts");
        }

        const { posts: relevantPosts } = await response.json();
        setPosts(relevantPosts);
      } catch (err) {
        console.error("Error fetching relevant posts:", err);
        setError("Failed to load relevant posts");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && searchTerm) {
      fetchRelevantPosts();
    }
  }, [userId, searchTerm]);

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-white">
          Posts relevant to "{searchTerm}"
        </h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800 rounded p-4">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-2 text-red-400">Error</h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-white">
          Posts relevant to "{searchTerm}"
        </h3>
        <p className="text-gray-400">
          No posts found related to your search term.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-white">
        Top {posts.length} Posts Relevant to "{searchTerm}"
      </h3>
      <div className="space-y-4">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-white text-lg">{post.title}</h4>
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                #{index + 1}
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {post.content.length > 200
                ? `${post.content.substring(0, 200)}...`
                : post.content}
            </p>
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>{post.view_count?.toLocaleString() || "0"} views</span>
              <span>{post.likes?.toLocaleString() || "0"} likes</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
