# Firebase設定手順

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名: `hachikai-app`を入力
4. Google Analyticsを有効化（オプション）
5. プロジェクトを作成

## 2. Webアプリの追加

1. Firebaseプロジェクトの概要ページで「</> Webアプリを追加」をクリック
2. アプリ名: `HachiKai Admin`を入力
3. 「Firebase Hosting」はチェックしない（Vercelを使用するため）
4. 「アプリを登録」をクリック

## 3. Firebase設定の取得

登録後に表示される設定をコピー：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",              // ← この値をコピー
  authDomain: "hachikai-app.firebaseapp.com",
  projectId: "hachikai-app",
  storageBucket: "hachikai-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## 4. Firebaseサービスの有効化

### Authentication
1. Firebase Console → Authentication → 始める
2. Sign-in method → メール/パスワードを有効化
3. Users → ユーザーを追加（管理者用）
   - メール: admin@hachikai.com
   - パスワード: 任意の安全なパスワード

### Firestore Database
1. Firebase Console → Firestore Database → データベースを作成
2. 本番モードで開始
3. ロケーション: asia-northeast1（東京）
4. セキュリティルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 管理者のみ読み書き可能
    match /{document=**} {
      allow read, write: if request.auth != null &&
        request.auth.token.email == 'admin@hachikai.com';
    }

    // ユーザーは自分のデータのみ読み取り可能
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5. Vercel環境変数の設定

Vercelダッシュボードで以下を設定：

| 環境変数名 | 値の例 |
|-----------|--------|
| NEXT_PUBLIC_FIREBASE_API_KEY | AIzaSyBxxxxxxxxxxxxxx |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | hachikai-app.firebaseapp.com |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | hachikai-app |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | hachikai-app.appspot.com |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | 123456789 |
| NEXT_PUBLIC_FIREBASE_APP_ID | 1:123456789:web:abc123 |

## 6. 初期データの作成

Firestore Consoleで以下のコレクションを作成：

### users コレクション
```json
{
  "id": "user001",
  "name": "テストユーザー",
  "email": "test@example.com",
  "floor": 3,
  "dailyPurchaseCount": 0,
  "dailyAdViewCount": 0,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### purchases コレクション
```json
{
  "id": "purchase001",
  "userId": "user001",
  "productName": "テスト商品",
  "price": 1000,
  "status": "confirmed",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### adViews コレクション
```json
{
  "id": "ad001",
  "userId": "user001",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 7. テスト

1. ローカルでテスト：
```bash
cd admin-dashboard
npm install
npm run dev
```

2. http://localhost:3000 にアクセス
3. 作成した管理者アカウントでログイン

## トラブルシューティング

### エラー: "Firebase: Error (auth/admin-restricted-operation)"
→ メール/パスワード認証が有効化されていない

### エラー: "Missing or insufficient permissions"
→ Firestoreセキュリティルールを確認

### エラー: "Failed to load resource"
→ 環境変数が正しく設定されているか確認

## セキュリティ注意事項

- 本番環境では強力なパスワードを使用
- Firebaseセキュリティルールを適切に設定
- 環境変数を公開リポジトリにコミットしない
- 管理者アカウントは最小限に制限