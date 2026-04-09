/**
 * API client using allauth-issued JWT tokens.
 *
 * Tokens are stored in sessionStorage so they survive page reloads
 * but are cleared when the browser tab is closed.
 * allauth's JWT strategy issues access_token + refresh_token in the
 * meta payload of auth responses (login, signup, session check).
 */
const API_BASE = '/api'
const ALLAUTH_REFRESH_URL = '/_allauth/browser/v1/tokens/refresh'

const TOKEN_KEYS = {
  access: 'allauth_access_token',
  refresh: 'allauth_refresh_token',
}

let accessToken = sessionStorage.getItem(TOKEN_KEYS.access)
let refreshToken = sessionStorage.getItem(TOKEN_KEYS.refresh)
let refreshPromise = null

export function setTokens(access, refresh) {
  accessToken = access
  refreshToken = refresh
  if (access) {
    sessionStorage.setItem(TOKEN_KEYS.access, access)
  } else {
    sessionStorage.removeItem(TOKEN_KEYS.access)
  }
  if (refresh) {
    sessionStorage.setItem(TOKEN_KEYS.refresh, refresh)
  } else {
    sessionStorage.removeItem(TOKEN_KEYS.refresh)
  }
}

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return refreshToken
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  sessionStorage.removeItem(TOKEN_KEYS.access)
  sessionStorage.removeItem(TOKEN_KEYS.refresh)
}

/**
 * Refresh the access token using allauth's JWT refresh endpoint.
 */
async function doRefresh() {
  if (!refreshToken) {
    clearTokens()
    throw new Error('No refresh token')
  }
  const res = await fetch(ALLAUTH_REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) {
    clearTokens()
    throw new Error('Token refresh failed')
  }
  const data = await res.json()
  // allauth returns { status: 200, data: { access_token, refresh_token? } }
  if (data.data?.access_token) {
    setTokens(data.data.access_token, data.data.refresh_token || refreshToken)
    return accessToken
  }
  clearTokens()
  throw new Error('Unexpected refresh response')
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

/**
 * Make an authenticated API request.
 * Automatically attaches the JWT access token and retries on 401.
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers = { ...options.headers }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  })

  // On 401, try refreshing the token and retry once
  if (res.status === 401 && refreshToken) {
    try {
      await refreshAccessToken()
      headers['Authorization'] = `Bearer ${accessToken}`
      res = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
      })
    } catch {
      window.location.href = '/account/login'
      throw new Error('Session expired')
    }
  }

  return res
}

export function rawFetchWithAuth(url, options = {}) {
  const headers = { ...options.headers }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  return fetch(url, { ...options, headers, credentials: 'same-origin' })
}
