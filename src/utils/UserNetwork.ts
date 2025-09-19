import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, FLOOR_RULES } from '../types';
import { PublicUser, ProductInfo, WishlistItem } from '../types/amazon';
import { UserManager } from './UserManager';

const OTHER_USERS_KEY = '@hachiKai:otherUsers';
const PURCHASE_HISTORY_KEY = '@hachiKai:purchaseHistory';

/**
 * ユーザー間相互扶助システム
 * 階層別の購入義務と権利を管理
 */
export class UserNetwork {
  /**
   * 他ユーザーの公開情報を取得（モックデータ）
   */
  static async getOtherUsers(): Promise<PublicUser[]> {
    try {
      // 実際の実装ではサーバーから取得
      // ここではモックデータを返す
      const mockUsers: PublicUser[] = [
        {
          id: 'user_001',
          name: '田中太郎',
          floor: 3,
          wishlistUrl: 'https://www.amazon.co.jp/hz/wishlist/ls/ABC123',
          wishlistItems: [
            {
              id: 'item_001',
              title: 'Bluetoothスピーカー',
              price: 8000,
              url: 'https://www.amazon.co.jp/dp/B08N5WRWNW',
              priority: 'high',
            },
          ],
        },
        {
          id: 'user_002',
          name: '佐藤花子',
          floor: 5,
          wishlistUrl: 'https://www.amazon.co.jp/hz/wishlist/ls/DEF456',
          wishlistItems: [
            {
              id: 'item_002',
              title: 'ヨガマット',
              price: 3000,
              url: 'https://www.amazon.co.jp/dp/B07HNKGXZM',
              priority: 'medium',
            },
          ],
        },
        {
          id: 'user_003',
          name: '鈴木一郎',
          floor: 7,
          wishlistUrl: 'https://www.amazon.co.jp/hz/wishlist/ls/GHI789',
          wishlistItems: [
            {
              id: 'item_003',
              title: 'スマートウォッチ',
              price: 25000,
              url: 'https://www.amazon.co.jp/dp/B0B5TWHPFH',
              priority: 'low',
            },
          ],
        },
        {
          id: 'user_004',
          name: '山田美咲',
          floor: 2,
          wishlistUrl: 'https://www.amazon.co.jp/hz/wishlist/ls/JKL012',
          wishlistItems: [
            {
              id: 'item_004',
              title: '電動歯ブラシ',
              price: 12000,
              url: 'https://www.amazon.co.jp/dp/B09DX5T8VN',
              priority: 'high',
            },
          ],
        },
        {
          id: 'user_005',
          name: '渡辺健二',
          floor: 8,
          wishlistUrl: 'https://www.amazon.co.jp/hz/wishlist/ls/MNO345',
          wishlistItems: [
            {
              id: 'item_005',
              title: 'ノイズキャンセリングヘッドホン',
              price: 35000,
              url: 'https://www.amazon.co.jp/dp/B09DDD8J5Q',
              priority: 'medium',
            },
          ],
        },
      ];

      // AsyncStorageにキャッシュ
      await AsyncStorage.setItem(OTHER_USERS_KEY, JSON.stringify(mockUsers));

      return mockUsers;
    } catch (error) {
      console.error('Failed to get other users:', error);
      return [];
    }
  }

  /**
   * 特定階層のユーザーを取得
   */
  static async getUsersByFloor(floor: number): Promise<PublicUser[]> {
    const allUsers = await this.getOtherUsers();
    return allUsers.filter(user => user.floor === floor);
  }

  /**
   * 購入対象選定アルゴリズム
   * 階層ルールに基づいて適切な購入対象を選ぶ
   */
  static async selectPurchaseTarget(currentUser: User): Promise<PublicUser | null> {
    try {
      const allUsers = await this.getOtherUsers();
      const currentFloorRules = FLOOR_RULES[currentUser.floor - 1];

      // 購入対象の階層範囲を決定
      let targetFloors: number[] = [];

      switch (currentUser.floor) {
        case 1:
          // 1階: 2-8階から選択
          targetFloors = [2, 3, 4, 5, 6, 7, 8];
          break;
        case 2:
          // 2階: 3-8階から選択（借金返済のため）
          targetFloors = [3, 4, 5, 6, 7, 8];
          break;
        case 3:
        case 4:
          // 3-4階: 4-8階から選択
          targetFloors = [4, 5, 6, 7, 8];
          break;
        case 5:
        case 6:
          // 5-6階: 6-8階から選択
          targetFloors = [6, 7, 8];
          break;
        case 7:
          // 7階: 8階から選択
          targetFloors = [8];
          break;
        case 8:
          // 8階: 全階層から選択可能（慈善的購入）
          targetFloors = [1, 2, 3, 4, 5, 6, 7];
          break;
      }

      // 対象階層のユーザーをフィルタリング
      const targetUsers = allUsers.filter(user =>
        targetFloors.includes(user.floor) &&
        user.wishlistItems &&
        user.wishlistItems.length > 0
      );

      if (targetUsers.length === 0) {
        return null;
      }

      // 購入優先度の計算
      const scoredUsers = targetUsers.map(user => {
        let score = 0;

        // 階層差によるスコア（階層差が大きいほど高スコア）
        const floorDifference = Math.abs(user.floor - currentUser.floor);
        score += floorDifference * 10;

        // 高優先度アイテムを持つユーザーを優先
        const hasHighPriorityItem = user.wishlistItems?.some(
          item => item.priority === 'high'
        );
        if (hasHighPriorityItem) {
          score += 20;
        }

        // 価格帯によるスコア（適正価格帯を優先）
        const avgPrice = user.wishlistItems?.reduce(
          (sum, item) => sum + item.price, 0
        ) / (user.wishlistItems?.length || 1);

        if (avgPrice >= 5000 && avgPrice <= 20000) {
          score += 15; // 適正価格帯
        }

        return { user, score };
      });

      // スコアでソートして最適なユーザーを選択
      scoredUsers.sort((a, b) => b.score - a.score);

      // ランダム要素を加えて公平性を保つ
      const topCandidates = scoredUsers.slice(0, 3);
      const randomIndex = Math.floor(Math.random() * topCandidates.length);

      return topCandidates[randomIndex]?.user || null;
    } catch (error) {
      console.error('Failed to select purchase target:', error);
      return null;
    }
  }

