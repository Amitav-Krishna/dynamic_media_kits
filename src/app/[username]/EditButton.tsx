"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import SectionReorder from "@/components/SectionReorder";
import { SectionKey, DEFAULT_LAYOUT } from "@/components/ProfileSections";

interface EditButtonProps {
  username: string;
  athleteName: string;
}

export default function EditButton({ username, athleteName }: EditButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bio, setBio] = useState("");
  const [originalBio, setOriginalBio] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [sectionLayout, setSectionLayout] =
    useState<SectionKey[][]>(DEFAULT_LAYOUT);
  const [originalLayout, setOriginalLayout] =
    useState<SectionKey[][]>(DEFAULT_LAYOUT);
  const [activeTab, setActiveTab] = useState<"profile" | "layout">("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (showModal) {
      fetchCurrentBio();
    }
  }, [showModal]);

  const fetchCurrentBio = async () => {
    try {
      const response = await fetch(`/api/influencers/${username}`);
      if (response.ok) {
        const data = await response.json();
        const currentBio = data.bio || "";
        setBio(currentBio);
        setOriginalBio(currentBio);
        setCurrentImageUrl(data.profile_image_url || "");
        const layout = data.sidebar_layout
          ? JSON.parse(data.sidebar_layout)
          : DEFAULT_LAYOUT;
        setSectionLayout(layout);
        setOriginalLayout(layout);
      }
    } catch (err) {
      console.error("Failed to fetch bio:", err);
    }
  };

  const handleEdit = () => {
    setShowModal(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Image size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError("");

    try {
      let imageUrl = currentImageUrl;

      // Upload image if one is selected
      if (profileImage) {
        const formData = new FormData();
        formData.append("image", profileImage);
        formData.append("username", username);

        const imageResponse = await fetch("/api/upload/profile-image", {
          method: "POST",
          body: formData,
        });

        if (!imageResponse.ok) {
          const imageError = await imageResponse.json();
          throw new Error(imageError.error || "Failed to upload image");
        }

        const imageData = await imageResponse.json();
        imageUrl = imageData.imageUrl;
      }

      // Update bio and image URL
      const response = await fetch(`/api/influencers/${username}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_profile",
          bio,
          profile_image_url: imageUrl,
          sidebar_layout: JSON.stringify(sectionLayout),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setShowModal(false);
      window.location.reload(); // Refresh to show updated profile
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setBio(originalBio);
    setProfileImage(null);
    setImagePreview("");
    setSectionLayout(originalLayout);
    setActiveTab("profile");
    setError("");
    setShowModal(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {isHovered && (
        <div className="text-gray-400 text-sm">
          Manage this athlete's profile
        </div>
      )}
      <Button
        variant="outline"
        className="bg-purple-600 border-purple-500 text-white hover:bg-purple-700 hover:border-purple-600"
        onClick={handleEdit}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit Athlete
        </div>
      </Button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Edit {athleteName}'s Profile
            </h3>

            {/* Tabs */}
            <div className="flex mb-6 border-b border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "profile"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("layout")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "layout"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Layout
              </button>
            </div>

            {/* Profile Tab Content */}
            {activeTab === "profile" && (
              <>
                {/* Profile Image Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Image
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {imagePreview || currentImageUrl ? (
                        <img
                          src={imagePreview || currentImageUrl}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                          {athleteName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="profile-image-input"
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="profile-image-input"
                        className="cursor-pointer inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-white text-sm transition-colors"
                      >
                        Choose Image
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        Max 5MB, JPG/PNG only
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Enter athlete's bio..."
                    maxLength={500}
                    disabled={isLoading}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    {bio.length}/500 characters
                  </div>
                </div>
              </>
            )}

            {/* Layout Tab Content */}
            {activeTab === "layout" && (
              <div className="mb-4">
                <SectionReorder
                  layout={sectionLayout}
                  onLayoutChange={setSectionLayout}
                />
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-md text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isLoading ||
                  (bio === originalBio &&
                    !profileImage &&
                    JSON.stringify(sectionLayout) ===
                      JSON.stringify(originalLayout))
                }
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
