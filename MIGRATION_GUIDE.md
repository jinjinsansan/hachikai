# Firebase → Supabase 移行ガイド

## 概要

HachiKaiアプリケーションをFirebaseからSupabaseに完全移行するためのガイドです。

## 移行のメリット

### Supabaseの利点
- **PostgreSQL**: リレーショナルデータベースでSQL使用可能
- **無料枠が寛大**: 500MBストレージ、無制限のAuth users
- **オープンソース**: セルフホスト可能
- **Row Level Security**: 細かいアクセス制御
- **料金透明性**: 従量課金が明確

## 移行チェックリスト

### ✅ 完了済み

1. **データベーススキーマ作成**
   - [x] PostgreSQLテーブル設計
   - [x] インデックス作成
   - [x] RLSポリシー設定

2. **認証システム移行**
   - [x] Supabase Auth設定
   - [x] Google OAuth対応
   - [x] メール/パスワード認証

3. **リアルタイム機能**
   - [x] Realtimeサブスクリプション
   - [x] データ同期ロジック

4. **React Nativeアプリ**
   - [x] Supabaseクライアント統合
   - [x] AuthManager作成
   - [x] RealtimeSync実装

5. **管理者ダッシュボード**
   - [x] Supabase対応LoginForm
   - [x] データ取得ロジック

### ⏳ 移行手順

## ステップ1: Supabaseプロジェクト作成

```bash
# 1. Supabaseアカウント作成
https://supabase.com

# 2. 新規プロジェクト作成
- Project name: hachikai
- Region: Northeast Asia (Tokyo)
- Database Password: 強力なパスワード設定
```

## ステップ2: データベース構築

```sql
-- SQLエディターで実行
-- /supabase/schema.sqlの内容を全てコピー＆実行
```

## ステップ3: 既存データの移行

### Firestoreからデータエクスポート

```javascript
// Firebase側でデータをエクスポート
const admin = require('firebase-admin');
const fs = require('fs');

async function exportData() {
  const db = admin.firestore();

  // ユーザーデータ
  const users = await db.collection('users').get();
  const userData = users.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  fs.writeFileSync('users.json', JSON.stringify(userData));

  // 購入データ
  const purchases = await db.collection('purchases').get();
  const purchaseData = purchases.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  fs.writeFileSync('purchases.json', JSON.stringify(purchaseData));
}
```

### Supabaseにデータインポート

```javascript
// Supabase側でデータをインポート
const { createClient } = require('@supabase/supabase-js');
const users = require('./users.json');
const purchases = require('./purchases.json');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function importData() {
  // ユーザーをインポート
  for (const user of users) {
    await supabase.from('profiles').insert({
      email: user.email,
      name: user.name,
      floor: user.floor,
      total_points: user.points,
      // マッピング調整
    });
  }

  // 購入履歴をインポート
  for (const purchase of purchases) {
    await supabase.from('purchases').insert({
      product_name: purchase.productName,
      price: purchase.price,
      status: purchase.status,
      // マッピング調整
    });
  }
}
```

## ステップ4: アプリケーション更新

### React Nativeアプリ

```bash
# 1. 依存関係インストール
npm install @supabase/supabase-js react-native-url-polyfill

# 2. Firebaseパッケージを削除
npm uninstall @react-native-firebase/app @react-native-firebase/auth \
  @react-native-firebase/firestore @react-native-firebase/messaging

# 3. 環境変数設定
cp .env.example .env
# .envを編集してSupabase認証情報を設定
```

### 管理者ダッシュボード

```bash
cd admin-dashboard

# 1. 依存関係インストール
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# 2. Firebaseパッケージを削除
npm uninstall firebase firebase-admin

# 3. 環境変数設定
cp .env.local.example .env.local
# .env.localを編集
```

## ステップ5: コード変更

### Before (Firebase)
```typescript
// Firebase認証
import { auth } from '@/lib/firebase';
await signInWithEmailAndPassword(auth, email, password);

// Firestoreデータ取得
const doc = await firestore().collection('users').doc(userId).get();
```

### After (Supabase)
```typescript
// Supabase認証
import { supabase } from '@/lib/supabase';
await supabase.auth.signInWithPassword({ email, password });

// Supabaseデータ取得
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

## ステップ6: 動作確認

### ローカルテスト

```bash
# React Nativeアプリ
npm start

# 管理者ダッシュボード
cd admin-dashboard && npm run dev
```

### チェックリスト
- [ ] ユーザー登録/ログイン
- [ ] Google認証
- [ ] データの取得/保存
- [ ] リアルタイム同期
- [ ] 管理者機能
- [ ] オフライン対応

## ステップ7: 本番環境デプロイ

### Vercel環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### デプロイ

```bash
vercel --prod
```

## 主な変更点まとめ

| 機能 | Firebase | Supabase |
|-----|----------|----------|
| データベース | Firestore (NoSQL) | PostgreSQL |
| 認証 | Firebase Auth | Supabase Auth |
| リアルタイム | Firestore listeners | Realtime subscriptions |
| ストレージ | Cloud Storage | Supabase Storage |
| 関数 | Cloud Functions | Edge Functions |
| 料金 | 従量課金 | 月額固定＋従量課金 |

## 注意事項

### データ型の違い
- FirestoreのTimestamp → PostgreSQLのTIMESTAMPTZ
- FirestoreのDocumentReference → PostgreSQLのForeign Key

### 認証の違い
- FirebaseのカスタムクレームはSupabaseのJWT claimsに移行
- FirebaseのAnonymous認証はSupabaseでは別途実装必要

### リアルタイムの違い
- Firestoreの自動同期はSupabaseでは明示的なサブスクリプション必要

## サポート

移行に関する質問や問題がある場合：

1. [Supabase Discord](https://discord.supabase.com)
2. [Supabase Documentation](https://supabase.com/docs)
3. このプロジェクトのIssueセクション

## 移行完了後のクリーンアップ

```bash
# Firebaseプロジェクトの削除（データバックアップ後）
# 1. Firebase Consoleでプロジェクト設定
# 2. プロジェクトを削除

# 不要なファイルの削除
rm -rf src/utils/Firebase*.ts
rm -rf src/utils/AuthManager.ts  # Firebase版
rm -rf src/utils/RealtimeSync.ts # Firebase版
rm -f admin-dashboard/src/lib/firebase.ts
rm -f FIREBASE_SETUP.md
```