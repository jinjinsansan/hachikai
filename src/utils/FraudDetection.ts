import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { ImageProcessor } from './ImageProcessor';

export type ViolationType =
  | 'multiple_accounts'
  | 'fake_purchase_proof'
  | 'abnormal_activity'
  | 'velocity_violation'
  | 'pattern_abuse'
  | 'collusion';

export interface SuspiciousActivity {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, unknown>;
  timestamp: Date;
}

export interface Sanction {
  type: 'warning' | 'temporary_ban' | 'permanent_ban' | 'floor_penalty';
  duration?: number; // 時間（分）
  reason: string;
  appliedAt: Date;
  expiresAt?: Date;
}

/**
 * 不正検出システム
 * 異常行動の検出と自動制裁
 */
export class FraudDetection {
  private static readonly ACTIVITY_THRESHOLD = {
    maxPurchasesPerHour: 10,
    maxAdViewsPerHour: 50,
    maxRouletteSpinsPerDay: 100,
    minTimeBetweenPurchases: 60000, // 1分
    minTimeBetweenAdViews: 5000, // 5秒
  };

  /**
   * 異常行動パターン検出
   */
  static async detectAnomalousActivity(userId: string): Promise<SuspiciousActivity[]> {
    const activities: SuspiciousActivity[] = [];

    try {
      // 過去1時間のアクティビティを取得
      const oneHourAgo = new Date(Date.now() - 3600000);
      const userActivity = await firestore()
        .collection('activities')
        .where('userId', '==', userId)
        .where('timestamp', '>=', oneHourAgo)
        .get();

      // 購入速度チェック
      const purchases = userActivity.docs.filter(doc => doc.data().type === 'purchase');
      if (purchases.length > this.ACTIVITY_THRESHOLD.maxPurchasesPerHour) {
        activities.push({
          type: 'velocity_violation',
          severity: 'high',
          description: `異常な購入速度: ${purchases.length}回/時間`,
          evidence: { count: purchases.length, threshold: this.ACTIVITY_THRESHOLD.maxPurchasesPerHour },
          timestamp: new Date(),
        });
      }

      // 広告視聴速度チェック
      const adViews = userActivity.docs.filter(doc => doc.data().type === 'ad_view');
      if (adViews.length > this.ACTIVITY_THRESHOLD.maxAdViewsPerHour) {
        activities.push({
          type: 'velocity_violation',
          severity: 'medium',
          description: `異常な広告視聴速度: ${adViews.length}回/時間`,
          evidence: { count: adViews.length, threshold: this.ACTIVITY_THRESHOLD.maxAdViewsPerHour },
          timestamp: new Date(),
        });
      }

      // パターン分析（同じ商品の繰り返し購入）
      const purchasePatterns = this.analyzePurchasePatterns(purchases);
      if (purchasePatterns.suspicious) {
        activities.push({
          type: 'pattern_abuse',
          severity: 'high',
          description: 'パターン化された購入行動を検出',
          evidence: purchasePatterns,
          timestamp: new Date(),
        });
      }

      // 時間間隔チェック
      const timingViolations = this.checkTimingViolations(userActivity.docs);
      activities.push(...timingViolations);

    } catch (error) {
      console.error('Failed to detect anomalous activity:', error);
    }

    return activities;
  }

  /**
   * 購入パターン分析
   */
  private static analyzePurchasePatterns(purchases: FirebaseFirestoreTypes.QueryDocumentSnapshot[]): {
    suspicious: boolean;
    products: Array<{ asin: string; count: number }>;
  } {
    const productCounts: Record<string, number> = {};

    purchases.forEach(doc => {
      const asin = doc.data().productAsin;
      if (asin) {
        productCounts[asin] = (productCounts[asin] || 0) + 1;
      }
    });

    // 同じ商品を3回以上購入している場合は怪しい
    const suspiciousProducts = Object.entries(productCounts)
      .filter(([_, count]) => count >= 3)
      .map(([asin, count]) => ({ asin, count }));

    return {
      suspicious: suspiciousProducts.length > 0,
      products: suspiciousProducts,
    };
  }

