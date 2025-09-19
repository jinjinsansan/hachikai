import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User, FLOOR_RULES } from '../types';

const NOTIFICATION_SETTINGS_KEY = '@hachiKai:notificationSettings';
const SCHEDULED_NOTIFICATIONS_KEY = '@hachiKai:scheduledNotifications';

export interface NotificationSettings {
  enabled: boolean;
  purchaseReminder: boolean;
  adViewReminder: boolean;
  rouletteReminder: boolean;
  floorChangeAlert: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  type: 'reminder' | 'alert' | 'info';
  data?: Record<string, unknown>;
}

/**
 * 通知管理システム
 * 注意: 実際の実装では以下が必要:
 * - @react-native-community/push-notification-ios (iOS)
 * - react-native-push-notification (Android)
 */
export class NotificationManager {
  /**
   * 通知設定を初期化
   */
  static async initialize(): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings) {
        const defaultSettings: NotificationSettings = {
          enabled: true,
          purchaseReminder: true,
          adViewReminder: true,
          rouletteReminder: true,
          floorChangeAlert: true,
          soundEnabled: true,
          vibrationEnabled: true,
        };
        await this.saveSettings(defaultSettings);
      }

      // 実際の実装では通知権限をリクエスト
      if (Platform.OS === 'ios') {
        // PushNotificationIOS.requestPermissions();
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  /**
   * 通知設定を取得
   */
  static async getSettings(): Promise<NotificationSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return null;
    }
  }

  /**
   * 通知設定を保存
   */
  static async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  /**
   * 購入確認リマインダーをスケジュール
   */
  static async schedulePurchaseConfirmationReminder(
    purchaseId: string,
    productName: string
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings?.enabled || !settings?.purchaseReminder) {
        return;
      }

      // 購入から24時間後にリマインド
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + 24);

      const notification: ScheduledNotification = {
        id: `purchase_${purchaseId}`,
        title: '購入証明のリマインダー',
        body: `${productName}の購入証明をアップロードしてください`,
        scheduledTime: reminderTime,
        type: 'reminder',
        data: { purchaseId },
      };

      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Failed to schedule purchase reminder:', error);
    }
  }

  /**
   * 義務期限通知をスケジュール
   */
  static async scheduleDutyReminder(
    dutyType: 'purchase' | 'adView',
    remainingCount: number
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings?.enabled) {
        return;
      }

      if (dutyType === 'purchase' && !settings.purchaseReminder) return;
      if (dutyType === 'adView' && !settings.adViewReminder) return;

      // 20時にリマインド
      const reminderTime = new Date();
      reminderTime.setHours(20, 0, 0, 0);

      const title = dutyType === 'purchase' ? '購入義務のリマインダー' : '広告視聴のリマインダー';
      const body = dutyType === 'purchase'
        ? `本日あと${remainingCount}つの購入が必要です`
        : `本日あと${remainingCount}回の広告視聴が必要です`;

      const notification: ScheduledNotification = {
        id: `duty_${dutyType}_${new Date().toDateString()}`,
        title,
        body,
        scheduledTime: reminderTime,
        type: 'reminder',
        data: { dutyType, remainingCount },
      };

      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Failed to schedule duty reminder:', error);
    }
  }

  /**
   * 階層変更通知
   */
  static async notifyFloorChange(
    oldFloor: number,
    newFloor: number
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings?.enabled || !settings?.floorChangeAlert) {
        return;
      }

      const isPromotion = newFloor > oldFloor;
      const title = isPromotion ? '🎉 階層上昇！' : '⚠️ 階層降格';
      const body = isPromotion
        ? `${oldFloor}階から${newFloor}階に昇格しました！`
        : `${oldFloor}階から${newFloor}階に降格しました`;

      await this.showLocalNotification(title, body);
    } catch (error) {
      console.error('Failed to notify floor change:', error);
    }
  }

  /**
   * ルーレット通知（23:50）
   */
  static async scheduleRouletteReminder(user: User): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings?.enabled || !settings?.rouletteReminder) {
        return;
      }

      const reminderTime = new Date();
      reminderTime.setHours(23, 50, 0, 0);

      // 今日の義務達成状況を確認
      const floorRules = FLOOR_RULES[user.floor - 1];
      const purchaseComplete = user.dailyPurchaseCount >= floorRules.purchaseRequired;
      const adViewComplete = user.dailyAdViewCount >= floorRules.adViewRequired;

      let body = '間もなく階層判定が行われます。';
      if (!purchaseComplete || !adViewComplete) {
        body += '\n⚠️ 義務が未達成です！';
      }

      const notification: ScheduledNotification = {
        id: `roulette_${new Date().toDateString()}`,
        title: '階層判定まであと10分',
        body,
        scheduledTime: reminderTime,
        type: 'alert',
        data: { purchaseComplete, adViewComplete },
      };

      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Failed to schedule roulette reminder:', error);
    }
  }

  /**
   * ローカル通知を表示
   */
  static async showLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings?.enabled) {
        return;
      }

      // 実際の実装では PushNotification.localNotification() を使用
      console.log(`📢 Notification: ${title} - ${body}`);

      // 振動設定
      if (settings.vibrationEnabled) {
        // Vibration.vibrate();
      }

      // サウンド設定
      if (settings.soundEnabled) {
        // Sound.play();
      }
    } catch (error) {
      console.error('Failed to show local notification:', error);
    }
  }

  /**
   * 通知をスケジュール
   */
  private static async scheduleNotification(
    notification: ScheduledNotification
  ): Promise<void> {
    try {
      // 既存のスケジュール済み通知を取得
      const existingNotifications = await this.getScheduledNotifications();

      // 同じIDの通知があれば削除
      const filtered = existingNotifications.filter(n => n.id !== notification.id);

      // 新しい通知を追加
      filtered.push(notification);

      // 保存
      await AsyncStorage.setItem(
        SCHEDULED_NOTIFICATIONS_KEY,
        JSON.stringify(filtered)
      );

      // 実際の実装では PushNotification.localNotificationSchedule() を使用
      console.log(`📅 Scheduled: ${notification.title} at ${notification.scheduledTime}`);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  /**
   * スケジュール済み通知を取得
   */
  static async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const notifications = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (!notifications) {
        return [];
      }

      const parsed = JSON.parse(notifications);
      // 期限切れの通知をフィルタリング
      const now = new Date();
      return parsed.filter((n: ScheduledNotification) =>
        new Date(n.scheduledTime) > now
      );
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * 通知をキャンセル
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getScheduledNotifications();
      const filtered = notifications.filter(n => n.id !== notificationId);

      await AsyncStorage.setItem(
        SCHEDULED_NOTIFICATIONS_KEY,
        JSON.stringify(filtered)
      );

      // 実際の実装では PushNotification.cancelLocalNotifications() を使用
      console.log(`❌ Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * すべての通知をクリア
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
      // 実際の実装では PushNotification.cancelAllLocalNotifications() を使用
      console.log('🧹 Cleared all notifications');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * デバッグ用: 通知テスト
   */
  static async testNotification(): Promise<void> {
    await this.showLocalNotification(
      'テスト通知',
      'これはテスト通知です',
      { test: true }
    );
  }
}