  /**
   * 購入対象商品を選定
   */
  static async selectProductToPurchase(
    targetUser: PublicUser
  ): Promise<WishlistItem | null> {
    if (!targetUser.wishlistItems || targetUser.wishlistItems.length === 0) {
      return null;
    }

    // 優先度順にソート
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedItems = [...targetUser.wishlistItems].sort((a, b) => {
      const priorityA = priorityOrder[a.priority || 'low'];
      const priorityB = priorityOrder[b.priority || 'low'];
      return priorityA - priorityB;
    });

    // 最高優先度のアイテムから選択
    return sortedItems[0];
  }

  /**
   * 購入通知を送信（将来的にプッシュ通知）
   */
  static async notifyPurchase(
    targetUserId: string,
    productInfo: ProductInfo
  ): Promise<void> {
    try {
      // 購入履歴を保存
      const historyKey = `${PURCHASE_HISTORY_KEY}:${targetUserId}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      history.push({
        productInfo,
        purchaseDate: new Date().toISOString(),
        notified: false,
      });

      await AsyncStorage.setItem(historyKey, JSON.stringify(history));

      // 実際の実装ではプッシュ通知を送信
      console.log(`Purchase notification sent to user ${targetUserId}`);
    } catch (error) {
      console.error('Failed to notify purchase:', error);
    }
  }

  /**
   * 相互扶助スコアを計算
   */
  static async calculateMutualAidScore(userId: string): Promise<number> {
    try {
      const historyKey = `${PURCHASE_HISTORY_KEY}:${userId}`;
      const history = await AsyncStorage.getItem(historyKey);

      if (!history) {
        return 0;
      }

      const purchases = JSON.parse(history);
      const score = purchases.length * 10; // 購入1件につき10ポイント

      return score;
    } catch (error) {
      console.error('Failed to calculate mutual aid score:', error);
      return 0;
    }
  }

  /**
   * 推奨購入リストを生成
   */
  static async getRecommendedPurchases(
    currentUser: User
  ): Promise<{ user: PublicUser; item: WishlistItem }[]> {
    try {
      const recommendations = [];
      const floorRules = FLOOR_RULES[currentUser.floor - 1];
      const purchaseRequired = floorRules.purchaseRequired;

      for (let i = 0; i < purchaseRequired; i++) {
        const targetUser = await this.selectPurchaseTarget(currentUser);
        if (targetUser) {
          const item = await this.selectProductToPurchase(targetUser);
          if (item) {
            recommendations.push({ user: targetUser, item });
          }
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to get recommended purchases:', error);
      return [];
    }
  }

  /**
   * ユーザーの公開プロフィールを作成
   */
  static async createPublicProfile(user: User): Promise<PublicUser> {
    const wishlist = await UserManager.loadWishlist();

    return {
      id: user.id,
      name: user.name,
      floor: user.floor,
      wishlistUrl: user.wishlistUrl,
      wishlistItems: wishlist,
    };
  }

  /**
   * 階層間の購入フロー検証
   */
  static validatePurchaseFlow(
    buyerFloor: number,
    sellerFloor: number
  ): boolean {
    // 階層ルールに基づいて購入可能かチェック
    if (buyerFloor === 8) {
      // 8階は全階層から購入可能
      return true;
    }

    if (buyerFloor < sellerFloor) {
      // 基本的に上位階層のユーザーから購入
      return true;
    }

    if (buyerFloor === sellerFloor && buyerFloor >= 5) {
      // 5階以上は同階層間でも購入可能
      return true;
    }

    return false;
  }
}