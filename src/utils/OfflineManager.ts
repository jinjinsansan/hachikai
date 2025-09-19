import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';

const OFFLINE_QUEUE_KEY = '@hachiKai:offlineQueue';
const SYNC_STATUS_KEY = '@hachiKai:syncStatus';

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStatus {
  lastSyncTime: Date;
  pendingOperations: number;
  syncInProgress: boolean;
  errors: string[];
}

/**
 * オフライン対応管理システム
 * オフライン時の操作をキューイングし、オンライン復帰時に同期
 */
export class OfflineManager {
  private static isOnline: boolean = true;
  private static syncInterval: NodeJS.Timeout | null = null;
  private static netInfoUnsubscribe: (() => void) | null = null;

  /**
   * オフラインマネージャーを初期化
   */
  static async initialize(): Promise<void> {
    try {
      // ネットワーク状態の監視を開始
      this.netInfoUnsubscribe = NetInfo.addEventListener(
        this.handleConnectivityChange.bind(this)
      );

      // 初期ネットワーク状態を取得
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;

      // Firestore オフライン永続化を有効化
      await firestore().settings({
        persistence: true,
        cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
      });

      // 定期同期を開始
      this.startPeriodicSync();

      console.log('Offline Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Offline Manager:', error);
    }
  }

  /**
   * クリーンアップ
   */
  static async cleanup(): Promise<void> {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * ネットワーク状態変更の処理
   */
  private static async handleConnectivityChange(
    state: NetInfoState
  ): Promise<void> {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected ?? false;

    console.log(`Network status: ${this.isOnline ? 'Online' : 'Offline'}`);

    // オフラインからオンラインに復帰した場合
    if (wasOffline && this.isOnline) {
      console.log('Back online - starting sync...');
      await this.syncWhenOnline();
    }
  }

  /**
   * オフライン操作をキューに追加
   */
  static async queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();

      const newOperation: OfflineOperation = {
        ...operation,
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      queue.push(newOperation);

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      // 同期ステータスを更新
      await this.updateSyncStatus({
        pendingOperations: queue.length,
      });

      console.log(`Operation queued: ${newOperation.type} ${newOperation.collection}`);

      // オンラインの場合は即座に同期を試みる
      if (this.isOnline) {
        await this.syncWhenOnline();
      }
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  }

  /**
   * オフラインキューを取得
   */
  private static async getOfflineQueue(): Promise<OfflineOperation[]> {
    try {
      const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (queueData) {
        return JSON.parse(queueData);
      }
      return [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  /**
   * オンライン復帰時の同期
   */
  static async syncWhenOnline(): Promise<void> {
    if (!this.isOnline) {
      console.log('Cannot sync - still offline');
      return;
    }

    try {
      await this.updateSyncStatus({ syncInProgress: true });

      const queue = await this.getOfflineQueue();
      const errors: string[] = [];
      const successfulOps: string[] = [];

      console.log(`Syncing ${queue.length} offline operations...`);

      for (const operation of queue) {
        try {
          await this.executeOperation(operation);
          successfulOps.push(operation.id);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);

          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            errors.push(`Operation ${operation.id} failed after ${operation.maxRetries} retries: ${(error as Error).message}`);
            successfulOps.push(operation.id); // Remove from queue even if failed
          }
        }
      }

      // 成功した操作をキューから削除
      const remainingQueue = queue.filter(op => !successfulOps.includes(op.id));
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));

      // 同期ステータスを更新
      await this.updateSyncStatus({
        syncInProgress: false,
        lastSyncTime: new Date(),
        pendingOperations: remainingQueue.length,
        errors,
      });

      console.log(`Sync complete. ${successfulOps.length} operations synced, ${remainingQueue.length} remaining`);
    } catch (error) {
      console.error('Sync failed:', error);
      await this.updateSyncStatus({ syncInProgress: false });
    }
  }

  /**
   * 操作を実行
   */
  private static async executeOperation(
    operation: OfflineOperation
  ): Promise<void> {
    const { type, collection, documentId, data } = operation;

    switch (type) {
      case 'create':
        await firestore().collection(collection).add({
          ...data,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        break;

      case 'update':
        if (!documentId) {
          throw new Error('Document ID required for update operation');
        }
        await firestore().collection(collection).doc(documentId).update({
          ...data,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        break;

      case 'delete':
        if (!documentId) {
          throw new Error('Document ID required for delete operation');
        }
        await firestore().collection(collection).doc(documentId).delete();
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * 定期同期を開始
   */
  private static startPeriodicSync(): void {
    // 5分ごとに同期を試みる
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncWhenOnline();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 同期ステータスを更新
   */
  private static async updateSyncStatus(
    updates: Partial<SyncStatus>
  ): Promise<void> {
    try {
      const currentStatus = await this.getSyncStatus();
      const newStatus: SyncStatus = {
        ...currentStatus,
        ...updates,
      };

      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(newStatus));
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  /**
   * 同期ステータスを取得
   */
  static async getSyncStatus(): Promise<SyncStatus> {
    try {
      const statusData = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      if (statusData) {
        return JSON.parse(statusData);
      }

      return {
        lastSyncTime: new Date(0),
        pendingOperations: 0,
        syncInProgress: false,
        errors: [],
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        lastSyncTime: new Date(0),
        pendingOperations: 0,
        syncInProgress: false,
        errors: [],
      };
    }
  }

  /**
   * 競合解決
   */
  static async resolveConflicts(): Promise<void> {
    try {
      // ローカルとリモートのデータを比較
      const localUserData = await AsyncStorage.getItem('@hachiKai:userData');
      if (!localUserData) return;

      const local = JSON.parse(localUserData);
      const userId = local.id;

      const remoteDoc = await firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!remoteDoc.exists) {
        // リモートにデータがない場合はローカルをアップロード
        await firestore()
          .collection('users')
          .doc(userId)
          .set(local);
        return;
      }

      const remote = remoteDoc.data();

      // タイムスタンプベースの解決
      const localTime = new Date(local.updatedAt || 0).getTime();
      const remoteTime = remote?.updatedAt?.toDate?.().getTime() || 0;

      if (localTime > remoteTime) {
        // ローカルが新しい場合はアップロード
        await firestore()
          .collection('users')
          .doc(userId)
          .update(local);
      } else if (remoteTime > localTime) {
        // リモートが新しい場合はダウンロード
        await AsyncStorage.setItem(
          '@hachiKai:userData',
          JSON.stringify(remote)
        );
      }

      console.log('Conflicts resolved');
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    }
  }

  /**
   * キャッシュをクリア
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      await AsyncStorage.removeItem(SYNC_STATUS_KEY);
      console.log('Offline cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * オンライン状態を取得
   */
  static isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 保留中の操作数を取得
   */
  static async getPendingOperationCount(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.length;
  }

  /**
   * 強制同期
   */
  static async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncWhenOnline();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }
}