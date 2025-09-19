import { supabase, Profile } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Alert } from 'react-native';

export class SupabaseAuthManager {
  private static instance: SupabaseAuthManager;
  private currentProfile: Profile | null = null;

  private constructor() {}

  static getInstance(): SupabaseAuthManager {
    if (!SupabaseAuthManager.instance) {
      SupabaseAuthManager.instance = new SupabaseAuthManager();
    }
    return SupabaseAuthManager.instance;
  }

  // メールとパスワードでサインアップ
  async signUp(email: string, password: string, name: string): Promise<boolean> {
    try {
      // Supabase Authでユーザー作成
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        console.error('サインアップエラー:', error);
        Alert.alert('エラー', error.message);
        return false;
      }

      if (data.user) {
        // プロファイルを作成
        const deviceId = await DeviceInfo.getUniqueId();
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: data.user.email!,
            name,
            floor: 1,
            device_id: deviceId,
          });

        if (profileError) {
          console.error('プロファイル作成エラー:', profileError);
          // ユーザーを削除
          await supabase.auth.admin.deleteUser(data.user.id);
          Alert.alert('エラー', 'プロファイルの作成に失敗しました');
          return false;
        }

        // ローカルストレージに保存
        await AsyncStorage.setItem('user_id', data.user.id);
        await AsyncStorage.setItem('user_email', email);

        return true;
      }

      return false;
    } catch (error) {
      console.error('サインアップエラー:', error);
      Alert.alert('エラー', 'サインアップに失敗しました');
      return false;
    }
  }

  // メールとパスワードでサインイン
  async signIn(email: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('サインインエラー:', error);
        Alert.alert('エラー', error.message);
        return false;
      }

      if (data.user) {
        // プロファイルを取得
        const profile = await this.getProfile(data.user.id);
        if (profile) {
          this.currentProfile = profile;
          await AsyncStorage.setItem('user_id', data.user.id);
          await AsyncStorage.setItem('user_email', email);

          // 最終アクティブ時刻を更新
          await supabase
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('user_id', data.user.id);

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('サインインエラー:', error);
      Alert.alert('エラー', 'サインインに失敗しました');
      return false;
    }
  }

  // Googleでサインイン（React Native用）
  async signInWithGoogle(): Promise<boolean> {
    try {
      // React NativeでのGoogle認証は、追加のライブラリが必要
      // @react-native-google-signin/google-signin を使用
      Alert.alert('情報', 'Google認証は別途設定が必要です');
      return false;
    } catch (error) {
      console.error('Google認証エラー:', error);
      return false;
    }
  }

  // サインアウト
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('サインアウトエラー:', error);
      }

      this.currentProfile = null;
      await AsyncStorage.multiRemove(['user_id', 'user_email', 'user_profile']);
    } catch (error) {
      console.error('サインアウトエラー:', error);
    }
  }

  // 現在のユーザーを取得
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      return null;
    }
  }

  // プロファイルを取得
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('プロファイル取得エラー:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('プロファイル取得エラー:', error);
      return null;
    }
  }

  // 現在のプロファイルを取得
  async getCurrentProfile(): Promise<Profile | null> {
    if (this.currentProfile) {
      return this.currentProfile;
    }

    const user = await this.getCurrentUser();
    if (user) {
      this.currentProfile = await this.getProfile(user.id);
      return this.currentProfile;
    }

    return null;
  }

  // プロファイルを更新
  async updateProfile(updates: Partial<Profile>): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('プロファイル更新エラー:', error);
        return false;
      }

      // キャッシュを更新
      if (this.currentProfile) {
        this.currentProfile = { ...this.currentProfile, ...updates };
      }

      return true;
    } catch (error) {
      console.error('プロファイル更新エラー:', error);
      return false;
    }
  }

  // パスワードリセットメールを送信
  async resetPassword(email: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'hachikai://reset-password',
      });

      if (error) {
        console.error('パスワードリセットエラー:', error);
        Alert.alert('エラー', error.message);
        return false;
      }

      Alert.alert('成功', 'パスワードリセットメールを送信しました');
      return true;
    } catch (error) {
      console.error('パスワードリセットエラー:', error);
      return false;
    }
  }

  // セッション状態を監視
  subscribeToAuthChanges(callback: (user: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('認証状態変更:', event);
      callback(session?.user || null);
    });

    return subscription;
  }

  // トークンをリフレッシュ
  async refreshToken(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('トークンリフレッシュエラー:', error);
        return false;
      }

      return !!data.session;
    } catch (error) {
      console.error('トークンリフレッシュエラー:', error);
      return false;
    }
  }

  // FCMトークンを更新
  async updateFCMToken(fcmToken: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: fcmToken })
        .eq('user_id', user.id);

      if (error) {
        console.error('FCMトークン更新エラー:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('FCMトークン更新エラー:', error);
      return false;
    }
  }

  // 認証済みかチェック
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      console.error('認証チェックエラー:', error);
      return false;
    }
  }
}