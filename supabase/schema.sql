-- HachiKai Supabase Schema
-- 8階層相互扶助システムのデータベース構造

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- ユーザープロファイルテーブル
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1 CHECK (floor >= 1 AND floor <= 8),
  daily_purchase_count INTEGER DEFAULT 0,
  daily_ad_view_count INTEGER DEFAULT 0,
  total_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  device_id TEXT,
  fcm_token TEXT,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 購入履歴テーブル
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_asin TEXT,
  product_url TEXT,
  price DECIMAL(10, 2) NOT NULL,
  points_earned INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  proof_image_url TEXT,
  ocr_extracted_text TEXT,
  verification_score DECIMAL(3, 2),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  amazon_order_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 広告視聴記録テーブル
CREATE TABLE IF NOT EXISTS ad_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('video', 'banner', 'interstitial', 'rewarded')),
  duration_seconds INTEGER,
  points_earned INTEGER DEFAULT 0,
  platform TEXT CHECK (platform IN ('admob', 'unity_ads', 'facebook')),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ポイント取引履歴テーブル
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent', 'transferred', 'bonus')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_type TEXT CHECK (reference_type IN ('purchase', 'ad_view', 'transfer', 'system')),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 階層統計テーブル（リアルタイム集計用）
CREATE TABLE IF NOT EXISTS floor_statistics (
  floor INTEGER PRIMARY KEY CHECK (floor >= 1 AND floor <= 8),
  user_count INTEGER DEFAULT 0,
  total_purchases DECIMAL(10, 2) DEFAULT 0,
  total_ad_views INTEGER DEFAULT 0,
  average_points DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 不正検知ログテーブル
CREATE TABLE IF NOT EXISTS fraud_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  detection_type TEXT NOT NULL,
  risk_score DECIMAL(3, 2) NOT NULL,
  details JSONB,
  action_taken TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- 管理者テーブル（Google認証用）
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'viewer')),
  permissions JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_floor ON profiles(floor);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX idx_ad_views_user_id ON ad_views(user_id);
CREATE INDEX idx_ad_views_created_at ON ad_views(created_at DESC);
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_fraud_logs_user_id ON fraud_logs(user_id);
CREATE INDEX idx_fraud_logs_resolved ON fraud_logs(resolved);

-- トリガー関数：更新時刻の自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 階層統計を更新する関数
CREATE OR REPLACE FUNCTION update_floor_statistics()
RETURNS void AS $$
BEGIN
  INSERT INTO floor_statistics (floor, user_count, total_purchases, total_ad_views, average_points)
  SELECT
    p.floor,
    COUNT(DISTINCT p.id) as user_count,
    COALESCE(SUM(pur.price), 0) as total_purchases,
    COALESCE(COUNT(av.id), 0) as total_ad_views,
    COALESCE(AVG(p.total_points), 0) as average_points
  FROM profiles p
  LEFT JOIN purchases pur ON p.id = pur.user_id AND pur.status = 'confirmed'
  LEFT JOIN ad_views av ON p.id = av.user_id
  WHERE p.is_active = true
  GROUP BY p.floor
  ON CONFLICT (floor) DO UPDATE SET
    user_count = EXCLUDED.user_count,
    total_purchases = EXCLUDED.total_purchases,
    total_ad_views = EXCLUDED.total_ad_views,
    average_points = EXCLUDED.average_points,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) ポリシー
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロファイルのみ閲覧・更新可能
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分の購入履歴のみ閲覧可能
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own purchases" ON purchases
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ユーザーは自分の広告視聴記録のみ閲覧・追加可能
CREATE POLICY "Users can view own ad views" ON ad_views
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own ad views" ON ad_views
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ユーザーは自分のポイント取引履歴のみ閲覧可能
CREATE POLICY "Users can view own point transactions" ON point_transactions
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 管理者ポリシー
CREATE POLICY "Admins can view all data" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Admins can manage all purchases" ON purchases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Admins can view fraud logs" ON fraud_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt()->>'email')
  );

-- リアルタイム機能の有効化
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE floor_statistics;

-- 初期データの挿入
INSERT INTO system_settings (key, value, description) VALUES
  ('daily_purchase_limit', '5', '1日の購入確認上限'),
  ('daily_ad_view_limit', '10', '1日の広告視聴上限'),
  ('points_per_purchase', '100', '購入確認1件あたりのポイント'),
  ('points_per_ad', '10', '広告視聴1件あたりのポイント'),
  ('floor_upgrade_threshold', '1000', '階層アップに必要なポイント')
ON CONFLICT DO NOTHING;

-- 階層統計の初期化
INSERT INTO floor_statistics (floor)
VALUES (1), (2), (3), (4), (5), (6), (7), (8)
ON CONFLICT DO NOTHING;