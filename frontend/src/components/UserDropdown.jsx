import { logout } from '../api/allauth'
import { clearTokens } from '../api/client'

export default function UserDropdown({
  user,
  onClose,
  onOpenShare,
  onOpenImport,
  onExport,
}) {
  function handleShare(e) {
    e.preventDefault()
    e.stopPropagation()
    onClose()
    onOpenShare()
  }

  function handleImport(e) {
    e.preventDefault()
    e.stopPropagation()
    onClose()
    onOpenImport()
  }

  function handleExport(e) {
    e.preventDefault()
    e.stopPropagation()
    onClose()
    onExport()
  }

  async function handleLogout() {
    try {
      await logout()
    } catch { /* best effort */ }
    clearTokens()
    window.location.href = '/account/login'
  }

  return (
    <div className="user_dropdown_menu open" id="user_dropdown_menu" role="menu">
      <div className="user_dropdown_header">
        {user.avatarUrl ? (
          <img
            className="user_dropdown_avatar_img"
            src={user.avatarUrl}
            alt={user.displayName}
            referrerPolicy="no-referrer"
            style={{
              borderRadius: '50%',
              width: 40,
              height: 40,
              objectFit: 'cover',
            }}
          />
        ) : (
          <i className="nf nf-fa-circle_user user_dropdown_avatar_icon" />
        )}
        <div className="user_dropdown_info">
          <span className="user_dropdown_name">{user.displayName}</span>
          <span className="user_dropdown_sub">{user.email}</span>
        </div>
      </div>

      <div className="user_dropdown_divider" />

      <div className="user_dropdown_body">
        <button
          type="button"
          className="user_dropdown_item"
          id="share_btn"
          role="menuitem"
          onClick={handleShare}
        >
          <i className="nf nf-md-share_all" />
          <span>Share</span>
        </button>

        <button
          type="button"
          className="user_dropdown_item"
          id="import_btn"
          role="menuitem"
          onClick={handleImport}
        >
          <i className="nf nf-fae-file_import" />
          <span>Import</span>
        </button>

        <button
          type="button"
          className="user_dropdown_item"
          id="export_btn"
          role="menuitem"
          onClick={handleExport}
        >
          <i className="nf nf-fae-file_export" />
          <span>Export</span>
        </button>

        <div className="user_dropdown_divider" />

        <a
          href="/account/settings"
          className="user_dropdown_item"
          role="menuitem"
          style={{ textDecoration: 'none' }}
        >
          <i className="nf nf-fa-cog" />
          <span>Settings</span>
        </a>

        <button
          type="button"
          className="user_dropdown_item"
          role="menuitem"
          onClick={handleLogout}
        >
          <i className="nf nf-md-logout" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
