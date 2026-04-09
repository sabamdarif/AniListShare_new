import { useNavigate } from 'react-router-dom'
import { useAuthInfo } from '../auth/hooks'
import { logout } from '../api/allauth'
import { clearTokens } from '../api/client'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthInfo()

  async function handleLogout() {
    try {
      await logout()
    } catch { /* best effort */ }
    clearTokens()
    navigate('/account/login', { replace: true })
  }

  return (
    <div className="settings_wrapper">
      <h1 className="settings_main_title">Account Settings</h1>

      <div className="settings_section">
        <h2 className="settings_section_title">Security</h2>
        <div className="settings_card">
          <a href="/account/password/change" className="settings_btn settings_btn_outline_accent">
            Change Password
          </a>
          <a href="/account/email" className="settings_btn settings_btn_outline_accent">
            Manage Emails
          </a>
        </div>
      </div>

      <div className="settings_section">
        <h2 className="settings_section_title danger_text">
          <i className="nf nf-fa-warning" /> Danger Zone
        </h2>
        <div className="settings_card danger_card">
          <a href="/account/delete" className="settings_btn settings_btn_danger">
            Delete Account
          </a>
        </div>
      </div>

      <div className="settings_section">
        <h2 className="settings_section_title">Session</h2>
        <div className="settings_card">
          <button type="button" className="settings_btn settings_btn_outline_accent" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
