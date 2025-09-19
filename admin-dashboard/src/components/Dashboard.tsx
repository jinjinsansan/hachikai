'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import StatsCard from './StatsCard'
import UserTable from './UserTable'
import FloorChart from './FloorChart'

interface Stats {
  totalUsers: number
  totalPurchases: number
  totalAdViews: number
  floorDistribution: number[]
}

export default function Dashboard() {
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
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const floorDist = [0, 0, 0, 0, 0, 0, 0, 0]

      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.floor >= 1 && userData.floor <= 8) {
          floorDist[userData.floor - 1]++
        }
      })

      // 購入統計を取得
      const purchasesSnapshot = await getDocs(collection(db, 'purchases'))

      // 広告視聴統計を取得
      const adViewsSnapshot = await getDocs(collection(db, 'adViews'))

      setStats({
        totalUsers: usersSnapshot.size,
        totalPurchases: purchasesSnapshot.size,
        totalAdViews: adViewsSnapshot.size,
        floorDistribution: floorDist
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
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
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              HachiKai 管理ダッシュボード
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="総ユーザー数"
            value={stats.totalUsers.toLocaleString()}
            icon="👥"
            color="bg-blue-500"
          />
          <StatsCard
            title="総購入数"
            value={stats.totalPurchases.toLocaleString()}
            icon="🛍️"
            color="bg-green-500"
          />
          <StatsCard
            title="総広告視聴数"
            value={stats.totalAdViews.toLocaleString()}
            icon="📺"
            color="bg-purple-500"
          />
        </div>

        {/* 階層分布チャート */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">階層分布</h2>
          <FloorChart data={stats.floorDistribution} />
        </div>

        {/* ユーザーテーブル */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">最近のユーザー</h2>
          <UserTable />
        </div>
      </main>
    </div>
  )
}