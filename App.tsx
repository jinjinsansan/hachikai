/**
 * HachiKai - 階層制相互扶助システム
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import InitialSetup from './src/screens/InitialSetup';
import { UserManager } from './src/utils/UserManager';
import { DailyReset } from './src/utils/DailyReset';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 初回起動チェック
      const firstLaunch = await UserManager.isFirstLaunch();
      setIsFirstLaunch(firstLaunch);

      if (!firstLaunch) {
        // 日次リセットチェック
        await DailyReset.checkAndReset();
      }

      setIsLoading(false);
      if (!firstLaunch) {
        setIsReady(true);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsLoading(false);
      setIsReady(true);
    }
  };

  const handleInitialSetupComplete = () => {
    setIsFirstLaunch(false);
    setIsReady(true);
  };

  const handleAppReset = async () => {
    setIsReady(false);
    setIsFirstLaunch(true);
    await initializeApp();
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
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
      {isFirstLaunch ? (
        <InitialSetup onComplete={handleInitialSetupComplete} />
      ) : (
        isReady && <AppNavigator onResetApp={handleAppReset} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
