'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Team, OrganizationWithRole, TeamMember } from '@/lib/types'
import { api } from '@/lib/api'

interface AuthCtx {
  token: string | null
  user: User | null
  team: Team | null
  organizations: OrganizationWithRole[]
  teams: Team[]
  isLoaded: boolean
  isLoadingOrgs: boolean
  isLoadingTeams: boolean
  isOrgAdmin: boolean
  teamRole: TeamMember['role'] | null
  login: (token: string, user: User) => void
  logout: () => void
  setTeam: (team: Team) => void
  refreshOrgs: () => Promise<OrganizationWithRole[]>
  refreshTeams: () => Promise<Team[]>
}

const AuthContext = createContext<AuthCtx>({
  token: null,
  user: null,
  team: null,
  organizations: [],
  teams: [],
  isLoaded: false,
  isLoadingOrgs: false,
  isLoadingTeams: false,
  isOrgAdmin: false,
  teamRole: null,
  login: () => {},
  logout: () => {},
  setTeam: () => {},
  refreshOrgs: async () => [],
  refreshTeams: async () => [],
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeamState] = useState<Team | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [teamRole, setTeamRole] = useState<TeamMember['role'] | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('px0-token')
    const u = localStorage.getItem('px0-user')
    const tm = localStorage.getItem('px0-team')
    if (t) setToken(t)
    if (u) { try { setUser(JSON.parse(u)) } catch {} }
    if (tm) { try { setTeamState(JSON.parse(tm)) } catch {} }
    setIsLoaded(true)
  }, [])

  async function refreshOrgs(): Promise<OrganizationWithRole[]> {
    if (!localStorage.getItem('px0-token')) return []
    setIsLoadingOrgs(true)
    try {
      const res = await api.orgs.listMine()
      const orgs = res?.organizations ?? []
      setOrganizations(orgs)
      return orgs
    } catch (err) {
      console.error('Failed to load organizations:', err)
      return []
    } finally {
      setIsLoadingOrgs(false)
    }
  }

  async function refreshTeams(): Promise<Team[]> {
    if (!localStorage.getItem('px0-token')) return []
    setIsLoadingTeams(true)
    try {
      const res = await api.teams.listMine()
      const userTeams = res?.teams ?? []
      setTeams(userTeams)
      return userTeams
    } catch (err) {
      console.error('Failed to load teams:', err)
      return []
    } finally {
      setIsLoadingTeams(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setOrganizations([])
      setTeams([])
      return
    }

    refreshOrgs()
    refreshTeams().then(userTeams => {
      const savedTeamStr = localStorage.getItem('px0-team')
      if (savedTeamStr) {
        try {
          const savedTeam = JSON.parse(savedTeamStr)
          const exists = userTeams.some(t => t.id === savedTeam.id)
          if (exists) {
            setTeamState(savedTeam)
            return
          }
        } catch {}
      }
      if (userTeams.length > 0) {
        setTeam(userTeams[0])
      } else {
        setTeamState(null)
        localStorage.removeItem('px0-team')
      }
    })
  }, [token])

  function login(t: string, u: User) {
    localStorage.setItem('px0-token', t)
    localStorage.setItem('px0-user', JSON.stringify(u))
    setToken(t)
    setUser(u)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('px0-token')
    localStorage.removeItem('px0-user')
    localStorage.removeItem('px0-team')
    setToken(null)
    setUser(null)
    setTeamState(null)
    setTeamRole(null)
    setOrganizations([])
    setTeams([])
  }, [])

  useEffect(() => {
    const unsubscribe = api.addErrorListener((status) => {
      if (status === 401) {
        logout()
      }
    })
    return () => {
      unsubscribe()
    }
  }, [logout])

  function setTeam(tm: Team) {
    setTeamState(tm)
    localStorage.setItem('px0-team', JSON.stringify(tm))
  }

  useEffect(() => {
    if (!team || !user) {
      setTeamRole(null)
      return
    }
    let isMounted = true
    api.teams.listMembers(team.id)
      .then(res => {
        const me = res.members?.find(m => m.user_id === user.id)
        if (isMounted) {
          setTeamRole(me ? me.role : null)
        }
      })
      .catch(err => {
        console.error('Failed to load team role:', err)
        if (isMounted) {
          setTeamRole(null)
        }
      })
    return () => {
      isMounted = false
    }
  }, [team, user])

  const isOrgAdmin = user?.is_admin || organizations.some(o => o.role?.toLowerCase() === 'admin')

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        team,
        organizations,
        teams,
        isLoaded,
        isLoadingOrgs,
        isLoadingTeams,
        isOrgAdmin,
        teamRole,
        login,
        logout,
        setTeam,
        refreshOrgs,
        refreshTeams,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
