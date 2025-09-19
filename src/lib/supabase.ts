import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Supabase設定
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabaseクライアントの作成（React Native用）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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

export interface PointTransaction {
  id: string;
  user_id: string;
  type: 'earned' | 'spent' | 'transferred' | 'bonus';
  amount: number;
  balance_after: number;
  description?: string;
  reference_type?: 'purchase' | 'ad_view' | 'transfer' | 'system';
  reference_id?: string;
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

export interface FraudLog {
  id: string;
  user_id: string;
  detection_type: string;
  risk_score: number;
  details: Record<string, unknown>;
  action_taken?: string;
  resolved: boolean;
  created_at: string;
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

// データベース型定義
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      purchases: {
        Row: Purchase;
        Insert: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Purchase, 'id'>>;
      };
      ad_views: {
        Row: AdView;
        Insert: Omit<AdView, 'id' | 'created_at'>;
        Update: Partial<Omit<AdView, 'id'>>;
      };
      point_transactions: {
        Row: PointTransaction;
        Insert: Omit<PointTransaction, 'id' | 'created_at'>;
        Update: Partial<Omit<PointTransaction, 'id'>>;
      };
      floor_statistics: {
        Row: FloorStatistics;
        Insert: Omit<FloorStatistics, 'updated_at'>;
        Update: Partial<Omit<FloorStatistics, 'floor'>>;
      };
      fraud_logs: {
        Row: FraudLog;
        Insert: Omit<FraudLog, 'id' | 'created_at'>;
        Update: Partial<Omit<FraudLog, 'id'>>;
      };
      admins: {
        Row: Admin;
        Insert: Omit<Admin, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Admin, 'id'>>;
      };
    };
  };
};