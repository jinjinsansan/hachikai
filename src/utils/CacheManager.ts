import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductInfo } from '../types/amazon';

const CACHE_PREFIX = '@hachiKai:cache:';
const CACHE_EXPIRY_KEY = '@hachiKai:cacheExpiry:';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size in bytes
  cleanupInterval: number; // Cleanup interval in milliseconds
}

/**
 * キャッシュ管理システム
 * パフォーマンス最適化のためのデータキャッシング
 */
export class CacheManager {
  private static config: CacheConfig = {
    defaultTTL: 3600000, // 1時間
    maxSize: 10 * 1024 * 1024, // 10MB
    cleanupInterval: 300000, // 5分
  };

  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * 初期化
   */
  static async initialize(): Promise<void> {
    // 定期的なクリーンアップを開始
    this.startPeriodicCleanup();

    // 初回クリーンアップ
    await this.cleanup();
  }

  /**
   * Amazon商品情報をキャッシュ
   */
  static async cacheProductInfo(
    asin: string,
    productInfo: ProductInfo,
    ttl?: number
  ): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}product:${asin}`;
      const expiryKey = `${CACHE_EXPIRY_KEY}product:${asin}`;

      const entry: CacheEntry<ProductInfo> = {
        data: productInfo,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl || this.config.defaultTTL),
      };

      await AsyncStorage.setItem(key, JSON.stringify(entry));
      await AsyncStorage.setItem(expiryKey, entry.expiresAt.toString());

      console.log(`Cached product info for ASIN: ${asin}`);
    } catch (error) {
      console.error('Failed to cache product info:', error);
    }
  }

  /**
   * 商品情報をキャッシュから取得
   */
  static async getProductInfo(asin: string): Promise<ProductInfo | null> {
    try {
      const key = `${CACHE_PREFIX}product:${asin}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<ProductInfo> = JSON.parse(cached);

      // 有効期限チェック
      if (Date.now() > entry.expiresAt) {
        await this.invalidateCache(`product:${asin}`);
        return null;
      }

      console.log(`Cache hit for ASIN: ${asin}`);
      return entry.data;
    } catch (error) {
      console.error('Failed to get cached product info:', error);
      return null;
    }
  }

  /**
   * ユーザーデータをキャッシュ
   */
  static async cacheUserData(userId: string, data: Record<string, unknown>, ttl?: number): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}user:${userId}`;
      const expiryKey = `${CACHE_EXPIRY_KEY}user:${userId}`;

      const entry: CacheEntry<Record<string, unknown>> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl || this.config.defaultTTL),
      };

      await AsyncStorage.setItem(key, JSON.stringify(entry));
      await AsyncStorage.setItem(expiryKey, entry.expiresAt.toString());

      console.log(`Cached user data for ID: ${userId}`);
    } catch (error) {
      console.error('Failed to cache user data:', error);
    }
  }

  /**
   * ユーザーデータをキャッシュから取得
   */
  static async getUserData(userId: string): Promise<Record<string, unknown> | null> {
    try {
      const key = `${CACHE_PREFIX}user:${userId}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<Record<string, unknown>> = JSON.parse(cached);

      // 有効期限チェック
      if (Date.now() > entry.expiresAt) {
        await this.invalidateCache(`user:${userId}`);
        return null;
      }

      console.log(`Cache hit for user: ${userId}`);
      return entry.data;
    } catch (error) {
      console.error('Failed to get cached user data:', error);
      return null;
    }
  }

  /**
   * 汎用キャッシュセット
   */
  static async set<T>(
    namespace: string,
    key: string,
    data: T,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${namespace}:${key}`;
      const expiryKey = `${CACHE_EXPIRY_KEY}${namespace}:${key}`;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl || this.config.defaultTTL),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
      await AsyncStorage.setItem(expiryKey, entry.expiresAt.toString());
    } catch (error) {
      console.error(`Failed to cache ${namespace}:${key}:`, error);
    }
  }

  /**
   * 汎用キャッシュ取得
   */
  static async get<T>(namespace: string, key: string): Promise<T | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}${namespace}:${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // 有効期限チェック
      if (Date.now() > entry.expiresAt) {
        await this.invalidateCache(`${namespace}:${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Failed to get cached ${namespace}:${key}:`, error);
      return null;
    }
  }

  /**
   * キャッシュ無効化
   */
  static async invalidateCache(key: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const expiryKey = `${CACHE_EXPIRY_KEY}${key}`;

      await AsyncStorage.multiRemove([cacheKey, expiryKey]);
      console.log(`Invalidated cache: ${key}`);
    } catch (error) {
      console.error(`Failed to invalidate cache ${key}:`, error);
    }
  }

  /**
   * 名前空間のキャッシュをすべて削除
   */
  static async invalidateNamespace(namespace: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const namespaceKeys = allKeys.filter(key =>
        key.startsWith(`${CACHE_PREFIX}${namespace}:`) ||
        key.startsWith(`${CACHE_EXPIRY_KEY}${namespace}:`)
      );

      if (namespaceKeys.length > 0) {
        await AsyncStorage.multiRemove(namespaceKeys);
        console.log(`Invalidated ${namespaceKeys.length} cache entries in namespace: ${namespace}`);
      }
    } catch (error) {
      console.error(`Failed to invalidate namespace ${namespace}:`, error);
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  static async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key =>
        key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_KEY)
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * 期限切れキャッシュのクリーンアップ
   */
  static async cleanup(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const expiryKeys = allKeys.filter(key => key.startsWith(CACHE_EXPIRY_KEY));

      const expiredKeys: string[] = [];
      const now = Date.now();

      for (const expiryKey of expiryKeys) {
        const expiresAt = await AsyncStorage.getItem(expiryKey);
        if (expiresAt && parseInt(expiresAt) < now) {
          const cacheKey = expiryKey.replace(CACHE_EXPIRY_KEY, CACHE_PREFIX);
          expiredKeys.push(cacheKey, expiryKey);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        console.log(`Cleaned up ${expiredKeys.length / 2} expired cache entries`);
      }
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  /**
   * 定期的なクリーンアップを開始
   */
  private static startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 定期的なクリーンアップを停止
   */
  static stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * キャッシュ統計を取得
   */
  static async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    namespaces: Record<string, number>;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));

      let totalSize = 0;
      const namespaces: Record<string, number> = {};

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;

          // 名前空間を抽出
          const namespace = key.replace(CACHE_PREFIX, '').split(':')[0];
          namespaces[namespace] = (namespaces[namespace] || 0) + 1;
        }
      }

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        namespaces,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        namespaces: {},
      };
    }
  }

  /**
   * キャッシュサイズが上限を超えているかチェック
   */
  static async checkCacheSize(): Promise<boolean> {
    const stats = await this.getStats();
    return stats.totalSize > this.config.maxSize;
  }

  /**
   * LRU (Least Recently Used) によるキャッシュ削除
   */
  static async evictLRU(count: number = 10): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));

      const entries: Array<{ key: string; timestamp: number }> = [];

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const entry = JSON.parse(value);
          entries.push({ key, timestamp: entry.timestamp });
        }
      }

      // タイムスタンプでソート（古い順）
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // 古いエントリから削除
      const keysToRemove: string[] = [];
      for (let i = 0; i < Math.min(count, entries.length); i++) {
        const cacheKey = entries[i].key;
        const expiryKey = cacheKey.replace(CACHE_PREFIX, CACHE_EXPIRY_KEY);
        keysToRemove.push(cacheKey, expiryKey);
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`Evicted ${keysToRemove.length / 2} cache entries (LRU)`);
      }
    } catch (error) {
      console.error('Failed to evict LRU cache:', error);
    }
  }
}