import { useEffect, createContext, useState } from 'react'
import { getAuth, getConfig } from '../api/allauth'

export const AuthContext = createContext(null)

export function AuthContextProvider({ children }) {
  const [auth, setAuth] = useState(undefined)
  const [config, setConfig] = useState(undefined)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    function onAuthChanged(e) {
      setAuth(e.detail)
    }

    document.addEventListener('allauth.auth.change', onAuthChanged)

    getAuth()
      .then(async data => {
        if (data?.meta?.is_authenticated) {
          try {
            // Need to import apiFetch for this. Wait, I should add the import.
            const { apiFetch } = await import('../api/client')
            const res = await apiFetch('/user/profile/')
            if (res.ok) {
              const profile = await res.json()
              if (data.data?.user) {
                data.data.user.picture = profile.picture
                data.data.user.display = profile.display
              }
            }
          } catch (e) {
            // ignore profile fetch errors
          }
        }
        setAuth(data)
      })
      .catch(() => {
        // 401 = not authenticated, which is fine for public pages.
        // Set auth to null (not logged in) instead of false (error).
        setAuth(null)
      })

    getConfig()
      .then(data => setConfig(data))
      .catch(() => {
        // Config fetch failed — this is a real error
        setAuthError(true)
      })

    return () => {
      document.removeEventListener('allauth.auth.change', onAuthChanged)
    }
  }, [])

  // Still loading if auth hasn't resolved yet
  const loading = typeof auth === 'undefined'

  return (
    <AuthContext.Provider value={{ auth, config }}>
      {loading ? (
        <div className="auth_loading">
          <div className="btn_spinner" style={{ width: 24, height: 24 }} />
        </div>
      ) : authError ? (
        <div className="auth_error">Failed to load. Please refresh.</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

