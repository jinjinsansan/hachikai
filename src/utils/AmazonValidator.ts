import { WishlistItem } from '../types';

export class AmazonValidator {
  /**
   * Amazon URLの検証
   */
  static validateAmazonUrl(url: string): {
    isValid: boolean;
    hasAffiliateTag: boolean;
    asin?: string;
    errorMessage?: string;
  } {
    // 基本的なURL形式チェック
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        hasAffiliateTag: false,
        errorMessage: 'URLが入力されていません',
      };
    }

    // Amazonドメインのパターンをチェック
    const amazonDomainPattern = /^https?:\/\/(www\.)?(amazon\.co\.jp|amazon\.com|amzn\.to|amzn\.asia)/i;
    if (!amazonDomainPattern.test(url)) {
      return {
        isValid: false,
        hasAffiliateTag: false,
        errorMessage: '有効なAmazon URLではありません',
      };
    }

    // アフィリエイトタグの検出
    const affiliateTagPattern = /[?&]tag=([^&]*)/;
    const hasAffiliateTag = affiliateTagPattern.test(url);

    // ASINの抽出（商品ID）
    const asinPatterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/i,
      /\/o\/ASIN\/([A-Z0-9]{10})/i,
      /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
    ];

    let asin: string | undefined;
    for (const pattern of asinPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        asin = match[1];
        break;
      }
    }

    return {
      isValid: true,
      hasAffiliateTag,
      asin,
    };
  }

  /**
   * URLから商品情報を抽出（簡易版）
   * 実際のアプリではAmazon Product Advertising APIを使用
   */
  static async extractProductInfo(url: string): Promise<WishlistItem | null> {
    const validation = this.validateAmazonUrl(url);

    if (!validation.isValid) {
      return null;
    }

    // ここでは仮の商品情報を返す
    // 実際にはAPIを使用して商品情報を取得
    const mockProductInfo: WishlistItem = {
      id: validation.asin || `item_${Date.now()}`,
      title: 'Amazon商品',
      price: 0,
      url: this.cleanUrl(url),
      imageUrl: undefined,
    };

    return mockProductInfo;
  }

  /**
   * URLからアフィリエイトタグを除去
   */
  static cleanUrl(url: string): string {
    // アフィリエイトタグを削除
    let cleanedUrl = url.replace(/[?&]tag=[^&]*/g, '');

    // 不要なパラメータを削除
    cleanedUrl = cleanedUrl.replace(/[?&]ref=[^&]*/g, '');

    // ?や&が最後に残った場合は削除
    cleanedUrl = cleanedUrl.replace(/[?&]$/, '');

    return cleanedUrl;
  }

  /**
   * 短縮URLを展開（amzn.toなど）
   * 注：実際には非同期でリダイレクトを追跡する必要がある
   */
  static async expandShortUrl(shortUrl: string): Promise<string> {
    // ここでは簡易的に元のURLを返す
    // 実際にはHTTPリクエストでリダイレクト先を取得
    return shortUrl;
  }

  /**
   * 欲しいものリストURLかどうかを判定
   */
  static isWishlistUrl(url: string): boolean {
    const wishlistPatterns = [
      /\/hz\/wishlist\//i,
      /\/registry\/wishlist\//i,
      /\/gp\/registry\//i,
    ];

    return wishlistPatterns.some(pattern => pattern.test(url));
  }

  /**
   * URLから欲しいものリストIDを抽出
   */
  static extractWishlistId(url: string): string | null {
    if (!this.isWishlistUrl(url)) {
      return null;
    }

    // 欲しいものリストIDのパターン
    const patterns = [
      /\/hz\/wishlist\/ls\/([A-Z0-9]+)/i,
      /\/registry\/wishlist\/([A-Z0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 商品URLを正規化（モバイル版→PC版など）
   */
  static normalizeProductUrl(url: string): string {
    let normalizedUrl = url;

    // モバイル版URLをPC版に変換
    normalizedUrl = normalizedUrl.replace(
      /https:\/\/www\.amazon\.co\.jp\/gp\/aw\/d\//,
      'https://www.amazon.co.jp/dp/'
    );

    // 不要なパラメータを削除
    const validation = this.validateAmazonUrl(normalizedUrl);
    if (validation.asin) {
      // ASINがある場合は最短形式に
      normalizedUrl = `https://www.amazon.co.jp/dp/${validation.asin}`;
    }

    return normalizedUrl;
  }
}