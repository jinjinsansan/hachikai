# HachiKai Admin Dashboard

## 概要

HachiKai管理者用ダッシュボード - Next.js 14 + TypeScript + Tailwind CSS

## 機能

- 📊 リアルタイムユーザー統計
- 👥 ユーザー管理
- 📈 階層分布の可視化
- 🔒 Firebase認証
- 📱 レスポンシブデザイン

## セットアップ

### 1. 依存関係のインストール

```bash
cd admin-dashboard
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、Firebase設定を追加：

```bash
cp .env.example .env.local
# .env.localを編集してFirebaseの設定を追加
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## Vercelへのデプロイ

### 自動デプロイ（推奨）

1. [Vercel](https://vercel.com)にログイン
2. "Import Project"をクリック
3. GitHubリポジトリ`jinjinsansan/hachikai`を選択
4. Root Directoryを`admin-dashboard`に設定
5. 環境変数を設定
6. デプロイ

### 手動デプロイ

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

## 環境変数

Vercelダッシュボードで以下の環境変数を設定：

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## ディレクトリ構造

```
admin-dashboard/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # Reactコンポーネント
│   └── lib/          # ユーティリティ
├── public/           # 静的ファイル
├── package.json
└── tsconfig.json
```

## ライセンス

プロプライエタリ - All rights reserved