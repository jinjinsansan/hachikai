/**
 * Amazon商品関連の型定義
 */

export interface ProductInfo {
  asin: string;
  title: string;
  price: number;
  imageUrl: string;
  detailPageUrl: string;
  associateUrl: string; // 自動生成されるアソシエイトリンク
  availability?: string; // 在庫状況
  brand?: string; // ブランド
  category?: string; // カテゴリ
}

export interface PurchaseRecord {
  id: string;
  buyerId: string;
  sellerId: string;
  productAsin: string;
  productInfo: ProductInfo;
  purchaseDate: Date;
  confirmationStatus: 'pending' | 'confirmed' | 'failed';
  proofImageUrl?: string; // 購入証明画像
  orderNumber?: string; // Amazon注文番号
  confirmationDate?: Date;
  notes?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  floor: number;
  wishlistUrl?: string;
  wishlistItems?: WishlistItem[];
}

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  url: string;
  imageUrl?: string;
  asin?: string;
  addedDate?: Date;
  priority?: 'high' | 'medium' | 'low';
}

export interface AmazonAPIConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  region: 'jp' | 'us' | 'uk' | 'de' | 'fr';
  marketplace: string;
}

export interface SearchItemsRequest {
  keywords: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sortBy?: 'relevance' | 'price' | 'newest' | 'rating';
}

export interface GetItemsRequest {
  asins: string[];
  resources?: string[];
}

export interface AmazonAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}