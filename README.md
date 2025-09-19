# HachiKai（ハチカイ）

## 📱 8階層相互扶助システムアプリ

HachiKai（ハチカイ）は、8つの階層による相互扶助と社会実験を組み合わせた革新的なReact Nativeアプリケーションです。

## 🎯 概要

- **8階層システム**: ユーザーは1〜8階の階層に属し、毎日のルーレットで階層が変動
- **相互扶助**: ユーザー間でAmazon商品の購入を通じた助け合いシステム
- **義務と権利**: 階層に応じた購入義務と受取権利のバランス
- **ゲーミフィケーション**: 日々の活動と運によって決まる階層変動システム

## 🏗️ アーキテクチャ

### フロントエンド
- **React Native 0.81.4**: クロスプラットフォーム対応
- **TypeScript**: 型安全性を確保
- **React Navigation**: 画面遷移管理
- **AsyncStorage**: ローカルデータ永続化

### バックエンド統合
- **Firebase Authentication**: ユーザー認証
- **Firebase Firestore**: リアルタイムデータベース
- **Firebase Cloud Messaging**: プッシュ通知
- **Amazon PA-API v5**: 商品情報取得

## 🚀 セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/jinjinsansan/hachikai.git

# 依存関係のインストール
cd HachiKai
npm install

# 実行
npm start
```

## 📝 ライセンス

プロプライエタリ - All rights reserved

---

© 2024 HachiKai Project. All rights reserved.