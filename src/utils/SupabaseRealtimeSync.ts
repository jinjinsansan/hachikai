import { supabase, Profile, Purchase, AdView, FloorStatistics } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export class SupabaseRealtimeSync {
  private static instance: SupabaseRealtimeSync;
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Function[]> = new Map();
  private profileCache: Map<string, Profile> = new Map();

  private constructor() {
    this.setupRealtimeSubscriptions();
  }

  static getInstance(): SupabaseRealtimeSync {
    if (!SupabaseRealtimeSync.instance) {
      SupabaseRealtimeSync.instance = new SupabaseRealtimeSync();
    }
    return SupabaseRealtimeSync.instance;
  }

  // リアルタイムサブスクリプションの設定
  private setupRealtimeSubscriptions() {
    // プロファイルの変更を監視
    const profileChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: RealtimePostgresChangesPayload<Profile>) => {
          this.handleProfileChange(payload);
        }
      )
      .subscribe();

    this.channels.set('profiles', profileChannel);

    // 購入の変更を監視
    const purchaseChannel = supabase
      .channel('purchases-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        (payload: RealtimePostgresChangesPayload<Purchase>) => {
          this.handlePurchaseChange(payload);
        }
      )
      .subscribe();

    this.channels.set('purchases', purchaseChannel);

    // 階層統計の変更を監視
    const statsChannel = supabase
      .channel('floor-stats-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'floor_statistics' },
        (payload: RealtimePostgresChangesPayload<FloorStatistics>) => {
          this.handleFloorStatsChange(payload);
        }
      )
      .subscribe();

    this.channels.set('floor_statistics', statsChannel);
  }

  // プロファイル変更の処理
  private async handleProfileChange(payload: RealtimePostgresChangesPayload<Profile>) {
    console.log('プロファイル変更:', payload);

    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'UPDATE' && newRecord) {
      // キャッシュを更新
      this.profileCache.set(newRecord.id, newRecord);

      // リスナーに通知
      this.notifyListeners('profile-update', newRecord);

      // ローカルストレージを更新
      const currentUserId = await AsyncStorage.getItem('user_id');
      if (newRecord.user_id === currentUserId) {
        await AsyncStorage.setItem('user_profile', JSON.stringify(newRecord));
      }
    }
  }

  // 購入変更の処理
  private handlePurchaseChange(payload: RealtimePostgresChangesPayload<Purchase>) {
    console.log('購入変更:', payload);

    const { eventType, new: newRecord } = payload;

    if (eventType === 'INSERT' && newRecord) {
      this.notifyListeners('purchase-added', newRecord);
    } else if (eventType === 'UPDATE' && newRecord) {
      this.notifyListeners('purchase-updated', newRecord);
    }
  }

  // 階層統計変更の処理
  private handleFloorStatsChange(payload: RealtimePostgresChangesPayload<FloorStatistics>) {
    console.log('階層統計変更:', payload);

    const { new: newRecord } = payload;
    if (newRecord) {
      this.notifyListeners('floor-stats-update', newRecord);
    }
  }

  // リスナーの登録
  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Unsubscribe関数を返す
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // リスナーに通知
  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`リスナーエラー (${event}):`, error);
        }
      });
    }
  }

  // プロファイルをリアルタイムで同期
  async syncProfile(userId: string): Promise<Profile | null> {
    try {
      // キャッシュをチェック
      const cached = Array.from(this.profileCache.values()).find(p => p.user_id === userId);
      if (cached) return cached;

      // データベースから取得
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('プロファイル同期エラー:', error);
        return null;
      }

      if (data) {
        this.profileCache.set(data.id, data);
        return data;
      }

      return null;
    } catch (error) {
      console.error('プロファイル同期エラー:', error);
      return null;
    }
  }

  // 購入履歴をリアルタイムで取得
  async syncPurchases(userId: string): Promise<Purchase[]> {
    try {
      const profile = await this.syncProfile(userId);
      if (!profile) return [];

      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('購入履歴同期エラー:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('購入履歴同期エラー:', error);
      return [];
    }
  }

  // 広告視聴履歴をリアルタイムで取得
  async syncAdViews(userId: string): Promise<AdView[]> {
    try {
      const profile = await this.syncProfile(userId);
      if (!profile) return [];

      const { data, error } = await supabase
        .from('ad_views')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('広告視聴履歴同期エラー:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('広告視聴履歴同期エラー:', error);
      return [];
    }
  }

  // 階層統計をリアルタイムで取得
  async syncFloorStatistics(): Promise<FloorStatistics[]> {
    try {
      const { data, error } = await supabase
        .from('floor_statistics')
        .select('*')
        .order('floor', { ascending: true });

      if (error) {
        console.error('階層統計同期エラー:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('階層統計同期エラー:', error);
      return [];
    }
  }

  // 購入を追加
  async addPurchase(purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>): Promise<Purchase | null> {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .insert(purchase)
        .select()
        .single();

      if (error) {
        console.error('購入追加エラー:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('購入追加エラー:', error);
      return null;
    }
  }

  // 購入ステータスを更新
  async updatePurchaseStatus(purchaseId: string, status: Purchase['status'], verifiedBy?: string): Promise<boolean> {
    try {
      const updates: Partial<Purchase> = {
        status,
        verified_at: new Date().toISOString(),
      };

      if (verifiedBy) {
        updates.verified_by = verifiedBy;
      }

      const { error } = await supabase
        .from('purchases')
        .update(updates)
        .eq('id', purchaseId);

      if (error) {
        console.error('購入ステータス更新エラー:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('購入ステータス更新エラー:', error);
      return false;
    }
  }

  // 広告視聴を記録
  async recordAdView(adView: Omit<AdView, 'id' | 'created_at'>): Promise<AdView | null> {
    try {
      const { data, error } = await supabase
        .from('ad_views')
        .insert(adView)
        .select()
        .single();

      if (error) {
        console.error('広告視聴記録エラー:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('広告視聴記録エラー:', error);
      return null;
    }
  }

  // ポイントトランザクションを追加
  async addPointTransaction(
    userId: string,
    type: 'earned' | 'spent' | 'transferred' | 'bonus',
    amount: number,
    description?: string,
    referenceType?: string,
    referenceId?: string
  ): Promise<boolean> {
    try {
      // 現在のポイント残高を取得
      const profile = await this.syncProfile(userId);
      if (!profile) return false;

      const balanceAfter = profile.total_points + amount;

      const { error: transactionError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: profile.id,
          type,
          amount,
          balance_after: balanceAfter,
          description,
          reference_type: referenceType as any,
          reference_id: referenceId,
        });

      if (transactionError) {
        console.error('ポイントトランザクション追加エラー:', transactionError);
        return false;
      }

      // プロファイルのポイントを更新
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ total_points: balanceAfter })
        .eq('id', profile.id);

      if (profileError) {
        console.error('プロファイルポイント更新エラー:', profileError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('ポイントトランザクション追加エラー:', error);
      return false;
    }
  }

  // オフラインキューをサーバーに同期
  async syncOfflineQueue(): Promise<void> {
    try {
      const offlineQueue = await AsyncStorage.getItem('offline_queue');
      if (!offlineQueue) return;

      const queue = JSON.parse(offlineQueue);
      const failedItems: any[] = [];

      for (const item of queue) {
        try {
          switch (item.type) {
            case 'purchase':
              const purchase = await this.addPurchase(item.data);
              if (!purchase) failedItems.push(item);
              break;
            case 'ad_view':
              const adView = await this.recordAdView(item.data);
              if (!adView) failedItems.push(item);
              break;
            default:
              failedItems.push(item);
          }
        } catch (error) {
          console.error('オフライン同期エラー:', error);
          failedItems.push(item);
        }
      }

      // 失敗したアイテムを保存
      if (failedItems.length > 0) {
        await AsyncStorage.setItem('offline_queue', JSON.stringify(failedItems));
      } else {
        await AsyncStorage.removeItem('offline_queue');
      }
    } catch (error) {
      console.error('オフラインキュー同期エラー:', error);
    }
  }

  // クリーンアップ
  cleanup() {
    // 全てのチャンネルをunsubscribe
    this.channels.forEach((channel, key) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    this.listeners.clear();
    this.profileCache.clear();
  }
}