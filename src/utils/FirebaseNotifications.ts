import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { ProductInfo } from '../types/amazon';
import { User } from '../types';

const FCM_TOKEN_KEY = '@hachiKai:fcmToken';
const NOTIFICATION_PERMISSION_KEY = '@hachiKai:notificationPermission';

/**
 * Firebase プッシュ通知管理システム
 * リモート通知の送受信と管理を行う
 */
export class FirebaseNotifications {
  /**
   * FCMトークン取得
   */
  static async getFCMToken(): Promise<string | null> {
    try {
      // 既存のトークンをチェック
      const existingToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (existingToken) {
        return existingToken;
      }

      // 通知権限をリクエスト
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        // FCMトークンを取得
        const token = await messaging().getToken();

        // トークンを保存
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');

        // Firestoreにトークンを保存（ユーザーIDと紐付け）
        await this.saveTokenToFirestore(token);

        return token;
      } else {
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'denied');
        return null;
      }
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * トークンをFirestoreに保存
   */
  private static async saveTokenToFirestore(token: string): Promise<void> {
    try {
      const userId = await AsyncStorage.getItem('@hachiKai:userId');
      if (userId) {
        await firestore()
          .collection('users')
          .doc(userId)
          .update({
            fcmToken: token,
            fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
            platform: Platform.OS,
          });
      }
    } catch (error) {
      console.error('Failed to save FCM token to Firestore:', error);
    }
  }

  /**
   * リモート通知受信設定
   */
  static async setupNotificationListeners(): Promise<void> {
    try {
      // フォアグラウンド通知リスナー
      const unsubscribeForeground = messaging().onMessage(
        async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          console.log('Foreground notification received:', remoteMessage);
          await this.handleNotification(remoteMessage);
        }
      );

      // バックグラウンド通知ハンドラー
      messaging().setBackgroundMessageHandler(
        async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          console.log('Background notification received:', remoteMessage);
          await this.handleNotification(remoteMessage);
        }
      );

      // 通知タップハンドラー
      messaging().onNotificationOpenedApp(
        (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          console.log('Notification opened app:', remoteMessage);
          this.handleNotificationOpen(remoteMessage);
        }
      );

      // アプリが通知から起動された場合
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('App opened from notification:', initialNotification);
        this.handleNotificationOpen(initialNotification);
      }

      // トークンリフレッシュリスナー
      const unsubscribeTokenRefresh = messaging().onTokenRefresh(
        async (token: string) => {
          console.log('FCM token refreshed:', token);
          await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
          await this.saveTokenToFirestore(token);
        }
      );
    } catch (error) {
      console.error('Failed to setup notification listeners:', error);
    }
  }

  /**
   * 通知を処理
   */
  private static async handleNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    const { notification, data } = remoteMessage;

    if (notification) {
      // ローカル通知として表示（フォアグラウンドの場合）
      if (Platform.OS === 'ios') {
        // iOSの場合はアラートで表示
        Alert.alert(
          notification.title || '通知',
          notification.body || '',
          [{ text: 'OK' }]
        );
      } else {
        // Androidの場合は自動的にシステム通知が表示される
      }
    }

    // データに基づいて処理を実行
    if (data) {
      await this.processNotificationData(data);
    }
  }

  /**
   * 通知タップ時の処理
   */
  private static handleNotificationOpen(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): void {
    const { data } = remoteMessage;

    if (data?.type) {
      switch (data.type) {
        case 'floor_change':
          // 階層変更画面へ遷移
          console.log('Navigate to floor status');
          break;
        case 'purchase_confirmation':
          // 購入確認画面へ遷移
          console.log('Navigate to purchase confirmation');
          break;
        case 'roulette_reminder':
          // ルーレット画面へ遷移
          console.log('Navigate to roulette');
          break;
        case 'special_event':
          // イベント画面へ遷移
          console.log('Navigate to event');
          break;
      }
    }
  }

  /**
   * 通知データを処理
   */
  private static async processNotificationData(
    data: { [key: string]: string }
  ): Promise<void> {
    try {
      switch (data.type) {
        case 'floor_change':
          // 階層変更をローカルに反映
          if (data.newFloor) {
            await AsyncStorage.setItem(
              '@hachiKai:currentFloor',
              data.newFloor
            );
          }
          break;
        case 'purchase_received':
          // 購入受信カウントを更新
          const receivedCount = await AsyncStorage.getItem(
            '@hachiKai:purchasesReceived'
          );
          const newCount = (parseInt(receivedCount || '0') + 1).toString();
          await AsyncStorage.setItem('@hachiKai:purchasesReceived', newCount);
          break;
      }
    } catch (error) {
      console.error('Failed to process notification data:', error);
    }
  }

  /**
   * 階層変更の全ユーザー通知
   */
  static async sendFloorChangeNotification(
    userId: string,
    newFloor: number
  ): Promise<void> {
    try {
      // サーバーサイドで実行されるべき処理
      // クライアントからはAPIを呼び出す
      const response = await fetch('/api/notifications/floor-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newFloor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send floor change notification');
      }
    } catch (error) {
      console.error('Failed to send floor change notification:', error);
    }
  }

  /**
   * 購入確認通知
   */
  static async sendPurchaseConfirmation(
    buyerId: string,
    sellerId: string,
    productInfo: ProductInfo
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/purchase-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerId,
          sellerId,
          productInfo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send purchase confirmation');
      }
    } catch (error) {
      console.error('Failed to send purchase confirmation:', error);
    }
  }

  /**
   * ルーレットリマインダー（23:50全ユーザー）
   */
  static async sendRouletteReminder(): Promise<void> {
    try {
      // この処理はサーバーサイドのcronジョブで実行される
      const response = await fetch('/api/notifications/roulette-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to send roulette reminder');
      }
    } catch (error) {
      console.error('Failed to send roulette reminder:', error);
    }
  }

  /**
   * 義務未達成警告
   */
  static async sendDutyReminder(
    userId: string,
    dutyType: 'purchase' | 'adView'
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/duty-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          dutyType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send duty reminder');
      }
    } catch (error) {
      console.error('Failed to send duty reminder:', error);
    }
  }

  /**
   * 特殊イベント通知（大革命の日・下克上の日）
   */
  static async sendSpecialEventNotification(
    eventType: 'revolution' | 'uprising'
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/special-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send special event notification');
      }
    } catch (error) {
      console.error('Failed to send special event notification:', error);
    }
  }

  /**
   * 通知権限の状態を取得
   */
  static async getNotificationPermissionStatus(): Promise<string> {
    try {
      const status = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
      return status || 'unknown';
    } catch (error) {
      console.error('Failed to get notification permission status:', error);
      return 'unknown';
    }
  }

  /**
   * トピック購読（階層別通知など）
   */
  static async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to subscribe to topic ${topic}:`, error);
    }
  }

  /**
   * トピック購読解除
   */
  static async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    }
  }

  /**
   * バッジ数をクリア（iOS）
   */
  static async clearBadgeNumber(): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        await messaging().setBadge(0);
      } catch (error) {
        console.error('Failed to clear badge number:', error);
      }
    }
  }
}