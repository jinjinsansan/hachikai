# Vercel デプロイメント手順

## 前提条件

1. Supabaseプロジェクトが作成済み
2. Supabaseの認証情報（URL、Anon Key）を取得済み
3. Vercelアカウント作成済み

## デプロイ手順

### 方法1: Vercel CLIを使用（推奨）

```bash
# 1. Vercel CLIをインストール
npm i -g vercel

# 2. プロジェクトルートで実行
vercel

# 3. 質問に答える
# ? Set up and deploy "~/hachikai"? [Y/n] → Y
# ? Which scope do you want to deploy to? → 個人アカウントを選択
# ? Link to existing project? [y/N] → N（初回）またはY（2回目以降）
# ? What's your project's name? → hachikai-admin
# ? In which directory is your code located? → ./admin-dashboard
# ? Want to override the settings? [y/N] → N

# 4. 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
# プロンプトで値を入力: https://YOUR_PROJECT_REF.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# プロンプトで値を入力: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 5. 本番環境にデプロイ
vercel --prod
```

### 方法2: GitHubインテグレーション（自動デプロイ）

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 「Add New...」→「Project」をクリック
3. 「Import Git Repository」でGitHubと連携
4. リポジトリ「jinjinsansan/hachikai」を選択
5. 設定：
   - Project Name: `hachikai-admin`
   - Framework Preset: `Next.js`
   - Root Directory: `admin-dashboard`
   - Build Command: `npm run build`（自動検出）
   - Output Directory: `.next`（自動検出）
   - Install Command: `npm install`（自動検出）

6. 環境変数を設定：
   - 「Environment Variables」セクション
   - 以下を追加：

   | Name | Value |
   |------|-------|
   | NEXT_PUBLIC_SUPABASE_URL | https://YOUR_PROJECT_REF.supabase.co |
   | NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |

7. 「Deploy」をクリック

## 環境変数の値の取得方法

### Supabaseダッシュボード
1. [Supabase Dashboard](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択
3. Settings → API
4. 以下をコピー：
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`に使用
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`に使用

## デプロイ後の確認

1. デプロイURL（例: `https://hachikai-admin.vercel.app`）にアクセス
2. ログインフォームが表示されることを確認
3. 管理者アカウントでログインテスト

## トラブルシューティング

### エラー: Module not found
```bash
# 依存関係の再インストール
cd admin-dashboard
rm -rf node_modules package-lock.json
npm install
```

### エラー: Environment variables not found
- Vercel Dashboard → Settings → Environment Variables
- 変数が正しく設定されているか確認
- 再デプロイ: `vercel --prod --force`

### エラー: Build failed
```bash
# ローカルでビルドテスト
cd admin-dashboard
npm run build
# エラーがあれば修正してから再デプロイ
```

## 自動デプロイの設定

GitHub連携済みの場合、以下が自動的に実行されます：

- `main`ブランチへのプッシュ → 本番環境に自動デプロイ
- プルリクエスト → プレビューデプロイ

## カスタムドメイン設定（オプション）

1. Vercel Dashboard → Settings → Domains
2. 「Add」をクリック
3. ドメイン名を入力（例: `admin.hachikai.com`）
4. DNSレコードを設定：
   - Type: CNAME
   - Name: admin
   - Value: cname.vercel-dns.com

## 監視とログ

- **Functions**: Vercel Dashboard → Functions タブ
- **Analytics**: Vercel Dashboard → Analytics タブ
- **Logs**: Vercel Dashboard → Functions → View Logs

## セキュリティ設定

### Vercel環境変数のスコープ
- Production: 本番環境のみ
- Preview: プレビュー環境のみ
- Development: 開発環境のみ

推奨設定：
- `NEXT_PUBLIC_*`: 全環境
- センシティブな値: Productionのみ

## デプロイ状態の確認

```bash
# 最新のデプロイ状態
vercel ls

# ログを見る
vercel logs

# 環境変数の確認
vercel env ls
```

## 成功したデプロイの例

```
🔍 Inspect: https://vercel.com/your-username/hachikai-admin/xxxxx
✅ Production: https://hachikai-admin.vercel.app [2m]
```

デプロイ完了後、上記のProduction URLからアクセスできます！