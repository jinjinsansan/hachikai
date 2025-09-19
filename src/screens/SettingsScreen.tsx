import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { UserManager } from '../utils/UserManager';
import { DailyReset } from '../utils/DailyReset';
import { User } from '../types';

interface SettingsScreenProps {
  onResetApp?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onResetApp }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUrlModalVisible, setIsUrlModalVisible] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userData = await UserManager.loadUser();
    setUser(userData);
    if (userData) {
      setNewName(userData.name);
      setNewUrl(userData.wishlistUrl || '');
    }
  };

  const handleNameChange = async () => {
    if (!newName.trim()) {
      Alert.alert('エラー', '名前を入力してください');
      return;
    }

    if (user) {
      user.name = newName.trim();
      await UserManager.saveUser(user);
      setUser({ ...user });
      setIsNameModalVisible(false);
      Alert.alert('成功', '名前を変更しました');
    }
  };

  const handleUrlChange = async () => {
    if (user) {
      user.wishlistUrl = newUrl.trim();
      await UserManager.saveUser(user);
      setUser({ ...user });
      setIsUrlModalVisible(false);
      Alert.alert('成功', '欲しいものリストURLを変更しました');
    }
  };

  const handleDebugReset = () => {
    Alert.alert(
      '⚠️ デバッグ機能',
      '日次リセットを強制実行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '実行',
          style: 'destructive',
          onPress: async () => {
            await DailyReset.forceReset();
            await loadUserData();
            Alert.alert('完了', '日次リセットを実行しました');
          },
        },
      ]
    );
  };

  const handleDataReset = () => {
    Alert.alert(
      '⚠️ データ削除',
      'すべてのデータを削除してアプリをリセットしますか？\nこの操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await UserManager.resetAllData();
            if (onResetApp) {
              onResetApp();
            }
          },
        },
      ]
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>設定</Text>
        </View>

        {renderSection(
          'ユーザー情報',
          <>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setIsNameModalVisible(true)}
            >
              <Text style={styles.settingLabel}>名前</Text>
              <View style={styles.settingValueContainer}>
                <Text style={styles.settingValue}>{user?.name || '-'}</Text>
                <Text style={styles.settingArrow}>›</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setIsUrlModalVisible(true)}
            >
              <Text style={styles.settingLabel}>欲しいものリストURL</Text>
              <View style={styles.settingValueContainer}>
                <Text style={styles.settingValue} numberOfLines={1}>
                  {user?.wishlistUrl || '未設定'}
                </Text>
                <Text style={styles.settingArrow}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>ユーザーID</Text>
              <Text style={styles.settingValueFixed}>{user?.id || '-'}</Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>現在の階層</Text>
              <Text style={styles.settingValueFixed}>{user?.floor || '-'}階</Text>
            </View>
          </>
        )}

        {renderSection(
          'アプリ情報',
          <>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>バージョン</Text>
              <Text style={styles.settingValueFixed}>1.0.0</Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>アプリ名</Text>
              <Text style={styles.settingValueFixed}>ハチカイ</Text>
            </View>
          </>
        )}

        {renderSection(
          'デバッグ機能',
          <>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleDebugReset}
            >
              <Text style={styles.dangerButtonText}>日次リセットを強制実行</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, styles.criticalButton]}
              onPress={handleDataReset}
            >
              <Text style={styles.dangerButtonText}>すべてのデータを削除</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            階層制相互扶助システム{'\n'}
            © 2024 HachiKai
          </Text>
        </View>
      </ScrollView>

      {/* 名前変更モーダル */}
      <Modal
        visible={isNameModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>名前を変更</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="新しい名前"
              placeholderTextColor="#AAAAAA"
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setIsNameModalVisible(false);
                  setNewName(user?.name || '');
                }}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleNameChange}
              >
                <Text style={styles.modalConfirmText}>変更</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* URL変更モーダル */}
      <Modal
        visible={isUrlModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsUrlModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>欲しいものリストURL</Text>
            <TextInput
              style={styles.modalInput}
              value={newUrl}
              onChangeText={setNewUrl}
              placeholder="https://www.amazon.co.jp/..."
              placeholderTextColor="#AAAAAA"
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setIsUrlModalVisible(false);
                  setNewUrl(user?.wishlistUrl || '');
                }}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleUrlChange}
              >
                <Text style={styles.modalConfirmText}>変更</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  section: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A7A7A',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingValue: {
    fontSize: 16,
    color: '#7A7A7A',
    textAlign: 'right',
    marginRight: 8,
    maxWidth: 200,
  },
  settingValueFixed: {
    fontSize: 16,
    color: '#7A7A7A',
  },
  settingArrow: {
    fontSize: 20,
    color: '#CCCCCC',
  },
  dangerButton: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginVertical: 8,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  criticalButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF5350',
  },
  dangerButtonText: {
    color: '#D84315',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#9A9A9A',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 12,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#7A7A7A',
  },
  modalConfirmButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SettingsScreen;