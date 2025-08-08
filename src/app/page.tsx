"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { GiSpermWhale } from "react-icons/gi";

export default function Home() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch influencers on initial load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "/api/influencers?query=GET_ALL_INFLUENCERS",
        );
        if (!response.ok) throw new Error("Failed to fetch influencers");
        const influencers = await response.json();
        setInfluencers(influencers);
      } catch (error) {
        console.error("Error fetching influencers:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchText }),
      });

      if (!response.ok) throw new Error("API request failed");

      const { matches } = await response.json();

      // Score influencers based on search relevance
      const scoredInfluencers = influencers.map((influencer) => {
        const influencerPosts = matches.filter(
          (match: any) => match.metadata?.user_id === influencer.user_id,
        );

        // Calculate relevance score
        let score = 0;
        if (influencerPosts.length > 0) {
          // Use the highest matching post score
          score = Math.max(...influencerPosts.map((p: any) => p.score));
        }

        return { ...influencer, relevanceScore: score };
      });

      // Sort by relevance score (high to low) and take only top 3
      setInfluencers(
        scoredInfluencers
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3),
      );
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Featured Influencers</h1>
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search any topic..."
                className="px-4 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-r-lg transition-colors duration-300"
              >
                Search
              </button>
            </form>
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors duration-300 font-medium"
            >
              Agency Login
            </Link>
            <Link href="/chat">
              <GiSpermWhale className="text-white text-6xl" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {influencers.map((influencer) => (
            <Link
              key={influencer.user_id}
              href={`/${influencer.username}${searchText ? `?search=${encodeURIComponent(searchText)}` : ""}`}
              className="border border-gray-800 rounded-lg p-6 hover:border-purple-500 transition-colors duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                    <span className="text-lg font-medium">
                      {influencer.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{influencer.name}</h2>
                  <p className="text-purple-400">@{influencer.username}</p>
                  {influencer.sport && (
                    <p className="text-gray-400 mt-1">{influencer.sport}</p>
                  )}
                  {influencer.relevanceScore !== undefined && (
                    <p className="text-sm mt-1 text-yellow-400">
                      Relevance: {influencer.relevanceScore.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm text-gray-400">
                <span>
                  {influencer.follower_count?.toLocaleString() || "0"} followers
                </span>
                <span>{influencer.post_count || "0"} posts</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
