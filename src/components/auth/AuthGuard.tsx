'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !token) router.replace('/login')
  }, [isLoaded, token, router])

  if (!isLoaded) {
    return (
      <div className="loading-shell">
        <span className="sidebar-subtitle">loading...</span>
      </div>
    )
  }

  if (!token) return null

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}