  /**
   * タイミング違反チェック
   */
  private static checkTimingViolations(activities: FirebaseFirestoreTypes.QueryDocumentSnapshot[]): SuspiciousActivity[] {
    const violations: SuspiciousActivity[] = [];
    const sortedActivities = activities.sort((a, b) =>
      a.data().timestamp.toMillis() - b.data().timestamp.toMillis()
    );

    for (let i = 1; i < sortedActivities.length; i++) {
      const prev = sortedActivities[i - 1].data();
      const curr = sortedActivities[i].data();
      const timeDiff = curr.timestamp.toMillis() - prev.timestamp.toMillis();

      if (curr.type === 'purchase' && prev.type === 'purchase') {
        if (timeDiff < this.ACTIVITY_THRESHOLD.minTimeBetweenPurchases) {
          violations.push({
            type: 'velocity_violation',
            severity: 'critical',
            description: `購入間隔が短すぎます: ${timeDiff}ms`,
            evidence: { timeDiff, threshold: this.ACTIVITY_THRESHOLD.minTimeBetweenPurchases },
            timestamp: new Date(),
          });
        }
      }

      if (curr.type === 'ad_view' && prev.type === 'ad_view') {
        if (timeDiff < this.ACTIVITY_THRESHOLD.minTimeBetweenAdViews) {
          violations.push({
            type: 'velocity_violation',
            severity: 'medium',
            description: `広告視聴間隔が短すぎます: ${timeDiff}ms`,
            evidence: { timeDiff, threshold: this.ACTIVITY_THRESHOLD.minTimeBetweenAdViews },
            timestamp: new Date(),
          });
        }
      }
    }

    return violations;
  }

  /**
   * 同一デバイス複数アカウント検出
   */
  static async detectMultipleAccounts(deviceId?: string): Promise<string[]> {
    try {
      const targetDeviceId = deviceId || await DeviceInfo.getUniqueId();

      // デバイスIDに関連付けられたすべてのユーザーを取得
      const users = await firestore()
        .collection('users')
        .where('deviceIds', 'array-contains', targetDeviceId)
        .get();

      const userIds = users.docs.map(doc => doc.id);

      // 2つ以上のアカウントが同じデバイスを使用している場合
      if (userIds.length > 1) {
        console.warn(`Multiple accounts detected on device ${targetDeviceId}: ${userIds.join(', ')}`);

        // 違反を記録
        await this.recordViolation({
          type: 'multiple_accounts',
          severity: 'high',
          description: `同一デバイスで${userIds.length}個のアカウントを検出`,
          evidence: { deviceId: targetDeviceId, userIds },
          timestamp: new Date(),
        });
      }

      return userIds;
    } catch (error) {
      console.error('Failed to detect multiple accounts:', error);
      return [];
    }
  }

  /**
   * 購入証明画像の改ざん検出
   */
  static async validateImageAuthenticity(imageUrl: string): Promise<boolean> {
    try {
      // 画像メタデータを取得
      const metadata = await this.getImageMetadata(imageUrl);

      // 基本的な検証
      const checks = {
        hasValidTimestamp: this.checkImageTimestamp(metadata),
        hasValidSize: this.checkImageSize(metadata),
        hasValidFormat: this.checkImageFormat(metadata),
        hasValidExif: await this.checkExifData(metadata),
      };

      // OCRでテキスト抽出して検証
      const extractedText = await ImageProcessor.extractText(imageUrl);
      const textValidation = await this.validateExtractedText(extractedText);

      // すべてのチェックに合格した場合のみ有効
      const isValid = Object.values(checks).every(check => check) && textValidation;

      if (!isValid) {
        await this.recordViolation({
          type: 'fake_purchase_proof',
          severity: 'critical',
          description: '改ざんされた購入証明画像を検出',
          evidence: { imageUrl, checks, textValidation },
          timestamp: new Date(),
        });
      }

      return isValid;
    } catch (error) {
      console.error('Failed to validate image authenticity:', error);
      return false;
    }
  }

