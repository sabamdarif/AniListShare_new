import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../api/client'

let searchIndex = null
let indexLoading = false

export default function SearchMobile({ open, onClose, navigateToAnime }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (open) {
      loadIndex()
      // Lock body scroll when panel is open
      document.body.style.overflow = 'hidden'
      setTimeout(() => inputRef.current?.focus(), 350)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const loadIndex = useCallback(async () => {
    if (searchIndex || indexLoading) return
    indexLoading = true
    setLoading(true)
    try {
      const res = await apiFetch('/anime/search/')
      if (res.ok) searchIndex = await res.json()
    } catch { /* ignore */ }
    indexLoading = false
    setLoading(false)
  }, [])

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.trim().length < 1) { setResults([]); return }
    debounceRef.current = setTimeout(() => search(q.trim()), 200)
  }

  function search(q) {
    if (!searchIndex) return
    const items = Array.isArray(searchIndex) ? searchIndex : searchIndex.results || []
    const ql = q.toLowerCase()
    const matches = []
    for (const item of items) {
      if (matches.length >= 15) break
      if (item.name && item.name.toLowerCase().indexOf(ql) !== -1) matches.push(item)
    }
    setResults(matches)
  }

  function handleSelect(item) {
    setQuery('')
    setResults([])
    onClose?.()
    navigateToAnime?.(item.category_id, item.id)
  }

  function handleClose() {
    setQuery('')
    setResults([])
    onClose?.()
  }

  function highlightMatch(name, q) {
    if (!q) return name
    const idx = name.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return name
    return (
      <>
        {name.slice(0, idx)}
        <mark>{name.slice(idx, idx + q.length)}</mark>
        {name.slice(idx + q.length)}
      </>
    )
  }

  return (
    <>
      <div
        className={`m_search_overlay${open ? ' m_search_visible' : ''}`}
        id="m_search_overlay"
        onClick={handleClose}
      />
      <div
        className={`m_search_panel${open ? ' m_search_visible' : ''}`}
        id="m_search_panel"
        ref={panelRef}
      >
        <div className="m_search_handle" />
        <div className="m_search_bar">
          <input
            type="search"
            placeholder="search anime from any category..."
            ref={inputRef}
            value={query}
            onChange={handleInput}
          />
          <button type="button" className="m_search_cancel" onClick={handleClose}>
            Cancel
          </button>
        </div>
        <div className={`m_search_loader${loading ? ' search_loading' : ''}`} />
        <div className="m_search_results">
          {results.length === 0 && !query && (
            <div className="m_search_hint">Type to search across all categories</div>
          )}
          {results.length === 0 && query && !loading && (
            <div className="m_search_empty">No results for &quot;{query.trim()}&quot;</div>
          )}
          {results.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="m_search_item"
              onClick={() => handleSelect(item)}
            >
              {item.thumbnail_url ? (
                <img className="m_search_item_thumb" src={item.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <div className="m_search_item_thumb" />
              )}
              <div className="m_search_item_info">
                <div className="m_search_item_name">
                  {highlightMatch(item.name, query.trim())}
                </div>
                {item.category_name && (
                  <div className="m_search_item_category">{item.category_name}</div>
                )}
              </div>
              <span className="m_search_item_arrow">
                <i className="nf nf-cod-arrow_right" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function invalidateMobileSearchIndex() {
  searchIndex = null
}
