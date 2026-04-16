import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthContextProvider')
  return ctx.auth
}

export function useConfig() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useConfig must be used within AuthContextProvider')
  return ctx.config
}

export function useUser() {
  const auth = useAuth()
  if (auth?.status === 200 && auth?.data?.user) {
    return auth.data.user
  }
  return null
}

export function useAuthStatus() {
  const auth = useAuth()
  return {
    isAuthenticated: auth?.status === 200 && auth?.meta?.is_authenticated,
    requiresAction: auth?.status === 401,
    pendingFlows: auth?.data?.flows || [],
  }
}

export function useAuthInfo() {
  const auth = useAuth()
  const config = useConfig()
  return {
    auth,
    config,
    isAuthenticated: auth?.status === 200 && auth?.meta?.is_authenticated,
    user: auth?.data?.user || null,
    providers: config?.data?.socialaccount?.providers || [],
  }
}
