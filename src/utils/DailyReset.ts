import { UserManager } from './UserManager';
import { FLOOR_RULES } from '../types';

export class DailyReset {
  /**
   * アプリ起動時にチェックして必要ならリセット実行
   */
  static async checkAndReset(): Promise<boolean> {
    const shouldReset = await UserManager.shouldResetDaily();

    if (shouldReset) {
      await this.performDailyReset();
      return true;
    }

    return false;
  }

  /**
   * 日次リセット処理
   */
  static async performDailyReset(): Promise<void> {
    const user = await UserManager.loadUser();
    if (!user) {
      return;
    }

    // 前日の義務達成状況をチェック
    const floorRules = FLOOR_RULES[user.floor - 1];
    const purchaseCompleted = user.dailyPurchaseCount >= floorRules.purchaseRequired;
    const adViewCompleted = user.dailyAdViewCount >= floorRules.adViewRequired;

    // 階層変更判定
    if (!purchaseCompleted || !adViewCompleted) {
      // 義務未達成の場合の処理
      await this.handleIncompleteObligations(user.floor, purchaseCompleted, adViewCompleted);
    } else {
      // 義務達成の場合、上昇チャンスを計算
      await this.calculateFloorChange(user.floor, true);
    }

    // 進捗リセット
    await UserManager.resetDailyProgress();
  }

  /**
   * 義務未達成時の処理
   */
  private static async handleIncompleteObligations(
    currentFloor: number,
    purchaseCompleted: boolean,
    adViewCompleted: boolean
  ): Promise<void> {
    // 2階の借金システム
    if (currentFloor === 2 && !purchaseCompleted) {
      const user = await UserManager.loadUser();
      if (user && user.debt !== undefined) {
        // 借金額を増やす（仮に1日5000円）
        user.debt += 5000;
        await UserManager.saveUser(user);
      }
    }

    // 階層降格判定
    const shouldDemote = !purchaseCompleted && !adViewCompleted;
    if (shouldDemote && currentFloor > 1) {
      // 両方未達成なら降格確率が高い
      const demoteChance = 0.7; // 70%の確率で降格
      if (Math.random() < demoteChance) {
        await UserManager.changeFloor(currentFloor - 1, 3); // 3日間ロック
      }
    } else if ((!purchaseCompleted || !adViewCompleted) && currentFloor > 1) {
      // 片方未達成なら降格確率が低い
      const demoteChance = 0.3; // 30%の確率で降格
      if (Math.random() < demoteChance) {
        await UserManager.changeFloor(currentFloor - 1, 1); // 1日間ロック
      }
    }
  }

  /**
   * 階層変更の計算（ルーレット確率計算）
   */
  static async calculateFloorChange(
    currentFloor: number,
    obligationsMet: boolean
  ): Promise<number> {
    const user = await UserManager.loadUser();
    if (!user) {
      return currentFloor;
    }

    // 基本確率の設定
    let upChance = 0;
    let downChance = 0;
    let stayChance = 0;

    if (obligationsMet) {
      // 義務達成時
      switch (currentFloor) {
        case 1:
          upChance = 0.3;  // 30%上昇
          stayChance = 0.7; // 70%維持
          downChance = 0;   // 0%下降
          break;
        case 2:
        case 3:
        case 4:
          upChance = 0.25;  // 25%上昇
          stayChance = 0.65; // 65%維持
          downChance = 0.1;  // 10%下降
          break;
        case 5:
        case 6:
        case 7:
          upChance = 0.2;   // 20%上昇
          stayChance = 0.65; // 65%維持
          downChance = 0.15; // 15%下降
          break;
        case 8:
          upChance = 0;     // 0%上昇（最上階）
          stayChance = 0.85; // 85%維持
          downChance = 0.15; // 15%下降
          break;
      }

      // ボーナス修正（連続達成日数などで確率調整）
      // TODO: 連続達成日数の追跡と確率修正
    }

    // ルーレット実行
    const random = Math.random();
    let newFloor = currentFloor;

    if (random < upChance && currentFloor < 8) {
      newFloor = currentFloor + 1;
    } else if (random >= (upChance + stayChance) && currentFloor > 1) {
      newFloor = currentFloor - 1;
    }

    if (newFloor !== currentFloor) {
      await UserManager.changeFloor(newFloor, 0);
    }

    return newFloor;
  }

  /**
   * 次回リセットまでの時間を取得
   */
  static getTimeUntilReset(): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  /**
   * デバッグ用：強制リセット
   */
  static async forceReset(): Promise<void> {
    await this.performDailyReset();
  }
}