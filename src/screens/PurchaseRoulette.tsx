import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Linking,
} from 'react-native';
import { WishlistItem } from '../types';

interface PurchaseRouletteProps {
  wishlistItems: WishlistItem[];
  onPurchaseComplete?: () => void;
}

const PurchaseRoulette: React.FC<PurchaseRouletteProps> = ({ wishlistItems, onPurchaseComplete }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleStart = () => {
    if (wishlistItems.length === 0) {
      return;
    }

    setIsSpinning(true);
    setSelectedItem(null);

    // ルーレットアニメーション
    Animated.sequence([
      Animated.timing(scrollY, {
        toValue: -3000,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scrollY, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(scrollY, {
          toValue: -3000,
          duration: 300,
          useNativeDriver: true,
        }),
        { iterations: 10 }
      ),
    ]).start();
  };

  const handleStop = () => {
    if (!isSpinning) return;

    scrollY.stopAnimation();
    setIsSpinning(false);

    // ランダムに商品を選択
    const randomIndex = Math.floor(Math.random() * wishlistItems.length);
    setSelectedItem(wishlistItems[randomIndex]);

    Animated.timing(scrollY, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const openAmazon = () => {
    if (selectedItem?.url) {
      Linking.openURL(selectedItem.url);
      // 購入完了をマーク
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>購入ルーレット</Text>
          <Text style={styles.subtitle}>運命の商品を選ぼう</Text>
        </View>

        <View style={styles.rouletteContainer}>
          <View style={styles.rouletteFrame}>
            <View style={styles.rouletteWindow}>
              {isSpinning ? (
                <Animated.View
                  style={[
                    styles.spinningContent,
                    { transform: [{ translateY: scrollY }] },
                  ]}
                >
                  {Array.from({ length: 20 }).map((_, index) => (
                    <View key={index} style={styles.spinItem}>
                      <Text style={styles.spinItemText}>
                        {wishlistItems[index % wishlistItems.length]?.title || '???'}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              ) : selectedItem ? (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultTitle}>{selectedItem.title}</Text>
                  <Text style={styles.resultPrice}>¥{selectedItem.price.toLocaleString()}</Text>
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>
                    {wishlistItems.length === 0
                      ? '欲しいものリストを登録してください'
                      : 'STARTボタンを押してルーレットを開始'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.roulettePointer} />
          </View>
        </View>

        <View style={styles.controls}>
          {!isSpinning ? (
            <TouchableOpacity
              style={[styles.startButton, wishlistItems.length === 0 && styles.disabledButton]}
              onPress={handleStart}
              disabled={wishlistItems.length === 0}
            >
              <Text style={styles.startButtonText}>START</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopButtonText}>STOP</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedItem && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>選ばれた商品</Text>
            <View style={styles.resultDetails}>
              <Text style={styles.resultName}>{selectedItem.title}</Text>
              <Text style={styles.resultPriceLabel}>
                価格: ¥{selectedItem.price.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity style={styles.amazonButton} onPress={openAmazon}>
              <Text style={styles.amazonButtonText}>Amazonで購入する</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ルーレットルール</Text>
          <Text style={styles.infoText}>
            1. 欲しいものリストから商品をランダムに選択{'\n'}
            2. 選ばれた商品は購入義務対象{'\n'}
            3. 階層により1日の購入回数が決定
          </Text>
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
  rouletteContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  rouletteFrame: {
    width: 300,
    height: 200,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 4,
    position: 'relative',
  },
  rouletteWindow: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roulettePointer: {
    position: 'absolute',
    left: '50%',
    top: -10,
    width: 20,
    height: 20,
    backgroundColor: '#FF4444',
    transform: [{ translateX: -10 }, { rotate: '45deg' }],
  },
  spinningContent: {
    position: 'absolute',
    width: '100%',
  },
  spinItem: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  spinItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  resultContainer: {
    alignItems: 'center',
    padding: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF4444',
  },
  placeholderContainer: {
    padding: 30,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9A9A9A',
    textAlign: 'center',
    lineHeight: 24,
  },
  controls: {
    alignItems: 'center',
    marginVertical: 30,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderRadius: 40,
  },
  stopButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderRadius: 40,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  resultCard: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  resultCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  resultDetails: {
    marginBottom: 20,
  },
  resultName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  resultPriceLabel: {
    fontSize: 16,
    color: '#7A7A7A',
  },
  amazonButton: {
    backgroundColor: '#FF9900',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  amazonButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#5A5A5A',
    lineHeight: 22,
  },
});

export default PurchaseRoulette;