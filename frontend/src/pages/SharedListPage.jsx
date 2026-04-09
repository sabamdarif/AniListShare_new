import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import useIsMobile from '../hooks/useIsMobile'
import AnimeList from '../components/AnimeList'
import SeasonCommentPopup from '../components/SeasonCommentPopup'
import { normalizeAnime } from '../lib/animeUtils'
import { useToast } from '../components/Toast'
import { apiFetch, getAccessToken } from '../api/client'

export default function SharedListPage() {
  const { token } = useParams()
  const isMobile = useIsMobile()
  const showToast = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCatIdx, setActiveCatIdx] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copying, setCopying] = useState(false)
  const dropdownRef = useRef(null)

  const isAuthenticated = !!getAccessToken()

  useEffect(() => {
    if (!token) {
      setError('Invalid share link')
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        const res = await fetch(`/api/share/data/${token}/`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        if (res.status === 404) {
          setError('This shared list was not found or has been disabled.')
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch {
        setError('Failed to load shared list.')
      }
      setLoading(false)
    }

    fetchData()
  }, [token])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const categories = Array.isArray(data) ? data : (data?.categories || [])
  const currentCat = categories[activeCatIdx] || null
  const currentAnimeList = currentCat?.animes || []

  // Filter by search query
  const filteredList = searchQuery
    ? currentAnimeList.filter(a =>
        (a.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentAnimeList

  const normalizedList = filteredList.map(normalizeAnime)

  // Owner info (API doesn't return owner, so show generic)
  const ownerName = data?.owner?.username || data?.owner_name || 'User'

  const handleCopyList = useCallback(async () => {
    if (copying) return
    setCopying(true)
    try {
      const res = await apiFetch(`/share/copy/${token}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await res.json()
      if (res.ok) {
        showToast(result.detail || 'List copied successfully!')
      } else {
        showToast(result.detail || 'Failed to copy list.')
      }
    } catch {
      showToast('A network error occurred while copying the list.')
    }
    setCopying(false)
  }, [token, copying, showToast])

  const handleCopyLoginRedirect = useCallback(() => {
    sessionStorage.setItem('pending_share_copy', token)
    window.location.href = `/account/login?next=/share/${token}/`
  }, [token])

  // Auto-copy after login redirect
  useEffect(() => {
    if (isAuthenticated && sessionStorage.getItem('pending_share_copy') === token) {
      sessionStorage.removeItem('pending_share_copy')
      setTimeout(handleCopyList, 500)
    }
  }, [isAuthenticated, token, handleCopyList])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span className="btn_spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth_container">
        <div className="auth_card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text)', marginBottom: 12 }}>Shared List</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <a href="/account/login" className="auth_btn" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none', textAlign: 'center' }}>
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <SeasonCommentPopup />
      <div className="sticky_header">
        <header>
          <div className="header_content" id="header_title_section">
            <img src="/logo.png" alt="AniListShare-logo" id="header_web_logo" />
            <h2 id="header_web_title">AniListShare</h2>
          </div>

          <div className="header_content" id="header_search_section">
            <i className="nf nf-seti-search" />
            <input
              type="search"
              placeholder="search anime..."
              id="shared_search_input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="header_content" id="header_action_buttons">
            <button
              type="button"
              className="m_header_search_btn"
              id="m_search_btn"
              aria-label="Search"
              onClick={() => setMobileSearchOpen(prev => !prev)}
            >
              <i className="nf nf-seti-search" />
            </button>
            <div className="shared_owner_badge_wrapper" id="shared_dropdown_wrapper" ref={dropdownRef}>
              <div
                className="shared_owner_badge"
                id="shared_dropdown_btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setDropdownOpen(prev => !prev)
                }}
              >
                <i className="nf nf-fa-user" />
                <span>{ownerName}&apos;s List</span>
                <i className="nf nf-fa-caret_down" style={{ fontSize: '0.7rem', marginLeft: 4 }} />
              </div>

              <div className={`shared_dropdown_menu${dropdownOpen ? ' show' : ''}`} id="shared_dropdown_menu">
                {isAuthenticated ? (
                  <>
                    <button
                      className={`shared_dropdown_item${copying ? ' loading' : ''}`}
                      id="copy_list_btn"
                      onClick={handleCopyList}
                    >
                      <i className={`nf ${copying ? 'nf-fa-spinner' : 'nf-fa-copy'}`} />
                      {copying ? 'Copying...' : 'Copy this list'}
                    </button>
                    <a href="/" className="shared_dropdown_item" style={{ textDecoration: 'none' }}>
                      <i className="nf nf-fa-home" />
                      Return to your list
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      className="shared_dropdown_item"
                      id="copy_list_login_btn"
                      onClick={handleCopyLoginRedirect}
                    >
                      <i className="nf nf-fa-copy" />
                      Copy this list
                    </button>
                    <a href={`/account/login?next=/share/${token}/`} className="shared_dropdown_item" style={{ textDecoration: 'none' }}>
                      <i className="nf nf-fa-sign_in" />
                      Login
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Category tabs */}
        <nav className="category_tabs" id="category_tabs">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className={`category_tab_wrapper${idx === activeCatIdx ? ' active' : ''}`}
            >
              <button
                type="button"
                className={`category_tab${idx === activeCatIdx ? ' active' : ''}`}
                onClick={() => setActiveCatIdx(idx)}
              >
                {cat.name}
              </button>
            </div>
          ))}
        </nav>
      </div>

      <main className="anime_table_wrapper">
        <AnimeList
          animeList={normalizedList}
          loading={false}
          categoryId={currentCat?.id || 'shared'}
          isMobile={isMobile}
          showEditColumn={false}
        />
      </main>

      {/* Mobile search panel */}
      <div className={`m_search_panel${mobileSearchOpen ? ' m_search_visible' : ''}`}>
        <div className="m_search_header">
          <button
            type="button"
            className="m_search_back"
            onClick={() => setMobileSearchOpen(false)}
          >
            <i className="nf nf-cod-arrow_left" />
          </button>
          <input
            type="search"
            className="m_search_input"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus={mobileSearchOpen}
          />
        </div>
        {searchQuery && filteredList.length === 0 && (
          <div className="m_search_empty">No results found</div>
        )}
        {searchQuery && filteredList.length > 0 && (
          <div className="m_search_results">
            {filteredList.slice(0, 20).map((anime, i) => (
              <div key={anime.id || i} className="m_search_item">
                <div className="m_search_item_thumb">
                  {anime.thumbnail_url ? (
                    <img src={anime.thumbnail_url} alt="" />
                  ) : (
                    <i className="nf nf-md-movie_open" />
                  )}
                </div>
                <div className="m_search_item_info">
                  <span className="m_search_item_name">{anime.name}</span>
                  <span className="m_search_item_category">{currentCat?.name || ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
