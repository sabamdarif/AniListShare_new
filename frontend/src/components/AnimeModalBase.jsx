import { useState, useEffect, useRef, useCallback } from 'react'
import { sanitizeUrl } from '../lib/animeUtils'

const JIKAN = 'https://api.jikan.moe/v4/anime'
const LANG_PRESETS = [
  'Japanese', 'English', 'Spanish', 'Hindi', 'French',
  'German', 'Korean', 'Chinese', 'Portuguese', 'Italian',
]

function bestMatchName(item, query) {
  const jp = item.title || ''
  const en = item.title_english || ''
  const ql = query.toLowerCase()
  const jpMatch = jp && jp.toLowerCase().includes(ql)
  const enMatch = en && en.toLowerCase().includes(ql)
  if (jpMatch && !enMatch) return jp
  if (enMatch && !jpMatch) return en
  return en || jp
}

export default function AnimeModalBase({
  title = 'Anime',
  saveBtnText = 'Save',
  showDeleteBtn = false,
  onSave,
  onDelete,
  onClose,
  prefill = null,
  categories = [],
  activeCategoryId = null,
}) {
  const overlayRef = useRef(null)
  const nameInputRef = useRef(null)
  const langInputRef = useRef(null)
  const langDropRef = useRef(null)
  const bodyRef = useRef(null)
  const debounceRef = useRef(null)

  const [selectedName, setSelectedName] = useState('')
  const [, setSelected] = useState(null)
  const [rating, setRating] = useState(0)
  const [entries, setEntries] = useState([])
  const [languages, setLanguages] = useState([])
  const [editingAnimeId, setEditingAnimeId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [categoryId, setCategoryId] = useState('')

  const [thumbSrc, setThumbSrc] = useState('')
  const [thumbVisible, setThumbVisible] = useState(false)
  const [editUrlBtnVisible, setEditUrlBtnVisible] = useState(false)
  const [urlEditorOpen, setUrlEditorOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const [suggestions, setSuggestions] = useState([])
  const [searchSpinner, setSearchSpinner] = useState(false)
  const [langDropItems, setLangDropItems] = useState([])
  const [langDropVisible, setLangDropVisible] = useState(false)
  const [langQuery, setLangQuery] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Initialize from prefill
  useEffect(() => {
    if (prefill) {
      setEditingAnimeId(prefill.id || prefill.temp_id || null)
      setEditingCategoryId(prefill._categoryId || null)
      setSelectedName(prefill.name || '')
      setSelected({ name: prefill.name, image: prefill.thumbnail_url })
      if (nameInputRef.current) nameInputRef.current.value = prefill.name || ''

      const safeImg = sanitizeUrl(prefill.thumbnail_url)
      if (safeImg) {
        setThumbSrc(safeImg)
        setThumbVisible(true)
        setUrlValue(safeImg)
        setEditUrlBtnVisible(true)
      }

      if (prefill._categoryId) {
        setCategoryId(String(prefill._categoryId))
      }

      setRating(prefill.stars || 0)

      if (prefill.seasons && prefill.seasons.length > 0) {
        const sorted = [...prefill.seasons].sort(
          (a, b) => (Number(a.number) || 1) - (Number(b.number) || 1)
        )
        const newEntries = sorted.map(s => {
          const num = Number(s.number) || 1
          const isOva = num % 1 !== 0
          return {
            type: isOva ? 'ova' : 'season',
            number: num,
            total: s.total_episodes != null ? s.total_episodes : s.total || 0,
            watched: s.watched_episodes != null ? s.watched_episodes : s.watched || 0,
            comment: s.comment || '',
          }
        })
        setEntries(newEntries)
      } else {
        setEntries([{ type: 'season', number: 1, total: 0, watched: 0, comment: '' }])
      }

      if (prefill.language) {
        setLanguages(
          prefill.language.split(',').map(l => l.trim()).filter(Boolean)
        )
      }
    } else {
      setCategoryId(activeCategoryId ? String(activeCategoryId) : categories[0]?.id ? String(categories[0].id) : '')
      setEntries([{ type: 'season', number: 1, total: 0, watched: 0, comment: '' }])
    }
  }, []) // Run once on mount

  // Focus name input on open
  useEffect(() => {
    const overlay = overlayRef.current
    if (overlay) {
      overlay.style.display = 'flex'
      requestAnimationFrame(() => overlay.classList.add('aam_visible'))
    }
    nameInputRef.current?.focus()
  }, [])

  const handleClose = useCallback(() => {
    const overlay = overlayRef.current
    if (overlay) {
      overlay.classList.remove('aam_visible')
      setTimeout(onClose, 250)
    } else {
      onClose()
    }
  }, [onClose])

  // Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (suggestions.length > 0) {
          setSuggestions([])
          e.stopPropagation()
        } else {
          handleClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [suggestions.length, handleClose])

  // Click outside suggestions
  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('.aam_name_wrap')) {
        setSuggestions([])
      }
      if (!e.target.closest('.aam_lang_input_wrap') && !e.target.closest('.aam_lang_dropdown')) {
        setLangDropVisible(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // --- Name search (Jikan) ---
  function handleNameInput(e) {
    const q = e.target.value.trim()
    setSelectedName('')
    clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    setSearchSpinner(true)
    debounceRef.current = setTimeout(() => searchJikan(q), 400)
  }

  async function searchJikan(q) {
    try {
      const r = await fetch(`${JIKAN}?q=${encodeURIComponent(q)}&limit=6&sfw=true`)
      const j = await r.json()
      const data = j.data || []
      const currentQuery = nameInputRef.current?.value?.trim() || ''
      setSuggestions(
        data.map(a => ({
          name: bestMatchName(a, currentQuery),
          thumb: sanitizeUrl(a.images?.jpg?.small_image_url || a.images?.jpg?.image_url || ''),
          fullImg: sanitizeUrl(a.images?.jpg?.image_url || ''),
        }))
      )
    } catch {
      setSuggestions([])
    } finally {
      setSearchSpinner(false)
    }
  }

  function pickAnime(name, img) {
    setSelected({ name, image: img })
    setSelectedName(name)
    if (nameInputRef.current) nameInputRef.current.value = name
    setSuggestions([])

    const safeImg = sanitizeUrl(img)
    if (safeImg) {
      setThumbSrc(safeImg)
      setThumbVisible(true)
      setUrlValue(safeImg)
    } else {
      setThumbSrc('')
      setThumbVisible(false)
    }
    setEditUrlBtnVisible(true)
  }

  // --- Thumbnail URL editor ---
  function handleUrlDone() {
    const u = sanitizeUrl(urlValue.trim())
    if (u) {
      setThumbSrc(u)
      setThumbVisible(true)
      setUrlValue(u)
    } else {
      setThumbSrc('')
      setThumbVisible(false)
      setUrlValue('')
    }
    setUrlEditorOpen(false)
  }

  // --- Seasons ---
  function addSeason() {
    setEntries(prev => {
      let maxNum = 0
      prev.forEach(e => {
        if (e.type === 'season') maxNum = Math.max(maxNum, e.number || 1)
      })
      return [...prev, { type: 'season', number: maxNum + 1, total: 0, watched: 0, comment: '' }]
    })
  }

  function addOva() {
    setEntries(prev => [...prev, { type: 'ova', total: 0, watched: 0, comment: '' }])
  }

  function removeEntry(idx) {
    setEntries(prev => prev.filter((_, i) => i !== idx))
  }

  function updateEntry(idx, field, value) {
    setEntries(prev => {
      const next = [...prev]
      const entry = { ...next[idx] }

      if (field === 'watched') {
        const val = Math.max(0, Number(value) || 0)
        if (val > entry.total) {
          if (entry.total === 0) {
            entry.total = val
          } else {
            entry.watched = entry.total
            next[idx] = entry
            return next
          }
        }
        entry.watched = val
      } else if (field === 'total') {
        const val = Math.max(0, Number(value) || 0)
        entry.total = val
        if (entry.watched > val) entry.watched = val
      } else if (field === 'comment') {
        entry.comment = value
      } else if (field === 'number') {
        const val = parseInt(value)
        if (!isNaN(val) && val >= 1 && val <= 100) entry.number = val
      }

      next[idx] = entry
      return next
    })
  }

  // --- Languages ---
  function handleLangInput(e) {
    const q = e.target.value.trim().toLowerCase()
    setLangQuery(e.target.value)
    if (!q) {
      setLangDropVisible(false)
      return
    }
    const available = LANG_PRESETS.filter(
      l => l.toLowerCase().includes(q) && !languages.includes(l)
    )
    let customCap = null
    if (
      !available.some(l => l.toLowerCase() === q) &&
      !languages.some(l => l.toLowerCase() === q)
    ) {
      customCap = q.charAt(0).toUpperCase() + q.slice(1)
    }
    const items = available.map(l => ({ lang: l, isCustom: false }))
    if (customCap) items.push({ lang: customCap, isCustom: true })
    setLangDropItems(items)
    setLangDropVisible(items.length > 0)
  }

  function handleLangKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = langQuery.trim()
      if (v && !languages.some(l => l.toLowerCase() === v.toLowerCase())) {
        setLanguages(prev => [...prev, v.charAt(0).toUpperCase() + v.slice(1)])
      }
      setLangQuery('')
      if (langInputRef.current) langInputRef.current.value = ''
      setLangDropVisible(false)
    }
  }

  function addLang(lang) {
    if (!languages.includes(lang)) {
      setLanguages(prev => [...prev, lang])
    }
    setLangQuery('')
    if (langInputRef.current) langInputRef.current.value = ''
    setLangDropVisible(false)
  }

  function removeLang(idx) {
    setLanguages(prev => prev.filter((_, i) => i !== idx))
  }

  // --- Save ---
  async function handleSave() {
    setError('')
    const name = selectedName || nameInputRef.current?.value?.trim() || ''
    if (!name) { setError('Name is required'); return }
    const catId = categoryId
    if (!catId) { setError('Select a category'); return }

    const seasonEntries = []
    let lastSeasonNum = 0
    let ovaCount = 0

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      if (e.type === 'season') {
        const num = e.number || ++lastSeasonNum
        lastSeasonNum = num
        ovaCount = 0
        if (e.watched > e.total && e.total > 0) {
          setError(`Season ${num}: watched cannot exceed total`)
          return
        }
        seasonEntries.push({
          number: num,
          total_episodes: e.total,
          watched_episodes: e.watched,
          comment: e.comment,
        })
      } else {
        ovaCount++
        const afterSeason = Math.max(lastSeasonNum, 1)
        if (e.watched > e.total && e.total > 0) {
          setError('OVA: watched cannot exceed total')
          return
        }
        seasonEntries.push({
          number: Number((afterSeason + ovaCount * 0.01).toFixed(2)),
          total_episodes: e.total,
          watched_episodes: e.watched,
          comment: e.comment,
        })
      }
    }

    const payload = {
      name,
      thumbnail_url: (thumbVisible ? sanitizeUrl(thumbSrc) : '') || sanitizeUrl(urlValue.trim()) || '',
      language: languages.join(', '),
      stars: rating || null,
      seasons: seasonEntries,
    }

    setSaving(true)
    try {
      await onSave(payload, catId, {
        animeId: editingAnimeId,
        oldCategoryId: editingCategoryId,
        close: handleClose,
      })
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!editingAnimeId) return
    if (!confirm('Are you sure you want to delete this anime?')) return

    setError('')
    setDeleting(true)
    try {
      const catId = editingCategoryId || categoryId
      await onDelete(editingAnimeId, catId, {
        oldCategoryId: editingCategoryId,
        close: handleClose,
      })
    } catch (err) {
      setError(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const busy = saving || deleting

  // Render season entries
  let seasonCounter = 0

  return (
    <div
      className="aam_overlay"
      ref={overlayRef}
      style={{ display: 'flex' }}
      onClick={e => e.target === overlayRef.current && handleClose()}
    >
      <div className="aam_card">
        {/* Header */}
        <div className="aam_header">
          <span className="aam_title">{title}</span>
          <button className="aam_close_btn" aria-label="Close" onClick={handleClose}>×</button>
        </div>

        {/* Body */}
        <div className="aam_body" ref={bodyRef} onScroll={() => setLangDropVisible(false)}>
          {/* Top row: thumbnail + name */}
          <div className="aam_top_row">
            <div className="aam_thumb_area">
              <div className={`aam_thumb_box${!thumbVisible ? ' aam_thumb_empty' : ''}`}>
                <img
                  className="aam_thumb_img"
                  src={thumbSrc}
                  alt=""
                  style={{ display: thumbVisible ? 'block' : 'none' }}
                />
              </div>
              {editUrlBtnVisible && (
                <button
                  className="aam_edit_url_btn"
                  type="button"
                  onClick={() => setUrlEditorOpen(!urlEditorOpen)}
                >
                  Edit Thumbnail URL
                </button>
              )}
              {urlEditorOpen && (
                <div className="aam_url_editor" style={{ display: 'flex' }}>
                  <input
                    className="aam_url_input"
                    type="url"
                    placeholder="Paste image URL…"
                    value={urlValue}
                    onChange={e => setUrlValue(e.target.value)}
                  />
                  <button className="aam_url_done" type="button" onClick={handleUrlDone}>
                    Done
                  </button>
                </div>
              )}
            </div>

            <div className="aam_name_wrap">
              <div className="aam_name_field">
                <input
                  className="aam_name_input"
                  type="text"
                  placeholder="Anime Name"
                  autoComplete="off"
                  ref={nameInputRef}
                  defaultValue={prefill?.name || ''}
                  onInput={handleNameInput}
                  onKeyDown={e => {
                    if (e.key === 'Escape' && suggestions.length > 0) {
                      setSuggestions([])
                      e.stopPropagation()
                    }
                  }}
                />
                {searchSpinner && <span className="aam_search_spinner" style={{ display: 'block' }} />}
              </div>
              {suggestions.length > 0 && (
                <div className="aam_suggestions">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="aam_sug_item"
                      onClick={() => pickAnime(s.name, s.fullImg)}
                    >
                      {s.thumb ? (
                        <img className="aam_sug_thumb" src={s.thumb} alt="" />
                      ) : (
                        <span className="aam_sug_thumb_empty" />
                      )}
                      <span className="aam_sug_name">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="aam_section">
            <select
              className="aam_category_select"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stars */}
          <div className="aam_section">
            <div className="aam_star_row">
              {[1,2,3,4,5,6,7,8,9,10].map(v => (
                <span
                  key={v}
                  className={`aam_star${v <= rating ? ' aam_star_active' : ''}`}
                  data-v={v}
                  onClick={() => setRating(v === rating ? 0 : v)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Seasons */}
          <div className="aam_section">
            <div className="aam_seasons_header">
              <span className="aam_seasons_title">Seasons</span>
            </div>
            <div className="aam_seasons_cols">
              <span>Season / OVA</span>
              <span>Watched / Total</span>
              <span>Comment</span>
            </div>
            <div className="aam_seasons_list">
              {entries.map((entry, i) => {
                const isOva = entry.type === 'ova'
                if (!isOva) seasonCounter++

                return (
                  <SeasonRow
                    key={i}
                    entry={entry}
                    index={i}
                    isOva={isOva}
                    seasonCounter={isOva ? seasonCounter : entry.number || seasonCounter}
                    canRemove={entries.length > 1}
                    onUpdate={updateEntry}
                    onRemove={removeEntry}
                  />
                )
              })}
            </div>
            <div className="aam_season_btns">
              <button className="aam_add_season_btn" type="button" onClick={addSeason}>
                + Add Season
              </button>
              <button className="aam_add_ova_btn" type="button" onClick={addOva}>
                + Add OVA
              </button>
            </div>
          </div>

          {/* Languages */}
          <div className="aam_section">
            <div className="aam_lang_wrap">
              <div className="aam_lang_tags">
                {languages.map((lang, i) => (
                  <span key={i} className="aam_lang_chip">
                    {lang}
                    <button className="aam_lang_chip_x" onClick={() => removeLang(i)}>×</button>
                  </span>
                ))}
              </div>
              <div className="aam_lang_input_wrap">
                <input
                  className="aam_lang_input"
                  type="text"
                  placeholder="Type to add language…"
                  autoComplete="off"
                  ref={langInputRef}
                  value={langQuery}
                  onChange={handleLangInput}
                  onKeyDown={handleLangKeyDown}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`aam_footer${showDeleteBtn ? ' aam_footer_with_delete' : ''}`}>
          {showDeleteBtn && (
            <button
              className={`aam_delete_btn${deleting ? ' btn_loading' : ''}`}
              type="button"
              onClick={handleDelete}
              disabled={busy}
            >
              {deleting ? <><span className="btn_spinner" /> Deleting…</> : 'Delete'}
            </button>
          )}
          <div className="aam_footer_right">
            <span className="aam_error">{error}</span>
            <button
              className={`aam_save_btn${saving ? ' btn_loading' : ''}`}
              onClick={handleSave}
              disabled={busy}
            >
              {saving ? <><span className="btn_spinner" /> Saving…</> : saveBtnText}
            </button>
          </div>
        </div>
      </div>

      {/* Language dropdown - appended to overlay for positioning */}
      {langDropVisible && langDropItems.length > 0 && (
        <div className="aam_lang_dropdown" ref={langDropRef} style={{ display: 'block' }}>
          {langDropItems.map((item, i) => (
            <div
              key={i}
              className={`aam_lang_opt${item.isCustom ? ' aam_lang_custom' : ''}`}
              onClick={() => addLang(item.lang)}
            >
              {item.isCustom ? `Add "${item.lang}"` : item.lang}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Season Row sub-component ---
function SeasonRow({ entry, index, isOva, seasonCounter, canRemove, onUpdate, onRemove }) {
  const [editingNumber, setEditingNumber] = useState(false)
  const numInputRef = useRef(null)

  useEffect(() => {
    if (editingNumber && numInputRef.current) numInputRef.current.focus()
  }, [editingNumber])

  const label = isOva ? 'OVA' : `Season ${entry.number || seasonCounter}`

  function handleDoubleClick() {
    if (isOva) return
    setEditingNumber(true)
  }

  function handleNumberBlur() {
    if (numInputRef.current) {
      onUpdate(index, 'number', numInputRef.current.value)
    }
    setEditingNumber(false)
  }

  return (
    <div className={`aam_season_row${isOva ? ' aam_ova_row' : ''}`} data-idx={index}>
      <span
        className={`aam_season_label${isOva ? ' aam_ova_label' : ''}`}
        title={!isOva ? 'Double-click to edit season number' : undefined}
        style={!isOva ? { cursor: 'pointer' } : undefined}
        onDoubleClick={handleDoubleClick}
      >
        {editingNumber ? (
          <>
            Season{' '}
            <input
              ref={numInputRef}
              className="aam_season_num_input"
              type="number"
              min="1"
              max="100"
              defaultValue={entry.number || seasonCounter}
              style={{
                width: 40, marginLeft: 4, padding: 2,
                border: '1px solid var(--border)', borderRadius: 4,
                background: 'var(--bg)', color: 'var(--text)',
              }}
              onBlur={handleNumberBlur}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); numInputRef.current?.blur() } }}
            />
          </>
        ) : label}
      </span>

      <div className="aam_ep_cell">
        <input
          className="aam_ep_watched"
          type="number"
          min="0"
          value={entry.watched}
          placeholder="0"
          onChange={e => onUpdate(index, 'watched', e.target.value)}
        />
        <span className="aam_ep_slash">/</span>
        <input
          className="aam_ep_total"
          type="number"
          min="0"
          value={entry.total}
          placeholder="0"
          onChange={e => onUpdate(index, 'total', e.target.value)}
        />
      </div>

      <textarea
        className="aam_season_comment"
        placeholder="Enter your thoughts…"
        rows="1"
        value={entry.comment}
        onChange={e => onUpdate(index, 'comment', e.target.value)}
      />

      {canRemove && (
        <button className="aam_season_remove" onClick={() => onRemove(index)}>×</button>
      )}
    </div>
  )
}
