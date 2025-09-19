import { createClient } from '@supabase/supabase-js';

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabaseクライアントの作成（Next.js用）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 型定義
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  floor: number;
  daily_purchase_count: number;
  daily_ad_view_count: number;
  total_purchase_amount: number;
  total_points: number;
  device_id?: string;
  fcm_token?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  product_name: string;
  product_asin?: string;
  product_url?: string;
  price: number;
  points_earned: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  proof_image_url?: string;
  ocr_extracted_text?: string;
  verification_score?: number;
  verified_at?: string;
  verified_by?: string;
  amazon_order_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdView {
  id: string;
  user_id: string;
  ad_type: 'video' | 'banner' | 'interstitial' | 'rewarded';
  duration_seconds?: number;
  points_earned: number;
  platform?: 'admob' | 'unity_ads' | 'facebook';
  completed: boolean;
  created_at: string;
}

export interface FloorStatistics {
  floor: number;
  user_count: number;
  total_purchases: number;
  total_ad_views: number;
  average_points: number;
  updated_at: string;
}

export interface Admin {
  id: string;
  email: string;
  google_id?: string;
  name?: string;
  role: 'admin' | 'super_admin' | 'viewer';
  permissions: Record<string, boolean>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}