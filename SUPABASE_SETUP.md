# Supabase設定手順

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセス
2. 「Start your project」をクリック
3. GitHubまたはメールでサインアップ
4. 「New Project」をクリック
5. プロジェクト設定：
   - Organization: 個人または組織を選択
   - Project name: `hachikai`
   - Database Password: 強力なパスワードを設定（保存しておく）
   - Region: `Northeast Asia (Tokyo)` を選択
6. 「Create new project」をクリック

## 2. データベーススキーマの設定

### SQLエディターでスキーマを実行

1. Supabaseダッシュボード → SQL Editor
2. 「New query」をクリック
3. `/supabase/schema.sql`の内容を全てコピー＆ペースト
4. 「Run」をクリック（全てのテーブル、インデックス、RLSポリシーが作成される）

## 3. 認証の設定

### メール/パスワード認証

1. Authentication → Providers
2. Email を有効化
   - Enable Email provider: ON
   - Confirm email: OFF（開発時）

### Google認証

1. Authentication → Providers → Google
2. Google OAuth を有効化
3. Google Cloud Console設定：
   - [Google Cloud Console](https://console.cloud.google.com)
   - 新しいプロジェクトまたは既存プロジェクトを選択
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
4. Client IDとClient SecretをSupabaseにコピー

## 4. 環境変数の取得

### Supabaseダッシュボード → Settings → API

以下の値をコピー：

- **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role**: 管理者機能用（秘密にする）

## 5. React Nativeアプリの設定

### .envファイルの作成

```bash
cp .env.example .env
```

`.env`を編集：
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 依存関係のインストール

```bash
npm install
# または
yarn install
```

### iOSの場合（追加設定）

```bash
cd ios && pod install
```

## 6. 管理者ダッシュボードの設定

### .env.localファイルの作成

```bash
cd admin-dashboard
cp .env.local.example .env.local
```

`.env.local`を編集：
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 依存関係のインストール

```bash
npm install
```

### 管理者アカウントの作成

Supabaseダッシュボード → Table Editor → admins テーブル：

```sql
INSERT INTO admins (email, name, role) VALUES
('admin@hachikai.com', '管理者', 'super_admin');
```

## 7. リアルタイム機能の有効化

1. Database → Replication
2. 以下のテーブルでRealtimeを有効化：
   - profiles
   - purchases
   - floor_statistics

## 8. Storage設定（画像アップロード用）

1. Storage → New bucket
2. バケット名: `purchase-proofs`
3. Public: OFF（認証が必要）
4. File size limit: 5MB
5. Allowed MIME types:
   ```
   image/jpeg
   image/png
   image/webp
   ```

## 9. Edge Functions（オプション）

高度な処理用のサーバーレス関数：

```bash
supabase functions new verify-purchase
```

## 10. ローカル開発

### React Nativeアプリ

```bash
npm start
# 別ターミナルで
npm run ios
# または
npm run android
```

### 管理者ダッシュボード

```bash
cd admin-dashboard
npm run dev
```

http://localhost:3000 でアクセス

## 11. Vercelへのデプロイ

### 環境変数の設定

Vercelダッシュボードで設定：

| 変数名 | 値 |
|--------|-----|
| NEXT_PUBLIC_SUPABASE_URL | https://YOUR_PROJECT_REF.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |

### デプロイコマンド

```bash
vercel --prod
```

## 12. 本番環境の設定

### Row Level Security (RLS)

本番環境では必ずRLSを有効化：

```sql
-- 全テーブルでRLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;
```

### バックアップ設定

1. Database → Backups
2. Point-in-time Recovery: ON
3. Daily backups: 有効

## トラブルシューティング

### エラー: "Invalid API key"
→ 環境変数が正しく設定されているか確認

### エラー: "Permission denied"
→ RLSポリシーを確認、またはservice_roleキーを使用

### エラー: "Failed to fetch"
→ CORS設定、またはSupabase URLを確認

### リアルタイム更新が動作しない
→ Replicationが有効になっているか確認

## セキュリティ注意事項

- service_roleキーは絶対に公開しない
- RLSポリシーを適切に設定
- 環境変数をgitにコミットしない
- 本番環境では強力なパスワードを使用
- 定期的にバックアップを確認

## 参考リンク

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)