  /**
   * 画像メタデータ取得（モック）
   */
  private static async getImageMetadata(imageUrl: string): Promise<{
    timestamp: Date;
    size: number;
    format: string;
    width: number;
    height: number;
    exif: Record<string, unknown>;
  }> {
    // 実際の実装では画像ライブラリを使用してメタデータを取得
    return {
      timestamp: new Date(),
      size: 1024000,
      format: 'jpeg',
      width: 1080,
      height: 1920,
      exif: {},
    };
  }

  /**
   * 画像タイムスタンプチェック
   */
  private static checkImageTimestamp(metadata: { timestamp?: Date }): boolean {
    if (!metadata.timestamp) return false;

    const imageTime = new Date(metadata.timestamp).getTime();
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // 画像が1時間以内に撮影されたものかチェック
    return imageTime >= oneHourAgo && imageTime <= now;
  }

  /**
   * 画像サイズチェック
   */
  private static checkImageSize(metadata: { size?: number }): boolean {
    const minSize = 100000; // 100KB
    const maxSize = 10000000; // 10MB
    return metadata.size >= minSize && metadata.size <= maxSize;
  }

  /**
   * 画像フォーマットチェック
   */
  private static checkImageFormat(metadata: { format?: string }): boolean {
    const validFormats = ['jpeg', 'jpg', 'png'];
    return validFormats.includes(metadata.format?.toLowerCase());
  }

  /**
   * EXIFデータチェック
   */
  private static async checkExifData(metadata: { exif?: Record<string, unknown> }): Promise<boolean> {
    // EXIFデータの存在と整合性をチェック
    // 編集ソフトウェアの痕跡を探す
    if ((metadata.exif?.Software as string)?.includes('Photoshop')) {
      return false; // 編集された可能性が高い
    }
    return true;
  }

  /**
   * 抽出テキスト検証
   */
  private static async validateExtractedText(text: string): Promise<boolean> {
    // Amazon注文確認画面の必須要素をチェック
    const requiredElements = [
      /注文番号|Order Number/i,
      /\d{3}-\d{7}-\d{7}/, // Amazon注文番号形式
      /amazon|アマゾン/i,
      /[¥￥$]\s*[\d,]+/, // 価格
    ];

    return requiredElements.every(pattern => pattern.test(text));
  }

