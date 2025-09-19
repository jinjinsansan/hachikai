'use client'

import SupabaseDashboard from '@/components/SupabaseDashboard'

export default function Home() {
  // 認証を一時的にバイパスして直接ダッシュボードを表示
  return (
    <main className="min-h-screen">
      <SupabaseDashboard />
    </main>
  )
}