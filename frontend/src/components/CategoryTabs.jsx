import { useCallback } from 'react'

export default function CategoryTabs({
  categories,
  activeCategoryId,
  loading,
  onSelect,
  onEditCategory,
}) {
  const handleTabClick = useCallback(
    (e) => {
      const btn = e.target.closest('.category_tab')
      if (!btn) return
      const id = parseInt(btn.dataset.categoryId, 10)
      if (!isNaN(id)) onSelect(id)
    },
    [onSelect]
  )

  const handleEditClick = useCallback(
    (e) => {
      e.stopPropagation()
      const btn = e.target.closest('.category_edit_btn')
      if (!btn) return
      const id = btn.dataset.categoryId
      const name = btn.dataset.categoryName
      onEditCategory(parseInt(id, 10), name)
    },
    [onEditCategory]
  )

  return (
    <nav className="category_tabs" id="category_tabs" onClick={handleTabClick}>
      {loading && (
        <div
          className="m_search_loader"
          id="category_tabs_loader"
          style={{ width: 24, height: 24, display: 'inline-block', marginLeft: 20 }}
        />
      )}
      {categories.map((cat) => (
        <div
          key={cat.id}
          className={`category_tab_wrapper${cat.id === activeCategoryId ? ' active' : ''}`}
          data-category-id={cat.id}
        >
          <button
            type="button"
            className={`category_tab${cat.id === activeCategoryId ? ' active' : ''}`}
            data-category-id={cat.id}
          >
            {cat.name}
          </button>
          <button
            type="button"
            className="category_edit_btn"
            data-category-id={cat.id}
            data-category-name={cat.name}
            onClick={handleEditClick}
            aria-label={`Edit ${cat.name}`}
          >
            <i className="nf nf-fa-pencil" />
          </button>
        </div>
      ))}
    </nav>
  )
}
