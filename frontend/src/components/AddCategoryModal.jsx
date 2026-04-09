import { useState, useEffect, useRef } from 'react'
import { useCreateCategory } from '../hooks/useCategories'

export default function AddCategoryModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const createMutation = useCreateCategory()
  const inputRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    function handleEscape(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  useEffect(() => {
    const overlay = overlayRef.current
    if (overlay) {
      overlay.style.display = 'flex'
      requestAnimationFrame(() => overlay.classList.add('acm_visible'))
    }
  }, [])

  function handleClose() {
    const overlay = overlayRef.current
    if (overlay) {
      overlay.classList.remove('acm_visible')
      setTimeout(onClose, 250)
    } else {
      onClose()
    }
  }

  async function handleSave() {
    setError('')
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      inputRef.current?.focus()
      return
    }

    try {
      const newCat = await createMutation.mutateAsync(trimmed)
      handleClose()
      if (onCreated) onCreated(newCat)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div
      className="acm_overlay"
      ref={overlayRef}
      style={{ display: 'flex' }}
      onClick={(e) => e.target === overlayRef.current && handleClose()}
    >
      <div className="acm_card">
        <div className="acm_header">
          <span className="acm_title">Add New Category</span>
          <button className="acm_close_btn" aria-label="Close" onClick={handleClose}>
            &times;
          </button>
        </div>
        <div className="acm_body">
          <div className="acm_section">
            <label className="acm_label" htmlFor="acm_name_input">Category Name</label>
            <input
              className="acm_name_input"
              id="acm_name_input"
              type="text"
              placeholder="e.g., Favorites, Winter 2024"
              autoComplete="off"
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <div className="acm_footer">
          <span className="acm_error">{error}</span>
          <button className="acm_cancel_btn" onClick={handleClose}>Cancel</button>
          <button
            className={`acm_save_btn${createMutation.isPending ? ' btn_loading' : ''}`}
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <><span className="btn_spinner" /> Saving…</>
            ) : (
              'Add Category'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
