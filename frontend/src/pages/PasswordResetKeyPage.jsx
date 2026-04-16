import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { resetPassword } from '../api/allauth'

export default function PasswordResetKeyPage() {
  const { key } = useParams()
  const navigate = useNavigate()
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [errors, setErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors([])
    setFieldErrors({})

    if (password1 !== password2) {
      setErrors(['Passwords do not match.'])
      return
    }

    setLoading(true)
    try {
      const resp = await resetPassword({ key, password: password1 })
      if (resp.status === 200) {
        setSuccess(true)
        setTimeout(() => navigate('/account/login', { replace: true }), 2000)
      } else if (resp.errors) {
        const ge = []
        const fe = {}
        resp.errors.forEach(err => {
          if (err.param) {
            fe[err.param] = fe[err.param] || []
            fe[err.param].push(err.message)
          } else {
            ge.push(err.message)
          }
        })
        setErrors(ge)
        setFieldErrors(fe)
      }
    } catch {
      setErrors(['Network error. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth_container">
        <div className="brand_title">
          <img src="/logo.png" alt="Logo" />
          AniListShare
        </div>
        <div className="auth_card">
          <div className="auth_header">
            <h1>Password Reset</h1>
            <p style={{ color: 'var(--accent)' }}>
              ✓ Password changed successfully! Redirecting to login…
            </p>
          </div>
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
          <h1>Set New Password</h1>
          <p>Enter your new password below.</p>
        </div>

        <form className="auth_form" id="password_reset_key_form" onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <ul className="errorlist">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}

          <div className="form_group">
            <input
              className="form_input"
              type="password"
              placeholder="New password"
              value={password1}
              onChange={e => setPassword1(e.target.value)}
              autoComplete="new-password"
              required
            />
            {fieldErrors.password && (
              <ul className="errorlist">{fieldErrors.password.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </div>

          <div className="form_group">
            <input
              className="form_input"
              type="password"
              placeholder="Confirm new password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button className="auth_btn" type="submit" disabled={loading}>
            {loading ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
