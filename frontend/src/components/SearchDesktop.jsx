import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../api/client'

let searchIndex = null
let indexLoading = false

export default function SearchDesktop({ navigateToAnime }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef(null)
  const sugRef = useRef(null)
  const debounceRef = useRef(null)

  const loadIndex = useCallback(async () => {
    if (searchIndex || indexLoading) return
    indexLoading = true
    setLoading(true)
    try {
      const res = await apiFetch('/anime/search/')
      if (res.ok) {
        searchIndex = await res.json()
      }
    } catch { /* ignore */ }
    indexLoading = false
    setLoading(false)
  }, [])

  function handleFocus() {
    loadIndex()
  }

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.trim().length < 1) {
      setResults([])
      setActiveIdx(-1)
      return
    }
    debounceRef.current = setTimeout(() => search(q.trim()), 200)
  }

  function search(q) {
    if (!searchIndex) return
    const items = Array.isArray(searchIndex) ? searchIndex : searchIndex.results || []
    const ql = q.toLowerCase()
    const matches = []
    for (const item of items) {
      if (matches.length >= 15) break
      if (item.name && item.name.toLowerCase().indexOf(ql) !== -1) {
        matches.push(item)
      }
    }
    setResults(matches)
    setActiveIdx(-1)
  }

  function handleSelect(item) {
    setQuery('')
    setResults([])
    navigateToAnime?.(item.category_id, item.id)
  }

  function handleKeyDown(e) {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    } else if (e.key === 'Escape') {
      setResults([])
      setActiveIdx(-1)
    }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('#header_search_section')) {
        setResults([])
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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
      <i className="nf nf-seti-search" />
      <input
        type="search"
        placeholder="search anime from any category..."
        ref={inputRef}
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />
      <div className={`search_loader${loading ? ' search_loading' : ''}`} id="search_loader" />
      {results.length > 0 && (
        <div id="search_suggestions" className="search_open" ref={sugRef}>
          {results.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className={`search_item${i === activeIdx ? ' search_active' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {item.thumbnail_url ? (
                <img className="search_item_thumb" src={item.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <div className="search_item_thumb" />
              )}
              <div className="search_item_info">
                <div className="search_item_name">
                  {highlightMatch(item.name, query.trim())}
                </div>
                {item.category_name && (
                  <div className="search_item_category">{item.category_name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && query.trim() && !loading && (
        <div id="search_suggestions" className="search_open">
          <div className="search_empty">No results for "{query.trim()}"</div>
        </div>
      )}
    </>
  )
}

export function invalidateSearchIndex() {
  searchIndex = null
}
