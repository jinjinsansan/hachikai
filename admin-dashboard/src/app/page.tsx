'use client'

import { useState, useEffect } from 'react'
import SupabaseDashboard from '@/components/SupabaseDashboard'
import SupabaseLoginForm from '@/components/SupabaseLoginForm'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">読み込み中...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {isAuthenticated ? <SupabaseDashboard /> : <SupabaseLoginForm />}
    </main>
  )
}