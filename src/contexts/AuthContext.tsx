'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { User, Team } from '@/lib/types'

interface AuthCtx {
  token: string | null
  user: User | null
  team: Team | null
  isLoaded: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setTeam: (team: Team) => void
}

const AuthContext = createContext<AuthCtx>({
  token: null,
  user: null,
  team: null,
  isLoaded: false,
  login: () => {},
  logout: () => {},
  setTeam: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeamState] = useState<Team | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('px0-token')
    const u = localStorage.getItem('px0-user')
    const tm = localStorage.getItem('px0-team')
    if (t) setToken(t)
    if (u) { try { setUser(JSON.parse(u)) } catch {} }
    if (tm) { try { setTeamState(JSON.parse(tm)) } catch {} }
    setIsLoaded(true)
  }, [])

  function login(t: string, u: User) {
    setToken(t)
    setUser(u)
    localStorage.setItem('px0-token', t)
    localStorage.setItem('px0-user', JSON.stringify(u))
  }

  function logout() {
    setToken(null)
    setUser(null)
    setTeamState(null)
    localStorage.removeItem('px0-token')
    localStorage.removeItem('px0-user')
    localStorage.removeItem('px0-team')
  }

  function setTeam(tm: Team) {
    setTeamState(tm)
    localStorage.setItem('px0-team', JSON.stringify(tm))
  }

  return (
    <AuthContext.Provider value={{ token, user, team, isLoaded, login, logout, setTeam }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
