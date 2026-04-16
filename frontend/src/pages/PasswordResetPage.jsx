import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/allauth'

export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors([])
    setLoading(true)

    try {
      const resp = await requestPasswordReset(email)
      if (resp.status === 200) {
        setSent(true)
      } else if (resp.errors) {
        setErrors(resp.errors.map(e => e.message))
      }
    } catch {
      setErrors(['Network error. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth_container">
        <div className="brand_title">
          <img src="/logo.png" alt="Logo" />
          AniListShare
        </div>
        <div className="auth_card">
          <div className="auth_header">
            <h1>Check Your Email</h1>
            <p>We have sent you an email with a link to reset your password.</p>
          </div>
          <Link to="/account/login" className="auth_btn" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth_container">
      <div className="brand_title">
        <img src="/logo.png" alt="Logo" />
        AniListShare
      </div>
      <div className="auth_card">
        <div className="auth_header">
          <h1>Password Reset</h1>
          <p>Forgotten your password? Enter your email address below, and we'll send you an email allowing you to reset it.</p>
        </div>

        <form className="auth_form" id="password_reset_form" onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <ul className="errorlist">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}

          <div className="form_group">
            <input
              className="form_input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button className="auth_btn" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Reset My Password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Please contact us if you have any trouble resetting your password.
        </p>
      </div>
    </div>
  )
}
