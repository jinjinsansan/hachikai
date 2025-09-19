import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { PurchaseRecord } from '../types/amazon';
import { UserManager } from '../utils/UserManager';
import { ImageProcessor } from '../utils/ImageProcessor';

interface PurchaseConfirmationProps {
  purchaseRecord?: PurchaseRecord;
  onConfirmationComplete: (record: PurchaseRecord) => void;
}

const PurchaseConfirmation: React.FC<PurchaseConfirmationProps> = ({
  purchaseRecord,
  onConfirmationComplete,
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');

  const handleTakePhoto = async () => {
    try {
      setIsProcessing(true);
      const imagePath = await ImageProcessor.capturePhoto();

      if (imagePath) {
        setProofImage(imagePath);

        // OCRでテキスト抽出
        const text = await ImageProcessor.extractText(imagePath);
        setExtractedText(text);

        // 注文番号を自動検出
        const orderNumberMatch = text.match(/\d{3}-\d{7}-\d{7}/);
        if (orderNumberMatch) {
          setOrderNumber(orderNumberMatch[0]);
        }
      }
    } catch (error) {
      Alert.alert('エラー', '写真の撮影に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      setIsProcessing(true);
      const imagePath = await ImageProcessor.selectFromGallery();

      if (imagePath) {
        setProofImage(imagePath);

        // OCRでテキスト抽出
        const text = await ImageProcessor.extractText(imagePath);
        setExtractedText(text);

        // 注文番号を自動検出
        const orderNumberMatch = text.match(/\d{3}-\d{7}-\d{7}/);
        if (orderNumberMatch) {
          setOrderNumber(orderNumberMatch[0]);
        }
      }
    } catch (error) {
      Alert.alert('エラー', '画像の選択に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!orderNumber.trim()) {
      Alert.alert('エラー', '注文番号を入力してください');
      return;
    }

    if (!proofImage) {
      Alert.alert('エラー', '購入証明画像を選択してください');
      return;
    }

    setIsProcessing(true);

    try {
      // 画像を圧縮
      const compressedImage = await ImageProcessor.compressImage(proofImage);

      // 購入証明を検証
      const isValid = await ImageProcessor.validatePurchaseProof(compressedImage);

      if (!isValid) {
        Alert.alert('警告', '購入証明が不明確です。別の画像を使用してください。');
        return;
      }

      // 購入記録を更新
      if (purchaseRecord) {
        const updatedRecord: PurchaseRecord = {
          ...purchaseRecord,
          orderNumber,
          proofImageUrl: compressedImage,
          confirmationStatus: 'confirmed',
          confirmationDate: new Date(),
        };

        // 購入完了を記録
        await UserManager.incrementProgress('purchase');

        Alert.alert(
          '成功',
          '購入証明が確認されました！',
          [
            {
              text: 'OK',
              onPress: () => onConfirmationComplete(updatedRecord),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('エラー', '購入証明の送信に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>購入証明</Text>
          <Text style={styles.subtitle}>購入完了画面を撮影してください</Text>
        </View>

        {purchaseRecord && (
          <View style={styles.productInfo}>
            <Text style={styles.productTitle}>{purchaseRecord.productInfo.title}</Text>
            <Text style={styles.productPrice}>¥{purchaseRecord.productInfo.price.toLocaleString()}</Text>
          </View>
        )}

        <View style={styles.imageSection}>
          {proofImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: proofImage }} style={styles.proofImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setProofImage(null);
                  setExtractedText('');
                }}
              >
                <Text style={styles.removeImageText}>×</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>購入証明画像</Text>
              <Text style={styles.placeholderSubtext}>タップして選択</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleTakePhoto}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>📷 撮影</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handleSelectFromGallery}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>🖼️ 選択</Text>
          </TouchableOpacity>
        </View>

        {extractedText !== '' && (
          <View style={styles.ocrResult}>
            <Text style={styles.ocrTitle}>抽出されたテキスト</Text>
            <Text style={styles.ocrText} numberOfLines={3}>
              {extractedText}
            </Text>
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>注文番号</Text>
          <TextInput
            style={styles.input}
            value={orderNumber}
            onChangeText={setOrderNumber}
            placeholder="123-4567890-1234567"
            placeholderTextColor="#AAAAAA"
            keyboardType="default"
          />
          <Text style={styles.inputHint}>
            Amazon注文履歴から注文番号をコピーしてください
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!orderNumber || !proofImage || isProcessing) && styles.disabledButton,
          ]}
          onPress={handleSubmitProof}
          disabled={!orderNumber || !proofImage || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>購入証明を送信</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📌 購入証明について</Text>
          <Text style={styles.infoText}>
            • Amazon注文確認画面のスクリーンショットを撮影{'\n'}
            • 注文番号が見える状態で撮影してください{'\n'}
            • 個人情報は自動的にマスク処理されます{'\n'}
            • 証明確認後、階層の義務が達成されます
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
  productInfo: {
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF5722',
  },
  imageSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
  },
  proofImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  placeholderContainer: {
    height: 300,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9A9A9A',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  galleryButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ocrResult: {
    backgroundColor: '#FFF8E1',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  ocrTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  ocrText: {
    fontSize: 12,
    color: '#795548',
    lineHeight: 18,
  },
  inputSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#9A9A9A',
  },
  submitButton: {
    backgroundColor: '#FF9900',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
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

export default PurchaseConfirmation;