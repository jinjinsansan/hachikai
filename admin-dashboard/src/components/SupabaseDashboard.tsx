'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import StatsCard from './StatsCard'
import SupabaseUserTable from './SupabaseUserTable'
import FloorChart from './FloorChart'

interface Stats {
  totalUsers: number
  totalPurchases: number
  totalAdViews: number
  floorDistribution: number[]
}

export default function SupabaseDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPurchases: 0,
    totalAdViews: 0,
    floorDistribution: [0, 0, 0, 0, 0, 0, 0, 0]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // ユーザー統計を取得
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('floor')
        .eq('is_active', true)

      if (profilesError) throw profilesError

      const floorDist = [0, 0, 0, 0, 0, 0, 0, 0]
      profiles?.forEach((profile) => {
        if (profile.floor >= 1 && profile.floor <= 8) {
          floorDist[profile.floor - 1]++
        }
      })

      // 購入統計を取得
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('id', { count: 'exact' })

      if (purchasesError) throw purchasesError

      // 広告視聴統計を取得
      const { data: adViews, error: adViewsError } = await supabase
        .from('ad_views')
        .select('id', { count: 'exact' })

      if (adViewsError) throw adViewsError

      setStats({
        totalUsers: profiles?.length || 0,
        totalPurchases: purchases?.length || 0,
        totalAdViews: adViews?.length || 0,
        floorDistribution: floorDist
      })
    } catch (error) {
      console.error('ダッシュボードデータの取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('サインアウトエラー:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">データを読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                HachiKai Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                8階層相互扶助システム管理画面
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="総ユーザー数"
              value={stats.totalUsers}
              icon="users"
              color="blue"
            />
            <StatsCard
              title="総購入数"
              value={stats.totalPurchases}
              icon="shopping-cart"
              color="green"
            />
            <StatsCard
              title="総広告視聴数"
              value={stats.totalAdViews}
              icon="eye"
              color="purple"
            />
            <StatsCard
              title="アクティブ階層"
              value={stats.floorDistribution.filter(count => count > 0).length}
              icon="building"
              color="orange"
            />
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Floor Distribution Chart */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  階層別ユーザー分布
                </h3>
                <FloorChart data={stats.floorDistribution} />
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  最新ユーザー
                </h3>
                <SupabaseUserTable />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}