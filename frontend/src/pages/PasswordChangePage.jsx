import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../api/allauth'
import { useToast } from '../components/Toast'

export default function PasswordChangePage() {
  const navigate = useNavigate()
  const showToast = useToast()
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors([])
    setFieldErrors({})

    if (newPass !== confirm) {
      setErrors(['New passwords do not match.'])
      return
    }

    setLoading(true)
    try {
      const resp = await changePassword({ current_password: current, new_password: newPass })
      if (resp.status === 200) {
        showToast('Password changed successfully')
        navigate('/account/settings', { replace: true })
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

  return (
    <div className="auth_container">
      <div className="brand_title">
        <img src="/logo.png" alt="Logo" />
        AniListShare
      </div>
      <div className="auth_card">
        <div className="auth_header">
          <h1>Change Password</h1>
        </div>

        <form className="auth_form" id="password_change_form" onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <ul className="errorlist">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}

          <div className="form_group">
            <input
              className="form_input"
              type="password"
              placeholder="Current password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
            {fieldErrors.current_password && (
              <ul className="errorlist">{fieldErrors.current_password.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </div>

          <div className="form_group">
            <input
              className="form_input"
              type="password"
              placeholder="New password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              autoComplete="new-password"
              required
            />
            {fieldErrors.new_password && (
              <ul className="errorlist">{fieldErrors.new_password.map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </div>

          <div className="form_group">
            <input
              className="form_input"
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button className="auth_btn" type="submit" disabled={loading}>
            {loading ? 'Changing…' : 'Change Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/account/password/reset" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.95rem' }}>
            Forgot Password?
          </a>
        </div>
      </div>
    </div>
  )
}
