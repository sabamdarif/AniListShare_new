import { useState, useEffect, useRef } from 'react'

export default function MobileFAB({ hasCategories, onAddCategory, onAddAnime }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  function handleAddCategory() {
    setOpen(false)
    onAddCategory()
  }

  function handleAddAnime() {
    setOpen(false)
    onAddAnime()
  }

  return (
    <div
      className={`m_fab_container${open ? ' m_fab_open' : ''}`}
      id="m_fab_container"
      ref={containerRef}
    >
      <button
        type="button"
        className="m_fab_option"
        id="m_fab_add_category"
        aria-label="Add Category"
        onClick={handleAddCategory}
      >
        <i className="nf nf-oct-plus" /> Category
      </button>
      <button
        type="button"
        className={`m_fab_option${!hasCategories ? ' m_fab_option_disabled' : ''}`}
        id="m_fab_add_anime"
        aria-label="Add Anime"
        onClick={handleAddAnime}
      >
        <i className="nf nf-oct-plus" /> Add Anime
      </button>
      <button
        type="button"
        className="m_fab_main"
        id="m_fab_main_btn"
        aria-label="Actions"
        onClick={() => setOpen(prev => !prev)}
      >
        <i className="nf nf-oct-plus" />
      </button>
    </div>
  )
}
