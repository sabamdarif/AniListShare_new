const Client = Object.freeze({
  APP: 'app',
  BROWSER: 'browser',
})

const settings = {
  client: Client.BROWSER,
  baseUrl: `/_allauth/${Client.BROWSER}/v1`,
  withCredentials: false,
}

const ACCEPT_JSON = {
  accept: 'application/json',
}

export const AuthProcess = Object.freeze({
  LOGIN: 'login',
  CONNECT: 'connect',
})

export const Flows = Object.freeze({
  LOGIN: 'login',
  LOGIN_BY_CODE: 'login_by_code',
  MFA_AUTHENTICATE: 'mfa_authenticate',
  MFA_REAUTHENTICATE: 'mfa_reauthenticate',
  PROVIDER_REDIRECT: 'provider_redirect',
  PROVIDER_SIGNUP: 'provider_signup',
  REAUTHENTICATE: 'reauthenticate',
  SIGNUP: 'signup',
  VERIFY_EMAIL: 'verify_email',
})

export const URLs = Object.freeze({
  CONFIG: '/config',
  CHANGE_PASSWORD: '/account/password/change',
  EMAIL: '/account/email',
  PROVIDERS: '/account/providers',
  AUTHENTICATORS: '/account/authenticators',
  RECOVERY_CODES: '/account/authenticators/recovery-codes',
  TOTP_AUTHENTICATOR: '/account/authenticators/totp',
  LOGIN: '/auth/login',
  REQUEST_LOGIN_CODE: '/auth/code/request',
  CONFIRM_LOGIN_CODE: '/auth/code/confirm',
  SESSION: '/auth/session',
  REAUTHENTICATE: '/auth/reauthenticate',
  REQUEST_PASSWORD_RESET: '/auth/password/request',
  RESET_PASSWORD: '/auth/password/reset',
  SIGNUP: '/auth/signup',
  VERIFY_EMAIL: '/auth/email/verify',
  MFA_AUTHENTICATE: '/auth/2fa/authenticate',
  MFA_REAUTHENTICATE: '/auth/2fa/reauthenticate',
  PROVIDER_SIGNUP: '/auth/provider/signup',
  REDIRECT_TO_PROVIDER: '/auth/provider/redirect',
  PROVIDER_TOKEN: '/auth/provider/token',
  SESSIONS: '/auth/sessions',
})

function getCSRFToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ''
}

// Ensure Django has set the csrftoken cookie by hitting a GET endpoint
let csrfBootstrapped = false
async function ensureCSRFCookie() {
  if (csrfBootstrapped) return
  if (getCSRFToken()) {
    csrfBootstrapped = true
    return
  }
  // A GET to the config endpoint will cause Django to set the cookie
  try {
    await fetch(settings.baseUrl + URLs.CONFIG, {
      credentials: 'same-origin',
      headers: ACCEPT_JSON,
    })
    csrfBootstrapped = true
  } catch { /* best effort */ }
}

function postForm(action, data) {
  const f = document.createElement('form')
  f.method = 'POST'
  f.action = settings.baseUrl + action
  for (const key in data) {
    const d = document.createElement('input')
    d.type = 'hidden'
    d.name = key
    d.value = data[key]
    f.appendChild(d)
  }
  document.body.appendChild(f)
  f.submit()
}

import { setTokens, clearTokens } from './client'

const tokenStorage = window.sessionStorage

export function getSessionToken() {
  return tokenStorage.getItem('sessionToken')
}

