import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { User, FLOOR_RULES } from '../types';

interface MyPageProps {
  user: User;
}

const MyPage: React.FC<MyPageProps> = ({ user }) => {
  const currentFloorRules = FLOOR_RULES[user.floor - 1];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.floorNumber}>{user.floor}</Text>
          <Text style={styles.floorLabel}>階</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userId}>ID: {user.id}</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>今日の進捗</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>購入義務:</Text>
            <Text style={styles.statusValue}>
              {user.dailyPurchaseCount} / {currentFloorRules.purchaseRequired}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>広告視聴:</Text>
            <Text style={styles.statusValue}>
              {user.dailyAdViewCount} / {currentFloorRules.adViewRequired}
            </Text>
          </View>
          {user.debt !== undefined && user.debt > 0 && (
            <View style={styles.debtRow}>
              <Text style={styles.debtLabel}>累積借金:</Text>
              <Text style={styles.debtValue}>¥{user.debt.toLocaleString()}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.wishlistButton}>
          <Text style={styles.wishlistButtonText}>欲しいものリスト管理</Text>
        </TouchableOpacity>

        <View style={styles.rulesCard}>
          <Text style={styles.sectionTitle}>現在階層のルール</Text>
          <Text style={styles.rulesText}>{currentFloorRules.specialRules}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  floorNumber: {
    fontSize: 80,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  floorLabel: {
    fontSize: 40,
    fontWeight: '700',
    color: '#4A4A4A',
    marginLeft: 8,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  userId: {
    fontSize: 14,
    color: '#7A7A7A',
  },
  statusCard: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#5A5A5A',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  debtLabel: {
    fontSize: 16,
    color: '#D32F2F',
  },
  debtValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
  },
  wishlistButton: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  wishlistButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rulesCard: {
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  rulesText: {
    fontSize: 14,
    color: '#5A5A5A',
    lineHeight: 22,
  },
});

export default MyPage;