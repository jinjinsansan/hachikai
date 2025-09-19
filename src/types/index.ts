export interface User {
  id: string;
  name: string;
  floor: number; // 1-8階
  wishlistUrl: string;
  dailyPurchaseCount: number;
  dailyAdViewCount: number;
  debt?: number; // 2階の借金システム用
}

export interface FloorRules {
  floor: number;
  purchaseRequired: number;
  adViewRequired: number;
  purchaseReceived: number;
  specialRules?: string;
}

export interface RouletteResult {
  newFloor: number;
  lockDays: number;
  reason: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  url: string;
  imageUrl?: string;
}

export const FLOOR_RULES: FloorRules[] = [
  {
    floor: 1,
    purchaseRequired: 0,
    adViewRequired: 0,
    purchaseReceived: 0,
    specialRules: '基本階層、特別なルールなし'
  },
  {
    floor: 2,
    purchaseRequired: 0,
    adViewRequired: 0,
    purchaseReceived: 0,
    specialRules: '借金システム：購入がない場合借金が蓄積'
  },
  {
    floor: 3,
    purchaseRequired: 1,
    adViewRequired: 5,
    purchaseReceived: 1,
    specialRules: '標準的な義務と権利'
  },
  {
    floor: 4,
    purchaseRequired: 1,
    adViewRequired: 10,
    purchaseReceived: 1,
    specialRules: '広告視聴義務増加'
  },
  {
    floor: 5,
    purchaseRequired: 2,
    adViewRequired: 10,
    purchaseReceived: 1,
    specialRules: '購入義務増加'
  },
  {
    floor: 6,
    purchaseRequired: 2,
    adViewRequired: 15,
    purchaseReceived: 2,
    specialRules: '購入権利増加'
  },
  {
    floor: 7,
    purchaseRequired: 3,
    adViewRequired: 20,
    purchaseReceived: 2,
    specialRules: '高い義務と権利'
  },
  {
    floor: 8,
    purchaseRequired: 0,
    adViewRequired: 30,
    purchaseReceived: 3,
    specialRules: '最上階：購入義務なし、最大の購入権利'
  }
];