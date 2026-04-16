import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp, redirectToProvider, Flows } from '../api/allauth'
import { useConfig, useAuthStatus } from '../auth/hooks'

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
)

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [errors, setErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const config = useConfig()
  const { isAuthenticated } = useAuthStatus()

  const providers = config?.data?.socialaccount?.providers || []
  const hasGoogle = providers.some(p => p.id === 'google')

  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors([])
    setFieldErrors({})
    setLoading(true)

    try {
      const resp = await signUp({ username, email, password: password1 })

      if (resp.status === 200 && resp.meta?.is_authenticated) {
        navigate('/', { replace: true })
      } else if (resp.data?.flows) {
        // With mandatory email verification, allauth returns status 401
        // with a verify_email flow — the user IS created, they just need
        // to confirm their email before they can log in.
        const hasVerifyEmail = resp.data.flows.some(
          f => f.id === Flows.VERIFY_EMAIL
        )
        if (hasVerifyEmail) {
          navigate('/account/verify-email')
        }
      } else if (resp.errors) {
        const fe = {}
        const ge = []
        resp.errors.forEach(err => {
          if (err.param) {
            fe[err.param] = fe[err.param] || []
            fe[err.param].push(err.message)
          } else {
            ge.push(err.message)
          }
        })
        setFieldErrors(fe)
        setErrors(ge)
      }
    } catch {
      setErrors(['Network error. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    redirectToProvider('google', '/account/provider/callback')
  }

  return (
    <div className="auth_container">
      <div className="brand_title">
        <img src="/logo.png" alt="Logo" />
        AniListShare
      </div>
      <div className="auth_card">
        <div className="auth_header">
          <h1>Sign Up</h1>
          <p>
            Already have an account? Then please{' '}
            <Link to="/account/login">sign in</Link>.
          </p>
        </div>

        <form className="auth_form" id="signup_form" onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <ul className="errorlist">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          <div className="form_group">
            <input
              className="form_input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            {fieldErrors.username && (
              <ul className="errorlist">
                {fieldErrors.username.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          <div className="form_group">
            <input
              className="form_input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {fieldErrors.email && (
              <ul className="errorlist">
                {fieldErrors.email.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          <div className="form_group">
            <input
              className="form_input"
              type="password"
              placeholder="Password"
              value={password1}
              onChange={e => setPassword1(e.target.value)}
              autoComplete="new-password"
              required
            />
            {fieldErrors.password && (
              <ul className="errorlist">
                {fieldErrors.password.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <div className="help_text">
              <ul>
                <li>Your password can&apos;t be too similar to your personal info.</li>
                <li>Must contain at least 8 characters.</li>
                <li>Can&apos;t be a commonly used password.</li>
                <li>Can&apos;t be entirely numeric.</li>
              </ul>
            </div>
          </div>

          <div className="form_group">
            <input
              className="form_input"
              type="password"
              placeholder="Confirm Password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button className="auth_btn" type="submit" disabled={loading}>
            {loading ? 'Signing up…' : 'Sign Up'}
          </button>
        </form>

        {hasGoogle && (
          <>
            <div className="separator_container">
              <div className="separator_line" />
              <span className="separator_text">Or use a third-party</span>
            </div>
            <button type="button" className="social_btn" onClick={handleGoogleLogin}>
              <GoogleIcon />
              Sign in with Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}
