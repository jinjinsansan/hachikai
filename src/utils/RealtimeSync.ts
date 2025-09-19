import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { PurchaseRecord } from '../types/amazon';

export interface OnlineUser {
  userId: string;
  name: string;
  floor: number;
  lastActive: Date;
  isOnline: boolean;
}

export interface FloorChangeEvent {
  userId: string;
  userName: string;
  oldFloor: number;
  newFloor: number;
  timestamp: Date;
  reason: 'roulette' | 'promotion' | 'demotion' | 'admin';
}

/**
 * リアルタイム同期管理システム
 * Firestoreを使用したリアルタイムデータ同期
 */
export class RealtimeSync {
  private static listeners: Map<string, () => void> = new Map();
  private static onlineStatusInterval: NodeJS.Timeout | null = null;

  /**
   * リアルタイム同期を開始
   */
  static async startSync(userId: string): Promise<void> {
    try {
      // オンライン状態を更新
      await this.updateOnlineStatus(userId, true);

      // ユーザーデータの同期を開始
      this.syncUserData(userId);

      // 階層変更の監視を開始
      this.watchFloorChanges();

      // 購入通知の監視を開始
      this.watchPurchaseNotifications(userId);

      // オンラインユーザーの監視を開始
      this.watchOnlineUsers();

      // 定期的にオンライン状態を更新
      this.startOnlineStatusHeartbeat(userId);
    } catch (error) {
      console.error('Failed to start realtime sync:', error);
    }
  }

  /**
   * リアルタイム同期を停止
   */
  static async stopSync(userId: string): Promise<void> {
    try {
      // オンライン状態を更新
      await this.updateOnlineStatus(userId, false);

      // すべてのリスナーを解除
      this.listeners.forEach(unsubscribe => unsubscribe());
      this.listeners.clear();

      // オンライン状態のハートビートを停止
      if (this.onlineStatusInterval) {
        clearInterval(this.onlineStatusInterval);
        this.onlineStatusInterval = null;
      }
    } catch (error) {
      console.error('Failed to stop realtime sync:', error);
    }
  }

  /**
   * ユーザーデータの同期
   */
  private static syncUserData(userId: string): void {
    const unsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .onSnapshot(
        async (snapshot: FirebaseFirestoreTypes.DocumentSnapshot) => {
          if (snapshot.exists) {
            const userData = snapshot.data() as User;

            // ローカルストレージを更新
            await AsyncStorage.setItem(
              '@hachiKai:userData',
              JSON.stringify(userData)
            );

            // 階層が変更された場合の処理
            const previousData = await AsyncStorage.getItem(
              '@hachiKai:previousUserData'
            );
            if (previousData) {
              const previous = JSON.parse(previousData) as User;
              if (previous.floor !== userData.floor) {
                await this.handleFloorChange(previous.floor, userData.floor);
              }
            }

            await AsyncStorage.setItem(
              '@hachiKai:previousUserData',
              JSON.stringify(userData)
            );
          }
        },
        (error: Error) => {
          console.error('User data sync error:', error);
        }
      );

    this.listeners.set('userData', unsubscribe);
  }

  /**
   * 階層変更の監視
   */
  private static watchFloorChanges(): void {
    const unsubscribe = firestore()
      .collection('floorChanges')
      .where('timestamp', '>=', new Date())
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(
        async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
          const changes: FloorChangeEvent[] = [];

          snapshot.forEach(doc => {
            const data = doc.data();
            changes.push({
              userId: data.userId,
              userName: data.userName,
              oldFloor: data.oldFloor,
              newFloor: data.newFloor,
              timestamp: data.timestamp.toDate(),
              reason: data.reason,
            });
          });

          // ローカルストレージに保存
          await AsyncStorage.setItem(
            '@hachiKai:recentFloorChanges',
            JSON.stringify(changes)
          );
        },
        (error: Error) => {
          console.error('Floor changes sync error:', error);
        }
      );

