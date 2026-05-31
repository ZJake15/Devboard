import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'
import { fetchMe, fetchMyCompany, login as apiLogin, upgradeTier, type User } from './api'

interface JwtPayload {
  tier: string
  username: string
  exp: number
  account_type?: 'developer' | 'company'
  company_id?: number
  company_name?: string
}

interface AuthCtx {
  user: User | null
  tier: 'free' | 'premium' | 'company' | null
  accountType: 'developer' | 'company' | null
  isAuthenticated: boolean
  isCompany: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  loginWithTokens: (access: string, refresh: string) => Promise<void>
  logout: () => void
  upgrade: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accountType, setAccountType] = useState<'developer' | 'company' | null>(null)
  const [loading, setLoading] = useState(true)

  const tier = (accountType === 'company' ? 'company' : user?.profile?.tier) as 'free' | 'premium' | 'company' | null ?? null

  function readAccountTypeFromToken() {
    const access = localStorage.getItem('access')
    if (!access) return null
    try {
      const payload = jwtDecode<JwtPayload>(access)
      return payload.account_type ?? 'developer'
    } catch { return null }
  }

  async function refreshUser() {
    const at = readAccountTypeFromToken()
    setAccountType(at)
    if (at === 'company') {
      // Company accounts don't have a developer profile — store minimal info,
      // using the company logo as the avatar shown in the navbar.
      const access = localStorage.getItem('access')
      if (access) {
        const payload = jwtDecode<JwtPayload>(access)
        let logo: string | null = null
        try {
          const company = await fetchMyCompany()
          logo = company.logo ?? company.logo_url ?? null
        } catch { /* ignore — fall back to initial */ }
        setUser({ id: 0, username: payload.username, email: '', first_name: '', last_name: '', is_staff: false, profile: { tier: 'company', avatar: logo, headline: '', years_experience: 0, skills: [], remote_preference: 'remote' } })
      }
      return
    }
    try {
      const u = await fetchMe()
      setUser(u)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const access = localStorage.getItem('access')
    if (access) {
      try {
        const payload = jwtDecode<JwtPayload>(access)
        if (payload.exp * 1000 > Date.now()) {
          refreshUser().finally(() => setLoading(false))
          return
        }
      } catch { /* invalid token */ }
    }
    setLoading(false)
  }, [])

  async function login(username: string, password: string) {
    const { access, refresh } = await apiLogin(username, password)
    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)
    await refreshUser()
  }

  async function loginWithTokens(access: string, refresh: string) {
    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)
    await refreshUser()
  }

  function logout() {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
    setAccountType(null)
  }

  async function upgrade() {
    await upgradeTier()
    const refresh = localStorage.getItem('refresh')
    if (refresh) {
      const { data } = await axios.post('/api/auth/token/refresh/', { refresh })
      localStorage.setItem('access', data.access)
    }
    await refreshUser()
  }

  return (
    <AuthContext.Provider value={{
      user, tier, accountType,
      isAuthenticated: !!user,
      isCompany: accountType === 'company',
      loading, login, loginWithTokens, logout, upgrade, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