  /**
   * 共謀検出（複数ユーザーの協調的な不正行為）
   */
  static async detectCollusion(userIds: string[]): Promise<boolean> {
    try {
      // ユーザー間の取引パターンを分析
      const transactions = await firestore()
        .collection('purchases')
        .where('buyerId', 'in', userIds)
        .get();

      const patterns: Record<string, number> = {};

      transactions.docs.forEach(doc => {
        const data = doc.data();
        const pair = `${data.buyerId}_${data.sellerId}`;
        patterns[pair] = (patterns[pair] || 0) + 1;
      });

      // 同じペアで5回以上の取引がある場合は共謀の疑い
      const suspiciousPairs = Object.entries(patterns)
        .filter(([_, count]) => count >= 5)
        .map(([pair, count]) => ({ pair, count }));

      if (suspiciousPairs.length > 0) {
        await this.recordViolation({
          type: 'collusion',
          severity: 'critical',
          description: '複数ユーザー間の共謀を検出',
          evidence: { userIds, patterns: suspiciousPairs },
          timestamp: new Date(),
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to detect collusion:', error);
      return false;
    }
  }

  /**
   * 自動制裁システム
   */
  static async applyAutoSanctions(userId: string, violation: ViolationType): Promise<void> {
    try {
      let sanction: Sanction;

      // 違反タイプに応じた制裁を決定
      switch (violation) {
        case 'multiple_accounts':
        case 'fake_purchase_proof':
        case 'collusion':
          sanction = {
            type: 'permanent_ban',
            reason: `重大な違反: ${violation}`,
            appliedAt: new Date(),
          };
          break;

        case 'abnormal_activity':
        case 'velocity_violation':
          sanction = {
            type: 'temporary_ban',
            duration: 1440, // 24時間
            reason: `異常な活動パターン: ${violation}`,
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + 1440 * 60000),
          };
          break;

        case 'pattern_abuse':
          sanction = {
            type: 'floor_penalty',
            reason: `パターン違反: ${violation}`,
            appliedAt: new Date(),
          };
          break;

        default:
          sanction = {
            type: 'warning',
            reason: `違反行為: ${violation}`,
            appliedAt: new Date(),
          };
      }

      // 制裁を適用
      await this.applySanction(userId, sanction);

      // 管理者に通知
      await this.notifyAdmins(userId, violation, sanction);

    } catch (error) {
      console.error('Failed to apply auto sanctions:', error);
    }
  }

  /**
   * 制裁を適用
   */
  private static async applySanction(userId: string, sanction: Sanction): Promise<void> {
    await firestore().collection('sanctions').add({
      userId,
      ...sanction,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    // ユーザーステータスを更新
    const updates: Record<string, unknown> = {
      sanctionStatus: sanction.type,
      sanctionReason: sanction.reason,
      sanctionAppliedAt: firestore.FieldValue.serverTimestamp(),
    };

    if (sanction.type === 'floor_penalty') {
      // 階層を1つ下げる
      const userDoc = await firestore().collection('users').doc(userId).get();
      const currentFloor = userDoc.data()?.floor || 1;
      updates.floor = Math.max(1, currentFloor - 1);
    }

    if (sanction.type === 'temporary_ban' && sanction.expiresAt) {
      updates.bannedUntil = sanction.expiresAt;
    }

    if (sanction.type === 'permanent_ban') {
      updates.permanentlyBanned = true;
    }

    await firestore().collection('users').doc(userId).update(updates);
  }

  /**
   * 違反を記録
   */
  private static async recordViolation(activity: SuspiciousActivity): Promise<void> {
    await firestore().collection('violations').add({
      ...activity,
      recordedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * 管理者に通知
   */
  private static async notifyAdmins(
    userId: string,
    violation: ViolationType,
    sanction: Sanction
  ): Promise<void> {
    await firestore().collection('adminNotifications').add({
      type: 'fraud_detection',
      userId,
      violation,
      sanction,
      timestamp: firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  }

  /**
   * 違反履歴を取得
   */
  static async getViolationHistory(userId: string): Promise<SuspiciousActivity[]> {
    try {
      const violations = await firestore()
        .collection('violations')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      return violations.docs.map(doc => doc.data() as SuspiciousActivity);
    } catch (error) {
      console.error('Failed to get violation history:', error);
      return [];
    }
  }

  /**
   * 制裁状態を確認
   */
  static async checkSanctionStatus(userId: string): Promise<Sanction | null> {
    try {
      const sanctions = await firestore()
        .collection('sanctions')
        .where('userId', '==', userId)
        .orderBy('appliedAt', 'desc')
        .limit(1)
        .get();

      if (sanctions.empty) {
        return null;
      }

      const sanction = sanctions.docs[0].data() as Sanction;

      // 一時的な制裁の期限をチェック
      if (sanction.type === 'temporary_ban' && sanction.expiresAt) {
        if (new Date() > new Date(sanction.expiresAt)) {
          // 期限切れの制裁を無効化
          await firestore().collection('users').doc(userId).update({
            sanctionStatus: null,
            sanctionReason: null,
            bannedUntil: null,
          });
          return null;
        }
      }

      return sanction;
    } catch (error) {
      console.error('Failed to check sanction status:', error);
      return null;
    }
  }
}