    this.listeners.set('floorChanges', unsubscribe);
  }

  /**
   * 購入通知の監視
   */
  private static watchPurchaseNotifications(userId: string): void {
    const unsubscribe = firestore()
      .collection('purchases')
      .where('sellerId', '==', userId)
      .where('status', '==', 'pending')
      .onSnapshot(
        async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
          const purchases: PurchaseRecord[] = [];

          snapshot.forEach(doc => {
            const data = doc.data();
            purchases.push({
              id: doc.id,
              buyerId: data.buyerId,
              sellerId: data.sellerId,
              productInfo: data.productInfo,
              purchaseDate: data.purchaseDate.toDate(),
              confirmationStatus: data.status,
            });
          });

          // 新しい購入があった場合は通知
          const previousPurchases = await AsyncStorage.getItem(
            '@hachiKai:pendingPurchases'
          );
          if (previousPurchases) {
            const previous = JSON.parse(previousPurchases) as PurchaseRecord[];
            const newPurchases = purchases.filter(
              p => !previous.find(prev => prev.id === p.id)
            );

            if (newPurchases.length > 0) {
              // ローカル通知を表示
              console.log(`新しい購入が${newPurchases.length}件あります`);
            }
          }

          await AsyncStorage.setItem(
            '@hachiKai:pendingPurchases',
            JSON.stringify(purchases)
          );
        },
        (error: Error) => {
          console.error('Purchase notifications sync error:', error);
        }
      );

    this.listeners.set('purchaseNotifications', unsubscribe);
  }

  /**
   * オンラインユーザーの監視
   */
  private static watchOnlineUsers(): void {
    const unsubscribe = firestore()
      .collection('onlineUsers')
      .where('isOnline', '==', true)
      .onSnapshot(
        async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
          const onlineUsers: OnlineUser[] = [];

          snapshot.forEach(doc => {
            const data = doc.data();
            onlineUsers.push({
              userId: doc.id,
              name: data.name,
              floor: data.floor,
              lastActive: data.lastActive.toDate(),
              isOnline: true,
            });
          });

          // 階層別にグループ化
          const usersByFloor: Record<number, OnlineUser[]> = {};
          for (let i = 1; i <= 8; i++) {
            usersByFloor[i] = onlineUsers.filter(u => u.floor === i);
          }

          await AsyncStorage.setItem(
            '@hachiKai:onlineUsers',
            JSON.stringify(usersByFloor)
          );

          console.log(`オンラインユーザー数: ${onlineUsers.length}`);
        },
        (error: Error) => {
          console.error('Online users sync error:', error);
        }
      );

    this.listeners.set('onlineUsers', unsubscribe);
  }

  /**
   * オンライン状態を更新
   */
  private static async updateOnlineStatus(
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('@hachiKai:userData');
      if (!userData) return;

      const user = JSON.parse(userData) as User;

      await firestore()
        .collection('onlineUsers')
        .doc(userId)
        .set({
          name: user.name,
          floor: user.floor,
          isOnline,
          lastActive: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  }

  /**
   * オンライン状態のハートビート
   */
  private static startOnlineStatusHeartbeat(userId: string): void {
    // 30秒ごとにオンライン状態を更新
    this.onlineStatusInterval = setInterval(() => {
      this.updateOnlineStatus(userId, true);
    }, 30000);
  }

  /**
   * 階層変更の処理
   */
  private static async handleFloorChange(
    oldFloor: number,
    newFloor: number
  ): Promise<void> {
    try {
      // 階層変更イベントをローカルに記録
      const changeEvent = {
        oldFloor,
        newFloor,
        timestamp: new Date().toISOString(),
      };

      const changes = await AsyncStorage.getItem('@hachiKai:floorChangeHistory');
      const history = changes ? JSON.parse(changes) : [];
      history.push(changeEvent);

      // 最新50件のみ保持
      const recentHistory = history.slice(-50);
      await AsyncStorage.setItem(
        '@hachiKai:floorChangeHistory',
        JSON.stringify(recentHistory)
      );

      console.log(`階層が ${oldFloor} から ${newFloor} に変更されました`);
    } catch (error) {
      console.error('Failed to handle floor change:', error);
    }
  }

  /**
   * リアルタイムユーザー数を取得
   */
  static async getOnlineUserCount(): Promise<number> {
    try {
      const snapshot = await firestore()
        .collection('onlineUsers')
        .where('isOnline', '==', true)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('Failed to get online user count:', error);
      return 0;
    }
  }

  /**
   * 階層変更をブロードキャスト
   */
  static async broadcastFloorChange(
    userId: string,
    userName: string,
    oldFloor: number,
    newFloor: number,
    reason: 'roulette' | 'promotion' | 'demotion' | 'admin'
  ): Promise<void> {
    try {
      await firestore().collection('floorChanges').add({
        userId,
        userName,
        oldFloor,
        newFloor,
        reason,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to broadcast floor change:', error);
    }
  }

  /**
   * 購入通知をブロードキャスト
   */
  static async broadcastPurchaseNotification(
    purchase: PurchaseRecord
  ): Promise<void> {
    try {
      await firestore().collection('purchases').add({
        buyerId: purchase.buyerId,
        sellerId: purchase.sellerId,
        productInfo: purchase.productInfo,
        status: 'pending',
        purchaseDate: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to broadcast purchase notification:', error);
    }
  }

  /**
   * ルーレット結果の同期
   */
  static async syncRouletteResults(
    userId: string,
    result: number,
    oldFloor: number,
    newFloor: number
  ): Promise<void> {
    try {
      await firestore().collection('rouletteResults').add({
        userId,
        result,
        oldFloor,
        newFloor,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      // 階層が変更された場合はブロードキャスト
      if (oldFloor !== newFloor) {
        const userData = await AsyncStorage.getItem('@hachiKai:userData');
        if (userData) {
          const user = JSON.parse(userData) as User;
          await this.broadcastFloorChange(
            userId,
            user.name,
            oldFloor,
            newFloor,
            'roulette'
          );
        }
      }
    } catch (error) {
      console.error('Failed to sync roulette results:', error);
    }
  }

  /**
   * データ競合の解決
   */
  static async resolveConflicts(
    localData: Record<string, unknown>,
    remoteData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // タイムスタンプベースの解決（新しい方を採用）
    if (localData.updatedAt && remoteData.updatedAt) {
      const localTime = new Date(localData.updatedAt).getTime();
      const remoteTime = new Date(remoteData.updatedAt).getTime();

      return remoteTime > localTime ? remoteData : localData;
    }

    // リモートデータを優先
    return remoteData;
  }
}