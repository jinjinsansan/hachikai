import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { User } from '../types';

const AUTH_TOKEN_KEY = '@hachiKai:authToken';
const USER_ID_KEY = '@hachiKai:userId';
const BIOMETRIC_ENABLED_KEY = '@hachiKai:biometricEnabled';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  wishlistUrl: string;
}

/**
 * ユーザー認証管理システム
 * Firebase Authを使用した認証とセッション管理
 */
export class AuthManager {
  /**
   * 現在のユーザーを取得
   */
  static getCurrentUser(): FirebaseAuthTypes.User | null {
    return auth().currentUser;
  }

  /**
   * ユーザー登録
   */
  static async signUp(data: SignUpData): Promise<User> {
    try {
      // Firebase Authでユーザー作成
      const credential = await auth().createUserWithEmailAndPassword(
        data.email,
        data.password
      );

      const { user } = credential;

      // ユーザープロフィール更新
      await user.updateProfile({
        displayName: data.name,
      });

      // メール確認を送信
      await user.sendEmailVerification();

      // Firestoreにユーザーデータを作成
      const userData: User = {
        id: user.uid,
        name: data.name,
        email: data.email,
        floor: 1, // 初期階層
        floorLockUntil: null,
        wishlistUrl: data.wishlistUrl,
        totalCoins: 0,
        dailyPurchaseCount: 0,
        dailyAdViewCount: 0,
        lastResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({
          ...userData,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      // ローカルに保存
      await AsyncStorage.setItem(USER_ID_KEY, user.uid);
      await this.saveAuthToken();

      return userData;
    } catch (error) {
      console.error('Sign up error:', error);
      throw this.getAuthError(error);
    }
  }

  /**
   * ログイン
   */
  static async signIn(
    email: string,
    password: string
  ): Promise<User | null> {
    try {
      const credential = await auth().signInWithEmailAndPassword(
        email,
        password
      );

      const { user } = credential;

      // Firestoreからユーザーデータを取得
      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      if (!userDoc.exists) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data() as User;

      // ローカルに保存
      await AsyncStorage.setItem(USER_ID_KEY, user.uid);
      await this.saveAuthToken();

      return userData;
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.getAuthError(error);
    }
  }

  /**
   * ログアウト
   */
  static async signOut(): Promise<void> {
    try {
      await auth().signOut();
      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY,
        USER_ID_KEY,
        '@hachiKai:userData',
      ]);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('ログアウトに失敗しました');
    }
  }

  /**
   * パスワードリセット
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw this.getAuthError(error);
    }
  }

  /**
   * メールアドレス変更
   */
  static async updateEmail(newEmail: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      await user.updateEmail(newEmail);
      await user.sendEmailVerification();

      // Firestoreも更新
      await firestore().collection('users').doc(user.uid).update({
        email: newEmail,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Update email error:', error);
      throw this.getAuthError(error);
    }
  }

  /**
   * パスワード変更
   */
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      await user.updatePassword(newPassword);
    } catch (error) {
      console.error('Update password error:', error);
      throw this.getAuthError(error);
    }
  }

  /**
   * 生体認証の有効化
   */
  static async enableBiometricAuth(): Promise<void> {
    try {
      // React Native Touch ID/Face IDライブラリと連携
      // ここではフラグのみ設定
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

      Alert.alert(
        '生体認証',
        '生体認証が有効になりました',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      throw new Error('生体認証の有効化に失敗しました');
    }
  }

  /**
   * 生体認証の無効化
   */
  static async disableBiometricAuth(): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      throw new Error('生体認証の無効化に失敗しました');
    }
  }

  /**
   * 生体認証が有効か確認
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check biometric status:', error);
      return false;
    }
  }

  /**
   * JWTトークンを取得・保存
   */
  private static async saveAuthToken(): Promise<void> {
    try {
      const user = auth().currentUser;
      if (user) {
        const token = await user.getIdToken();
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Failed to save auth token:', error);
    }
  }

  /**
   * JWTトークンをリフレッシュ
   */
  static async refreshAuthToken(): Promise<string | null> {
    try {
      const user = auth().currentUser;
      if (!user) {
        return null;
      }

      const token = await user.getIdToken(true); // force refresh
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      return token;
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      return null;
    }
  }

  /**
   * 保存済みトークンを取得
   */
  static async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * セッションの検証
   */
  static async validateSession(): Promise<boolean> {
    try {
      const user = auth().currentUser;
      if (!user) {
        return false;
      }

      // トークンの有効性を確認
      try {
        await user.getIdToken();
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      console.error('Failed to validate session:', error);
      return false;
    }
  }

  /**
   * 認証状態リスナー設定
   */
  static onAuthStateChanged(
    callback: (user: FirebaseAuthTypes.User | null) => void
  ): () => void {
    return auth().onAuthStateChanged(callback);
  }

  /**
   * ソーシャルログイン（Google）
   */
  static async signInWithGoogle(): Promise<User | null> {
    try {
      // Google Sign-Inライブラリと連携が必要
      // ここではプレースホルダー
      throw new Error('Google Sign-In not implemented yet');
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  /**
   * ソーシャルログイン（Apple）
   */
  static async signInWithApple(): Promise<User | null> {
    try {
      // Apple Sign-Inライブラリと連携が必要
      // ここではプレースホルダー
      throw new Error('Apple Sign-In not implemented yet');
    } catch (error) {
      console.error('Apple sign-in error:', error);
      throw error;
    }
  }

  /**
   * アカウント削除
   */
  static async deleteAccount(): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // Firestoreのユーザーデータを削除
      await firestore().collection('users').doc(user.uid).delete();

      // Firebase Authからアカウント削除
      await user.delete();

      // ローカルデータをクリア
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Delete account error:', error);
      throw this.getAuthError(error);
    }
  }

  /**
   * エラーメッセージの取得
   */
  private static getAuthError(error: unknown): Error {
    const errorCode = (error as any)?.code;
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return new Error('このメールアドレスは既に使用されています');
      case 'auth/invalid-email':
        return new Error('メールアドレスの形式が正しくありません');
      case 'auth/weak-password':
        return new Error('パスワードは6文字以上で入力してください');
      case 'auth/user-not-found':
        return new Error('ユーザーが見つかりません');
      case 'auth/wrong-password':
        return new Error('パスワードが正しくありません');
      case 'auth/too-many-requests':
        return new Error('リクエストが多すぎます。しばらく待ってから再試行してください');
      case 'auth/network-request-failed':
        return new Error('ネットワークエラーが発生しました');
      case 'auth/requires-recent-login':
        return new Error('この操作には再認証が必要です');
      default:
        return new Error((error as any)?.message || '認証エラーが発生しました');
    }
  }
}