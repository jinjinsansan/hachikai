import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, WishlistItem } from '../types';

const USER_KEY = '@hachiKai:user';
const WISHLIST_KEY = '@hachiKai:wishlist';
const FIRST_LAUNCH_KEY = '@hachiKai:firstLaunch';
const LAST_RESET_DATE_KEY = '@hachiKai:lastResetDate';

export class UserManager {
  /**
   * ユーザー初期データ作成
   */
  static async createInitialUser(name: string, wishlistUrl?: string): Promise<User> {
    const initialFloor = this.generateInitialFloor();
    const user: User = {
      id: `user_${Date.now()}`,
      name,
      floor: initialFloor,
      wishlistUrl: wishlistUrl || '',
      dailyPurchaseCount: 0,
      dailyAdViewCount: 0,
      debt: initialFloor === 2 ? 0 : undefined,
    };

    await this.saveUser(user);
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
    await this.updateLastResetDate();

    return user;
  }

  /**
   * 初期階層をランダムに決定（確率配分あり）
   */
  static generateInitialFloor(): number {
    const random = Math.random();
    const probabilities = [
      { floor: 1, probability: 0.30 }, // 30%
      { floor: 2, probability: 0.20 }, // 20%
      { floor: 3, probability: 0.15 }, // 15%
      { floor: 4, probability: 0.12 }, // 12%
      { floor: 5, probability: 0.10 }, // 10%
      { floor: 6, probability: 0.07 }, // 7%
      { floor: 7, probability: 0.04 }, // 4%
      { floor: 8, probability: 0.02 }, // 2%
    ];

    let cumulativeProbability = 0;
    for (const { floor, probability } of probabilities) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return floor;
      }
    }
    return 1; // フォールバック
  }

  /**
   * ユーザーデータ保存
   */
  static async saveUser(user: User): Promise<void> {
    try {
      const jsonValue = JSON.stringify(user);
      await AsyncStorage.setItem(USER_KEY, jsonValue);
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw error;
    }
  }

  /**
   * ユーザーデータ読み込み
   */
  static async loadUser(): Promise<User | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(USER_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Failed to load user data:', error);
      return null;
    }
  }

  /**
   * 階層変更
   */
  static async changeFloor(newFloor: number, lockDays: number = 0): Promise<User> {
    const user = await this.loadUser();
    if (!user) {
      throw new Error('User data not found');
    }

    user.floor = newFloor;

    // 2階の場合は借金システムを有効化
    if (newFloor === 2) {
      user.debt = user.debt || 0;
    } else {
      user.debt = undefined;
    }

    // TODO: ロック機能の実装（lockDays分階層変更を禁止）

    await this.saveUser(user);
    return user;
  }

  /**
   * 日次進捗更新
   */
  static async updateDailyProgress(
    purchaseCount?: number,
    adViewCount?: number
  ): Promise<User> {
    const user = await this.loadUser();
    if (!user) {
      throw new Error('User data not found');
    }

    if (purchaseCount !== undefined) {
      user.dailyPurchaseCount = purchaseCount;
    }

    if (adViewCount !== undefined) {
      user.dailyAdViewCount = adViewCount;
    }

    await this.saveUser(user);
    return user;
  }

  /**
   * 進捗を1増やす（購入または広告視聴完了時）
   */
  static async incrementProgress(type: 'purchase' | 'adView'): Promise<User> {
    const user = await this.loadUser();
    if (!user) {
      throw new Error('User data not found');
    }

    if (type === 'purchase') {
      user.dailyPurchaseCount += 1;
    } else if (type === 'adView') {
      user.dailyAdViewCount += 1;
    }

    await this.saveUser(user);
    return user;
  }

  /**
   * 日次リセット（日付が変わったら実行）
   */
  static async resetDailyProgress(): Promise<User> {
    const user = await this.loadUser();
    if (!user) {
      throw new Error('User data not found');
    }

    user.dailyPurchaseCount = 0;
    user.dailyAdViewCount = 0;

    // 2階の借金システム：購入がなかった場合借金が蓄積
    if (user.floor === 2 && user.debt !== undefined) {
      // TODO: 借金蓄積ロジックの実装
    }

    await this.saveUser(user);
    await this.updateLastResetDate();
    return user;
  }

  /**
   * 初回起動かどうかをチェック
   */
  static async isFirstLaunch(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      return value === null || value === 'true';
    } catch (error) {
      console.error('Failed to check first launch:', error);
      return true;
    }
  }

  /**
   * 最終リセット日を更新
   */
  static async updateLastResetDate(): Promise<void> {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, today);
  }

  /**
   * 日付が変わったかチェック
   */
  static async shouldResetDaily(): Promise<boolean> {
    try {
      const lastResetDate = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);
      const today = new Date().toDateString();
      return lastResetDate !== today;
    } catch (error) {
      console.error('Failed to check reset date:', error);
      return false;
    }
  }

  /**
   * 欲しいものリストを保存
   */
  static async saveWishlist(items: WishlistItem[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(items);
      await AsyncStorage.setItem(WISHLIST_KEY, jsonValue);
    } catch (error) {
      console.error('Failed to save wishlist:', error);
      throw error;
    }
  }

  /**
   * 欲しいものリストを読み込み
   */
  static async loadWishlist(): Promise<WishlistItem[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(WISHLIST_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      return [];
    }
  }

  /**
   * 欲しいものリストに追加
   */
  static async addToWishlist(item: WishlistItem): Promise<WishlistItem[]> {
    const wishlist = await this.loadWishlist();
    wishlist.push(item);
    await this.saveWishlist(wishlist);
    return wishlist;
  }

  /**
   * 欲しいものリストから削除
   */
  static async removeFromWishlist(itemId: string): Promise<WishlistItem[]> {
    const wishlist = await this.loadWishlist();
    const filtered = wishlist.filter(item => item.id !== itemId);
    await this.saveWishlist(filtered);
    return filtered;
  }

  /**
   * データを完全にリセット（デバッグ用）
   */
  static async resetAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        USER_KEY,
        WISHLIST_KEY,
        FIRST_LAUNCH_KEY,
        LAST_RESET_DATE_KEY,
      ]);
    } catch (error) {
      console.error('Failed to reset all data:', error);
      throw error;
    }
  }
}