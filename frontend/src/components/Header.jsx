import { useState, useCallback, useRef, useEffect } from 'react'
import UserDropdown from './UserDropdown'
import SearchDesktop from './SearchDesktop'

export default function Header({
  user,
  hasCategories,
  onAddCategory,
  onAddAnime,
  onOpenSearch,
  onOpenShare,
  onOpenImport,
  onExport,
  navigateToAnime,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const wrapperRef = useRef(null)

  const toggleDropdown = useCallback(() => {
    setDropdownOpen(prev => !prev)
  }, [])

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const avatarUrl = user?.picture || null
  const displayName = user?.display || user?.username || ''
  const email = user?.email || ''

  return (
    <header>
      <div className="header_content" id="header_title_section">
        <img src="/logo.png" alt="AniListShare-logo" id="header_web_logo" />
        <h2 id="header_web_title">AniListShare</h2>
      </div>

      <div className="header_content" id="header_search_section">
        <SearchDesktop navigateToAnime={navigateToAnime} />
      </div>

      <div className="header_content" id="header_action_buttons">
        <button
          type="button"
          className="header_action_buttons btn_category"
          onClick={onAddCategory}
        >
          <i className="nf nf-fa-folder_plus" />
          Category
        </button>
        <button
          type="button"
          className={`header_action_buttons btn_add_anime${!hasCategories ? ' btn_add_anime_disabled' : ''}`}
          onClick={onAddAnime}
        >
          <i className="nf nf-oct-plus" />
          Add Anime
        </button>
        <button
          type="button"
          className="m_header_search_btn"
          id="m_search_btn"
          aria-label="Search"
          onClick={onOpenSearch}
        >
          <i className="nf nf-seti-search" />
        </button>

        <div className="user_profile_wrapper" id="user_profile_wrapper" ref={wrapperRef}>
          <button
            type="button"
            id="user_profile_btn"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            onClick={toggleDropdown}
          >
            {avatarUrl ? (
              <img
                id="user_profile_icon"
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
              />
            ) : (
              <i className="nf nf-fa-circle_user" />
            )}
            <span className="export_ring">
              <svg viewBox="0 0 40 40">
                <circle className="export_ring_track" cx="20" cy="20" r="18" />
                <circle className="export_ring_fill" cx="20" cy="20" r="18" />
              </svg>
            </span>
          </button>

          {dropdownOpen && (
            <UserDropdown
              user={{ displayName, email, avatarUrl }}
              onClose={closeDropdown}
              onOpenShare={onOpenShare}
              onOpenImport={onOpenImport}
              onExport={onExport}
            />
          )}
        </div>
      </div>
    </header>
  )
}
