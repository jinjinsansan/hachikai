import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { UserManager } from '../utils/UserManager';
import { AmazonValidator } from '../utils/AmazonValidator';

interface InitialSetupProps {
  onComplete: () => void;
}

const InitialSetup: React.FC<InitialSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'name' | 'wishlist' | 'roulette' | 'complete'>('welcome');
  const [name, setName] = useState('');
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [assignedFloor, setAssignedFloor] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinAnimation = useState(new Animated.Value(0))[0];

  const handleNameSubmit = () => {
    if (name.trim().length < 1) {
      Alert.alert('エラー', 'お名前を入力してください');
      return;
    }
    setStep('wishlist');
  };

  const handleWishlistSubmit = () => {
    if (wishlistUrl.trim()) {
      const validation = AmazonValidator.validateAmazonUrl(wishlistUrl);
      if (!validation.isValid) {
        Alert.alert('エラー', validation.errorMessage || '有効なAmazon URLを入力してください');
        return;
      }
      if (validation.hasAffiliateTag) {
        Alert.alert(
          '注意',
          'アフィリエイトタグが含まれています。タグは削除されます。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: 'OK',
              onPress: () => {
                setWishlistUrl(AmazonValidator.cleanUrl(wishlistUrl));
                setStep('roulette');
              },
            },
          ]
        );
        return;
      }
    }
    setStep('roulette');
  };

  const startInitialRoulette = () => {
    setIsSpinning(true);

    // ルーレットアニメーション
    Animated.loop(
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ).start();

    // 3秒後に結果表示
    setTimeout(async () => {
      spinAnimation.stopAnimation();
      setIsSpinning(false);

      const floor = UserManager.generateInitialFloor();
      setAssignedFloor(floor);

      // ユーザーデータを保存
      await UserManager.createInitialUser(name, wishlistUrl);

      setStep('complete');
    }, 3000);
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>ハチカイへようこそ</Text>
            <Text style={styles.subtitle}>階層制相互扶助システム</Text>

            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                このアプリは8つの階層からなる{'\n'}
                相互扶助システムです。{'\n\n'}
                各階層には義務と権利があり、{'\n'}
                毎日のルーレットで階層が変動します。
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep('name')}
            >
              <Text style={styles.primaryButtonText}>はじめる</Text>
            </TouchableOpacity>
          </View>
        );

      case 'name':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>お名前を教えてください</Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="ニックネーム"
              placeholderTextColor="#AAAAAA"
              autoFocus
              maxLength={20}
            />

            <TouchableOpacity
              style={[styles.primaryButton, !name.trim() && styles.disabledButton]}
              onPress={handleNameSubmit}
              disabled={!name.trim()}
            >
              <Text style={styles.primaryButtonText}>次へ</Text>
            </TouchableOpacity>
          </View>
        );

      case 'wishlist':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>欲しいものリストURL（任意）</Text>
            <Text style={styles.stepDescription}>
              AmazonのURLを入力してください。{'\n'}
              あとで設定することも可能です。
            </Text>

            <TextInput
              style={styles.input}
              value={wishlistUrl}
              onChangeText={setWishlistUrl}
              placeholder="https://www.amazon.co.jp/..."
              placeholderTextColor="#AAAAAA"
              autoCapitalize="none"
              keyboardType="url"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleWishlistSubmit}
            >
              <Text style={styles.primaryButtonText}>
                {wishlistUrl.trim() ? '次へ' : 'スキップ'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'roulette':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>初期階層決定ルーレット</Text>
            <Text style={styles.stepDescription}>
              あなたの初期階層を決定します
            </Text>

            <View style={styles.rouletteContainer}>
              <Animated.View
                style={[
                  styles.rouletteWheel,
                  isSpinning && {
                    transform: [
                      {
                        rotate: spinAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((floor) => (
                  <View key={floor} style={styles.floorSection}>
                    <Text style={styles.floorNumber}>{floor}</Text>
                  </View>
                ))}
              </Animated.View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isSpinning && styles.disabledButton]}
              onPress={startInitialRoulette}
              disabled={isSpinning}
            >
              <Text style={styles.primaryButtonText}>
                {isSpinning ? '抽選中...' : 'ルーレットを回す'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'complete':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.resultTitle}>決定しました！</Text>

            <View style={styles.resultContainer}>
              <Text style={styles.resultFloor}>{assignedFloor}</Text>
              <Text style={styles.resultFloorLabel}>階</Text>
            </View>

            <Text style={styles.resultDescription}>
              あなたは{assignedFloor}階からスタートです。{'\n'}
              毎日の義務を果たして階層を上げましょう！
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onComplete}
            >
              <Text style={styles.primaryButtonText}>アプリを始める</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#7A7A7A',
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#7A7A7A',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  descriptionContainer: {
    backgroundColor: '#F8F8F8',
    padding: 24,
    borderRadius: 12,
    marginBottom: 40,
  },
  description: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 26,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  rouletteContainer: {
    width: 250,
    height: 250,
    marginVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rouletteWheel: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F0F0F0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  floorSection: {
    width: '25%',
    height: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#CCCCCC',
  },
  floorNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4CAF50',
    marginBottom: 30,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  resultFloor: {
    fontSize: 120,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  resultFloorLabel: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4A4A4A',
    marginLeft: 12,
  },
  resultDescription: {
    fontSize: 16,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
});

export default InitialSetup;