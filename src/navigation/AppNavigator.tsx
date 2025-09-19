import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Import screens
import MyPage from '../screens/MyPage';
import FloorStatus from '../screens/FloorStatus';
import PurchaseRoulette from '../screens/PurchaseRoulette';
import AdView from '../screens/AdView';
import SettingsScreen from '../screens/SettingsScreen';
import WishlistManager from '../screens/WishlistManager';

// Import utilities
import { UserManager } from '../utils/UserManager';
import { User, WishlistItem } from '../types';

const Tab = createBottomTabNavigator();

interface AppNavigatorProps {
  onResetApp?: () => void;
}

// Tab icon component
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons: { [key: string]: string } = {
    'マイページ': '👤',
    '階層状況': '📊',
    'ルーレット': '🎰',
    '広告': '📺',
    '欲しいもの': '🛒',
    '設定': '⚙️',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[name] || '❓'}
      </Text>
    </View>
  );
};

const AppNavigator: React.FC<AppNavigatorProps> = ({ onResetApp }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    loadData();
    // データ更新用のインターバル設定（5秒ごと）
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const userData = await UserManager.loadUser();
    const wishlist = await UserManager.loadWishlist();
    setUser(userData);
    setWishlistItems(wishlist);
  };

  const handleAdWatched = async () => {
    await UserManager.incrementProgress('adView');
    await loadData();
  };

  const handlePurchaseComplete = async () => {
    await UserManager.incrementProgress('purchase');
    await loadData();
  };

  if (!user) {
    return null; // または Loading画面
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: '#1A1A1A',
          tabBarInactiveTintColor: '#9A9A9A',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          headerShown: false,
        })}
      >
        <Tab.Screen name="マイページ">
          {() => <MyPage user={user} />}
        </Tab.Screen>

        <Tab.Screen name="階層状況">
          {() => <FloorStatus user={user} />}
        </Tab.Screen>

        <Tab.Screen name="ルーレット">
          {() => (
            <PurchaseRoulette
              wishlistItems={wishlistItems}
              onPurchaseComplete={handlePurchaseComplete}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="広告">
          {() => <AdView user={user} onAdWatched={handleAdWatched} />}
        </Tab.Screen>

        <Tab.Screen name="欲しいもの">
          {() => <WishlistManager />}
        </Tab.Screen>

        <Tab.Screen name="設定">
          {() => <SettingsScreen onResetApp={onResetApp} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});

export default AppNavigator;