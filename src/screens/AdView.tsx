import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { User, FLOOR_RULES } from '../types';

interface AdViewProps {
  user: User;
  onAdWatched: () => void;
}

const AdView: React.FC<AdViewProps> = ({ user, onAdWatched }) => {
  const [isWatching, setIsWatching] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const currentFloorRules = FLOOR_RULES[user.floor - 1];
  const remainingAds = currentFloorRules.adViewRequired - user.dailyAdViewCount;

  const handleWatchAd = () => {
    setIsWatching(true);
    setWatchTime(30); // 30秒の広告

    const timer = setInterval(() => {
      setWatchTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsWatching(false);
          onAdWatched();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>広告視聴</Text>
          <Text style={styles.subtitle}>義務の広告を視聴しましょう</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>本日の視聴状況</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>完了済み:</Text>
            <Text style={styles.statusValue}>{user.dailyAdViewCount}回</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>必要数:</Text>
            <Text style={styles.statusValue}>{currentFloorRules.adViewRequired}回</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>残り:</Text>
            <Text style={[styles.statusValue, remainingAds > 0 && styles.remainingHighlight]}>
              {Math.max(0, remainingAds)}回
            </Text>
          </View>
        </View>

        <View style={styles.adContainer}>
          {isWatching ? (
            <View style={styles.adScreen}>
              <Text style={styles.adPlaceholderText}>広告再生中...</Text>
              <Text style={styles.countdown}>{watchTime}秒</Text>
              <Text style={styles.adNote}>広告終了まで画面を閉じないでください</Text>
            </View>
          ) : (
            <View style={styles.adScreen}>
              <Text style={styles.adPlaceholderText}>広告エリア</Text>
              <Text style={styles.adNote}>広告はここに表示されます</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.watchButton,
            (isWatching || remainingAds <= 0) && styles.disabledButton,
          ]}
          onPress={handleWatchAd}
          disabled={isWatching || remainingAds <= 0}
        >
          <Text style={styles.watchButtonText}>
            {isWatching ? '視聴中...' : remainingAds <= 0 ? '本日の義務完了' : '広告を視聴する'}
          </Text>
        </TouchableOpacity>

        {remainingAds > 0 && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ 注意</Text>
            <Text style={styles.warningText}>
              本日中にあと{remainingAds}回の広告視聴が必要です。
              義務を果たさない場合、階層降格の可能性があります。
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>広告視聴ルール</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>各階層で定められた回数の広告視聴が必須</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>1回の広告は30秒間</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>視聴中に画面を閉じると無効</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>•</Text>
            <Text style={styles.infoText}>毎日0時にカウントリセット</Text>
          </View>
        </View>

        <View style={styles.floorAdRequirements}>
          <Text style={styles.requirementsTitle}>階層別広告視聴義務</Text>
          {FLOOR_RULES.map((floor) => (
            <View
              key={floor.floor}
              style={[
                styles.requirementRow,
                user.floor === floor.floor && styles.currentRequirement,
              ]}
            >
              <Text style={styles.requirementFloor}>{floor.floor}階</Text>
              <Text style={styles.requirementCount}>{floor.adViewRequired}回/日</Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 16,
    color: '#7A7A7A',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  remainingHighlight: {
    color: '#FF5722',
  },
  adContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  adScreen: {
    backgroundColor: '#2C2C2C',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  adNote: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 16,
  },
  watchButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  watchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 14,
    color: '#5A5A5A',
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#5A5A5A',
    flex: 1,
    lineHeight: 20,
  },
  floorAdRequirements: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 6,
  },
  currentRequirement: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  requirementFloor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  requirementCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});

export default AdView;