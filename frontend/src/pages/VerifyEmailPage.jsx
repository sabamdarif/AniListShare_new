import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { verifyEmail } from '../api/allauth'

export default function VerifyEmailPage() {
  const { key } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState(key ? 'verifying' : 'pending')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!key) return

    async function verify() {
      try {
        const resp = await verifyEmail(key)
        if (resp.status === 200) {
          setStatus('success')
          setTimeout(() => navigate('/account/login', { replace: true }), 2000)
        } else {
          setError(resp.errors?.[0]?.message || 'Verification failed.')
          setStatus('error')
        }
      } catch {
        setError('Network error.')
        setStatus('error')
      }
    }

    verify()
  }, [key, navigate])

  return (
    <div className="auth_container">
      <div className="brand_title">
        <img src="/logo.png" alt="Logo" />
        AniListShare
      </div>
      <div className="auth_card">
        <div className="auth_header">
          <h1>Email Verification</h1>

          {status === 'pending' && (
            <p>
              We have sent an email to your address. Please check your inbox and
              click the verification link to activate your account.
            </p>
          )}

          {status === 'verifying' && (
            <p>
              Verifying your email…
              <br />
              <span className="btn_spinner" style={{ width: 18, height: 18, marginTop: 12, display: 'inline-block' }} />
            </p>
          )}

          {status === 'success' && (
            <p style={{ color: 'var(--accent)' }}>
              ✓ Email verified successfully! Redirecting to login…
            </p>
          )}

          {status === 'error' && (
            <p style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
