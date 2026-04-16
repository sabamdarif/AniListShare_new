import { useState, useEffect, useRef } from 'react'
import { useUpdateCategory, useDeleteCategory } from '../hooks/useCategories'

export default function EditCategoryModal({
  categoryId,
  currentName,
  activeCategoryId,
  onClose,
}) {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState('')
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  const inputRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    function handleEscape(e) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

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
      await updateMutation.mutateAsync({ id: categoryId, name: trimmed })
      handleClose()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this category and all its anime?')) return
    setError('')

    try {
      await deleteMutation.mutateAsync(categoryId)
      try {
        if (String(activeCategoryId) === String(categoryId)) {
          localStorage.removeItem('active_category')
        }
      } catch { /* best effort */ }
      handleClose()
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

  const busy = updateMutation.isPending || deleteMutation.isPending

  return (
    <div
      className="acm_overlay"
      ref={overlayRef}
      style={{ display: 'flex' }}
      onClick={(e) => e.target === overlayRef.current && handleClose()}
    >
      <div className="acm_card">
        <div className="acm_header">
          <span className="acm_title">Edit Category</span>
          <button className="acm_close_btn ecm_close_btn" aria-label="Close" onClick={handleClose}>
            &times;
          </button>
        </div>
        <div className="acm_body">
          <div className="acm_section">
            <label className="acm_label" htmlFor="ecm_name_input">Category Name</label>
            <input
              className="acm_name_input"
              id="ecm_name_input"
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
        <div className="acm_footer" style={{ justifyContent: 'space-between' }}>
          <button
            className={`acm_cancel_btn ecm_delete_btn${deleteMutation.isPending ? ' btn_loading' : ''}`}
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'transparent' }}
            onClick={handleDelete}
            disabled={busy}
          >
            {deleteMutation.isPending ? (
              <><span className="btn_spinner" /> Deleting…</>
            ) : (
              'Delete'
            )}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="acm_error ecm_error">{error}</span>
            <button className="acm_cancel_btn ecm_cancel_btn" onClick={handleClose}>Cancel</button>
            <button
              className={`acm_save_btn ecm_save_btn${updateMutation.isPending ? ' btn_loading' : ''}`}
              onClick={handleSave}
              disabled={busy}
            >
              {updateMutation.isPending ? (
                <><span className="btn_spinner" /> Saving…</>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
