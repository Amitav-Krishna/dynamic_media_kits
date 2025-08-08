export type Agency = {
  agency_id: string;
  name: string;
  email: string;
  logo_url?: string;
  brand_color: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  user_id: string;
  name: string;
  username: string;
  sport?: string;
  follower_count: number;
  platforms: string;
  agency_id?: string;
  is_verified: boolean;
  profile_image_url?: string;
  bio?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
  agency?: Agency;
};

export type Post = {
  post_id: string;
  title: string;
  content: string;
  view_count: number;
  likes: number;
  user_id: string;
  platform?: string;
  external_post_id?: string;
  sentiment_score?: number;
  created_at: string;
};

export type FollowerGrowth = {
  growth_id: string;
  user_id: string;
  platform: string;
  follower_count: number;
  growth_rate?: number;
  recorded_at: string;
};

export type Collaboration = {
  collaboration_id: string;
  user_id: string;
  brand_name: string;
  campaign_type?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
};

export type MediaKitSections = {
  hero: boolean;
  social: boolean;
  growth: boolean;
  content: boolean;
  audience: boolean;
  brands: boolean;
  testimonials: boolean;
  contact: boolean;
};

export type MediaKitConfig = {
  config_id: string;
  user_id: string;
  layout_style: "media" | "data-driven" | "minimal";
  sections_visible: MediaKitSections;
  custom_colors?: Record<string, string>;
  vanity_url?: string;
  is_public: boolean;
  password_protected: boolean;
  access_password?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
};

export type AthleteProfile = User & {
  posts: Post[];
  follower_growth: FollowerGrowth[];
  collaborations: Collaboration[];
  media_kit_config?: MediaKitConfig;
  total_views?: number;
  engagement_rate?: number;
  weekly_growth?: number;
  top_posts?: Post[];
  post_count?: number;
  avg_views?: number;
};

export type AgencyDashboardData = {
  agency: Agency;
  athletes: AthleteProfile[];
  total_athletes: number;
  total_followers: number;
  average_engagement: number;
  total_collaborations: number;
};

export type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
  }[];
};

export type ChartConfig = {
  type: "bar" | "line" | "pie" | "doughnut" | "area" | "scatter";
  data: ChartData;
  options?: Record<string, any>;
};

// Legacy type for backward compatibility
export type Influencer = {
  id?: number; // For backward compatibility
  user_id?: string;
  name: string;
  username: string;
  sport?: string;
  top_posts?: string[] | Post[];
  follower_growth_weekly?: number;
  follower_count: number;
  engagement_score?: number;
  platforms: string[] | string;
  post_count?: number;
  avg_views?: number;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  logoUrl?: string;
  brandColor?: string;
};

export type AuthResponse =
  | {
      agency: Agency;
      sessionToken: string;
    }
  | {
      error: string;
    };

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
