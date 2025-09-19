# 🚀 即座にデプロイする手順

## Supabase認証情報（設定済み）

✅ **URL**: `https://jxmqyzxrgbyvdtvlxjde.supabase.co`
✅ **Anon Key**: 設定済み（.env.localファイルに保存）

## 1. Supabaseデータベースセットアップ（5分）

1. [Supabaseダッシュボード](https://supabase.com/dashboard/project/jxmqyzxrgbyvdtvlxjde)にアクセス

2. **SQL Editor**をクリック → 「New query」

3. 以下のコマンドをコピー＆ペーストして実行：
   ```sql
   -- /supabase/schema.sqlの内容を全てコピー＆ペースト
   ```

   または直接ファイルの内容をコピー：
   - ファイル: `/supabase/schema.sql`
   - 全選択してSQL Editorに貼り付け
   - 「Run」ボタンをクリック

4. **Authentication** → **Providers**：
   - Email: 有効化
   - Google: 有効化（オプション）

## 2. Vercelデプロイ（3分）

### 方法A: コマンドライン（最速）

```bash
# ターミナルで実行
npx vercel

# 質問に答える：
# ? Set up and deploy? → Y
# ? Which scope? → 個人アカウント
# ? Link to existing project? → N
# ? Project name? → hachikai-admin
# ? Directory? → ./admin-dashboard
# ? Override settings? → N

# 環境変数を設定
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
# 値を貼り付け: https://jxmqyzxrgbyvdtvlxjde.supabase.co

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 値を貼り付け: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXF5enhyZ2J5dmR0dmx4amRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyODI0MzQsImV4cCI6MjA3Mzg1ODQzNH0.rASRU3IXyBE1CLoEtNpxp5OKT2gy9N4rmgltf82PgbQ

# 本番デプロイ
npx vercel --prod
```

### 方法B: Vercel Webサイト

1. [Vercel](https://vercel.com/import)にアクセス

2. 「Import Git Repository」

3. GitHubリポジトリ選択：`jinjinsansan/hachikai`

4. 設定：
   - **Root Directory**: `admin-dashboard` ← 重要！
   - **Framework**: Next.js（自動検出）

5. 環境変数（Environment Variables）を追加：

   | Name | Value |
   |------|-------|
   | NEXT_PUBLIC_SUPABASE_URL | https://jxmqyzxrgbyvdtvlxjde.supabase.co |
   | NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bXF5enhyZ2J5dmR0dmx4amRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyODI0MzQsImV4cCI6MjA3Mzg1ODQzNH0.rASRU3IXyBE1CLoEtNpxp5OKT2gy9N4rmgltf82PgbQ |

6. 「Deploy」をクリック

## 3. 管理者アカウント作成（1分）

Supabaseダッシュボード → **Table Editor** → 「New query」:

```sql
-- 管理者テーブルにあなたのメールを追加
INSERT INTO admins (email, name, role) VALUES
('your-email@gmail.com', 'Admin', 'super_admin');
```

## 4. 完了！🎉

デプロイURL:
```
https://hachikai-admin.vercel.app
```

または

```
https://hachikai-admin-[your-username].vercel.app
```

## テスト手順

1. デプロイURLにアクセス
2. ログインフォームが表示される
3. Google認証でログイン（またはメール/パスワード）
4. ダッシュボードが表示される

## トラブルシューティング

### エラー: Invalid API Key
→ 環境変数が正しくコピーされているか確認

### エラー: Table not found
→ Supabase SQL Editorでschema.sqlを実行したか確認

### エラー: Build failed
→ `cd admin-dashboard && npm install && npm run build`でローカルテスト

## サポート

問題がある場合は、GitHubのIssueまたは以下を確認：
- [Supabase Status](https://status.supabase.com)
- [Vercel Status](https://www.vercel-status.com)