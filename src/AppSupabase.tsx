/**
 * HachiKai - 階層制相互扶助システム (Supabase版)
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import InitialSetup from './screens/InitialSetup';
import { SupabaseAuthManager } from './utils/SupabaseAuthManager';
import { SupabaseRealtimeSync } from './utils/SupabaseRealtimeSync';
import { DailyReset } from './utils/DailyReset';
import { supabase } from './lib/supabase';
import 'react-native-url-polyfill/auto';

function AppSupabase() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();

    // 認証状態の監視
    const authManager = SupabaseAuthManager.getInstance();
    const unsubscribe = authManager.subscribeToAuthChanges((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        // リアルタイム同期を開始
        const realtimeSync = SupabaseRealtimeSync.getInstance();
        realtimeSync.syncProfile(user.id);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe.unsubscribe();
    };
  }, []);

  const initializeApp = async () => {
    try {
      const authManager = SupabaseAuthManager.getInstance();

      // 認証状態をチェック
      const isAuth = await authManager.isAuthenticated();
      setIsAuthenticated(isAuth);

      if (isAuth) {
        // ユーザープロファイルを確認
        const profile = await authManager.getCurrentProfile();
        if (!profile) {
          setIsFirstLaunch(true);
        } else {
          // 日次リセットチェック
          await DailyReset.checkAndReset();
          setIsReady(true);
        }
      } else {
        setIsFirstLaunch(true);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsLoading(false);
      setIsFirstLaunch(true);
    }
  };

  const handleInitialSetupComplete = async () => {
    setIsFirstLaunch(false);
    setIsReady(true);

    // オフラインキューを同期
    const realtimeSync = SupabaseRealtimeSync.getInstance();
    await realtimeSync.syncOfflineQueue();
  };

  const handleAppReset = async () => {
    try {
      const authManager = SupabaseAuthManager.getInstance();
      await authManager.signOut();

      setIsReady(false);
      setIsAuthenticated(false);
      setIsFirstLaunch(true);
      await initializeApp();
    } catch (error) {
      console.error('Failed to reset app:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#FFFFFF"
      />
      {isFirstLaunch || !isAuthenticated ? (
        <InitialSetup onComplete={handleInitialSetupComplete} />
      ) : (
        isReady && <AppNavigator onResetApp={handleAppReset} />
      )}
    </SafeAreaProvider>
  );
}

export default AppSupabase;