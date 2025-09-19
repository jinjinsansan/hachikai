import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { UserManager } from '../utils/UserManager';
import { AmazonValidator } from '../utils/AmazonValidator';
import { WishlistItem } from '../types';

const WishlistManager: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    const items = await UserManager.loadWishlist();
    setWishlist(items);
  };

  const handleAddItem = async () => {
    if (!newItemUrl.trim()) {
      Alert.alert('エラー', 'URLを入力してください');
      return;
    }

    const validation = AmazonValidator.validateAmazonUrl(newItemUrl);
    if (!validation.isValid) {
      Alert.alert('エラー', validation.errorMessage || '有効なAmazon URLを入力してください');
      return;
    }

    if (!newItemTitle.trim()) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }

    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) {
      Alert.alert('エラー', '有効な価格を入力してください');
      return;
    }

    setIsLoading(true);

    const cleanUrl = AmazonValidator.cleanUrl(newItemUrl);
    const newItem: WishlistItem = {
      id: `item_${Date.now()}`,
      title: newItemTitle,
      price,
      url: cleanUrl,
    };

    try {
      const updatedWishlist = await UserManager.addToWishlist(newItem);
      setWishlist(updatedWishlist);
      setIsModalVisible(false);
      resetForm();
      Alert.alert('成功', '商品が追加されました');
    } catch (error) {
      Alert.alert('エラー', '商品の追加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = (itemId: string, itemTitle: string) => {
    Alert.alert(
      '削除確認',
      `「${itemTitle}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const updatedWishlist = await UserManager.removeFromWishlist(itemId);
            setWishlist(updatedWishlist);
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setNewItemUrl('');
    setNewItemTitle('');
    setNewItemPrice('');
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemPrice}>¥{item.price.toLocaleString()}</Text>
        <Text style={styles.itemUrl} numberOfLines={1}>{item.url}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.id, item.title)}
      >
        <Text style={styles.deleteButtonText}>削除</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>欲しいものリスト管理</Text>
        <Text style={styles.headerSubtitle}>購入ルーレット用の商品を登録</Text>
      </View>

      <FlatList
        data={wishlist}
        renderItem={renderWishlistItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>商品が登録されていません</Text>
            <Text style={styles.emptySubtext}>下のボタンから追加してください</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ 商品を追加</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setIsModalVisible(false);
              resetForm();
            }}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>商品を追加</Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amazon URL *</Text>
              <TextInput
                style={styles.input}
                value={newItemUrl}
                onChangeText={setNewItemUrl}
                placeholder="https://www.amazon.co.jp/..."
                placeholderTextColor="#AAAAAA"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>商品名 *</Text>
              <TextInput
                style={styles.input}
                value={newItemTitle}
                onChangeText={setNewItemTitle}
                placeholder="商品の名前を入力"
                placeholderTextColor="#AAAAAA"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>価格（円） *</Text>
              <TextInput
                style={styles.input}
                value={newItemPrice}
                onChangeText={setNewItemPrice}
                placeholder="10000"
                placeholderTextColor="#AAAAAA"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📌 注意事項</Text>
              <Text style={styles.infoText}>
                • アフィリエイトタグは自動削除されます{'\n'}
                • 商品名と価格は手動で入力してください{'\n'}
                • 他のユーザーがこの商品を購入する可能性があります
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newItemUrl || !newItemTitle || !newItemPrice || isLoading) && styles.disabledButton
              ]}
              onPress={handleAddItem}
              disabled={!newItemUrl || !newItemTitle || !newItemPrice || isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? '追加中...' : '商品を追加'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7A7A7A',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
  },
  itemCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF5722',
    marginBottom: 4,
  },
  itemUrl: {
    fontSize: 12,
    color: '#9A9A9A',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#7A7A7A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9A9A9A',
  },
  addButton: {
    backgroundColor: '#1A1A1A',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#007AFF',
    width: 80,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A5A5A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  infoBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#795548',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WishlistManager;