async function request(method, path, data, headers) {
  // Ensure CSRF cookie is available before any mutating request
  if (method !== 'GET' && settings.client === Client.BROWSER) {
    await ensureCSRFCookie()
  }

  const options = {
    method,
    credentials: 'same-origin', // Always send cookies through same-origin/proxy
    headers: {
      ...ACCEPT_JSON,
      ...headers,
    },
  }

  if (path !== URLs.CONFIG) {
    if (settings.client === Client.BROWSER) {
      options.headers['X-CSRFToken'] = getCSRFToken()
    } else if (settings.client === Client.APP) {
      const sessionToken = getSessionToken()
      if (sessionToken) {
        options.headers['X-Session-Token'] = sessionToken
      }
    }
  }

  if (typeof data !== 'undefined') {
    options.body = JSON.stringify(data)
    options.headers['Content-Type'] = 'application/json'
  }

  const resp = await fetch(settings.baseUrl + path, options)
  const msg = await resp.json()

  if (msg.status === 410) {
    tokenStorage.removeItem('sessionToken')
    clearTokens()
  }
  if (msg.meta?.session_token) {
    tokenStorage.setItem('sessionToken', msg.meta.session_token)
  }

  // Store JWT tokens from allauth headless JWT strategy responses
  if (msg.meta?.access_token) {
    setTokens(
      msg.meta.access_token,
      msg.meta.refresh_token || null
    )
  }

  // On logout or genuine auth failure, clear tokens.
  // A 401 with pending flows (e.g. verify_email after signup) is NOT a
  // failure — it means the user was created but needs to complete a step.
  const hasPendingFlows = msg.data?.flows?.length > 0
  if ([401, 410].includes(msg.status) && !hasPendingFlows) {
    clearTokens()
  }

  if (
    ([401, 410].includes(msg.status) && !hasPendingFlows) ||
    (msg.status === 200 && msg.meta?.is_authenticated)
  ) {
    const event = new CustomEvent('allauth.auth.change', { detail: msg })
    document.dispatchEvent(event)
  }

  return msg
}

export async function login(data) {
  return await request('POST', URLs.LOGIN, data)
}

export async function logout() {
  return await request('DELETE', URLs.SESSION)
}

export async function signUp(data) {
  return await request('POST', URLs.SIGNUP, data)
}

export async function providerSignup(data) {
  return await request('POST', URLs.PROVIDER_SIGNUP, data)
}

export async function getProviderAccounts() {
  return await request('GET', URLs.PROVIDERS)
}

export async function disconnectProviderAccount(providerId, accountUid) {
  return await request('DELETE', URLs.PROVIDERS, {
    provider: providerId,
    account: accountUid,
  })
}

export async function requestPasswordReset(email) {
  return await request('POST', URLs.REQUEST_PASSWORD_RESET, { email })
}

export async function getEmailVerification(key) {
  return await request('GET', URLs.VERIFY_EMAIL, undefined, {
    'X-Email-Verification-Key': key,
  })
}

export async function getEmailAddresses() {
  return await request('GET', URLs.EMAIL)
}

export async function verifyEmail(key) {
  return await request('POST', URLs.VERIFY_EMAIL, { key })
}

export async function getPasswordReset(key) {
  return await request('GET', URLs.RESET_PASSWORD, undefined, {
    'X-Password-Reset-Key': key,
  })
}

export async function resetPassword(data) {
  return await request('POST', URLs.RESET_PASSWORD, data)
}

export async function changePassword(data) {
  return await request('POST', URLs.CHANGE_PASSWORD, data)
}

export async function getAuth() {
  return await request('GET', URLs.SESSION)
}

export async function getConfig() {
  return await request('GET', URLs.CONFIG)
}

export async function reauthenticate(data) {
  return await request('POST', URLs.REAUTHENTICATE, data)
}

export async function mfaAuthenticate(code) {
  return await request('POST', URLs.MFA_AUTHENTICATE, { code })
}

export async function authenticateByToken(
  providerId,
  token,
  process = AuthProcess.LOGIN
) {
  return await request('POST', URLs.PROVIDER_TOKEN, {
    provider: providerId,
    token,
    process,
  })
}

export function redirectToProvider(
  providerId,
  callbackURL,
  process = AuthProcess.LOGIN
) {
  postForm(URLs.REDIRECT_TO_PROVIDER, {
    provider: providerId,
    process,
    callback_url:
      window.location.protocol + '//' + window.location.host + callbackURL,
    csrfmiddlewaretoken: getCSRFToken(),
  })
}

export function setup(client, baseUrl, withCredentials) {
  settings.client = client
  settings.baseUrl = baseUrl
  settings.withCredentials = withCredentials
}
