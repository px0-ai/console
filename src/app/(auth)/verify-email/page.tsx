'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

function VerifyEmailRedirect() {
  const router = useRouter()
  const { token, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded) {
      if (token) {
        router.replace('/settings')
      } else {
        router.replace('/login')
      }
    }
  }, [isLoaded, token, router])

  return (
    <div className="loading-shell">
      <span className="sidebar-subtitle">Redirecting...</span>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailRedirect />
    </Suspense>
  )
}
