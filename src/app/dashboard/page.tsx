"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InfluencerCard from "@/components/InfluencerCard";

interface Agency {
  agency_id: string;
  name: string;
  email: string;
  created_at: string;
  last_login: string | null;
}

interface Influencer {
  user_id: string;
  name: string;
  username: string;
  sport?: string;
  follower_count?: number;
  platforms_array?: string[];
  is_verified?: boolean;
  profile_image_url?: string;
  bio?: string;
  post_count?: number;
  avg_views?: number;
  follower_growth_weekly?: number;
  top_posts?: Array<{ title: string; views: number }>;
}

export default function DashboardPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencersLoading, setInfluencersLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (agency) {
      fetchInfluencers();
    }
  }, [agency]);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAgency(data.agency);
        } else {
          // No valid session, redirect to login
          router.push("/auth/login");
        }
      } else {
        // No valid session, redirect to login
        router.push("/auth/login");
      }
    } catch (err) {
      setError("Failed to check session");
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchInfluencers = async () => {
    setInfluencersLoading(true);
    try {
      const response = await fetch("/api/agency/influencers", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInfluencers(data.influencers);
        }
      }
    } catch (err) {
      console.error("Failed to fetch influencers:", err);
    } finally {
      setInfluencersLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/auth/login");
    } catch (err) {
      console.error("Logout error:", err);
      // Force redirect even if logout fails
      router.push("/auth/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Link
            href="/auth/login"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold">Agency Dashboard</h1>
              <p className="text-gray-400">Welcome back, {agency?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Browse Influencers
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Welcome to Your Dashboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 mb-2">Agency Name:</p>
              <p className="font-medium">{agency?.name}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Email:</p>
              <p className="font-medium">{agency?.email}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Member Since:</p>
              <p className="font-medium">
                {agency?.created_at
                  ? new Date(agency.created_at).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Last Login:</p>
              <p className="font-medium">
                {agency?.last_login
                  ? new Date(agency.last_login).toLocaleDateString()
                  : "First time login"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/"
            className="bg-purple-900 hover:bg-purple-800 rounded-lg p-6 transition-colors group"
          >
            <div className="text-center">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">Browse Influencers</h3>
              <p className="text-gray-400 text-sm">
                Discover and connect with top influencers
              </p>
            </div>
          </Link>

          <Link
            href="/chat"
            className="bg-blue-900 hover:bg-blue-800 rounded-lg p-6 transition-colors group"
          >
            <div className="text-center">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-gray-400 text-sm">
                Get personalized influencer recommendations
              </p>
            </div>
          </Link>

          <div className="bg-gray-800 rounded-lg p-6 opacity-50">
            <div className="text-center">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-gray-400 text-sm">
                Coming soon - Campaign performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Your Influencers Section */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Influencers</h2>
            <div className="text-gray-400 text-sm">
              {influencers.length} athlete{influencers.length !== 1 ? "s" : ""}
            </div>
          </div>

          {influencersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your influencers...</p>
            </div>
          ) : influencers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {influencers.map((influencer) => (
                <InfluencerCard
                  key={influencer.user_id}
                  influencer={influencer}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium mb-2">
                No influencers claimed yet
              </h3>
              <p className="text-gray-400 mb-4">
                Browse our directory to find and claim influencers for your
                agency
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Browse Influencers
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-lg font-medium mb-2">No activity yet</h3>
            <p className="text-gray-400 mb-4">
              Start browsing influencers to see your activity here
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
