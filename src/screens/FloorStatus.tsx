import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { User, FLOOR_RULES } from '../types';

interface FloorStatusProps {
  user: User;
}

const FloorStatus: React.FC<FloorStatusProps> = ({ user }) => {
  const [timeUntilRoulette, setTimeUntilRoulette] = useState<string>('');
  const currentFloorRules = FLOOR_RULES[user.floor - 1];

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilRoulette(`${hours}時間 ${minutes}分 ${seconds}秒`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const getFloorColor = (floor: number) => {
    const colors = [
      '#E0E0E0', // 1階
      '#BDBDBD', // 2階
      '#9E9E9E', // 3階
      '#757575', // 4階
      '#616161', // 5階
      '#424242', // 6階
      '#212121', // 7階
      '#000000', // 8階
    ];
    return colors[floor - 1];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.floorHeader, { backgroundColor: getFloorColor(user.floor) }]}>
          <Text style={styles.floorTitle}>{user.floor}階</Text>
          <Text style={styles.floorSubtitle}>現在の階層</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>階層ルール詳細</Text>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>購入義務:</Text>
            <Text style={styles.ruleValue}>{currentFloorRules.purchaseRequired}回/日</Text>
          </View>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>広告視聴義務:</Text>
            <Text style={styles.ruleValue}>{currentFloorRules.adViewRequired}回/日</Text>
          </View>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>購入権利:</Text>
            <Text style={styles.ruleValue}>{currentFloorRules.purchaseReceived}回/日</Text>
          </View>

          <View style={styles.specialRuleBox}>
            <Text style={styles.specialRuleLabel}>特別ルール</Text>
            <Text style={styles.specialRuleText}>{currentFloorRules.specialRules}</Text>
          </View>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerTitle}>次回ルーレットまで</Text>
          <Text style={styles.timerText}>{timeUntilRoulette}</Text>
          <Text style={styles.timerNote}>毎日0時に階層変更の判定が行われます</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>確率修正要素</Text>

          <View style={styles.modifierItem}>
            <Text style={styles.modifierLabel}>連続達成ボーナス</Text>
            <Text style={styles.modifierValue}>+5%</Text>
          </View>

          <View style={styles.modifierItem}>
            <Text style={styles.modifierLabel}>義務超過達成</Text>
            <Text style={styles.modifierValue}>+3%</Text>
          </View>

          <View style={styles.modifierItem}>
            <Text style={styles.modifierLabel}>階層滞在日数</Text>
            <Text style={styles.modifierValue}>+1%/日</Text>
          </View>
        </View>

        <View style={styles.allFloorsCard}>
          <Text style={styles.sectionTitle}>全階層一覧</Text>
          {FLOOR_RULES.map((floor) => (
            <View
              key={floor.floor}
              style={[
                styles.floorItem,
                user.floor === floor.floor && styles.currentFloorItem
              ]}
            >
              <View style={[styles.floorIndicator, { backgroundColor: getFloorColor(floor.floor) }]} />
              <View style={styles.floorInfo}>
                <Text style={styles.floorItemNumber}>{floor.floor}階</Text>
                <Text style={styles.floorItemRule}>
                  購入: {floor.purchaseRequired} | 広告: {floor.adViewRequired} | 権利: {floor.purchaseReceived}
                </Text>
              </View>
            </View>
          ))}
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
  floorHeader: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  floorTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  floorSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ruleLabel: {
    fontSize: 16,
    color: '#5A5A5A',
  },
  ruleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  specialRuleBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  specialRuleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7A7A',
    marginBottom: 8,
  },
  specialRuleText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  timerCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  timerNote: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  modifierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modifierLabel: {
    fontSize: 15,
    color: '#5A5A5A',
  },
  modifierValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  allFloorsCard: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  floorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  currentFloorItem: {
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  floorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  floorInfo: {
    flex: 1,
  },
  floorItemNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  floorItemRule: {
    fontSize: 12,
    color: '#7A7A7A',
  },
});

export default FloorStatus;