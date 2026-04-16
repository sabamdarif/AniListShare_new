import { useState, useCallback } from 'react'
import { useAuthInfo } from '../auth/hooks'
import { useCategories } from '../hooks/useCategories'
import { useAnimeList } from '../hooks/useAnimeList'
import { apiFetch } from '../api/client'
import useIsMobile from '../hooks/useIsMobile'
import Header from '../components/Header'
import CategoryTabs from '../components/CategoryTabs'
import AnimeList from '../components/AnimeList'
import MobileFAB from '../components/MobileFAB'
import SearchMobile from '../components/SearchMobile'
import SeasonCommentPopup from '../components/SeasonCommentPopup'
import AddCategoryModal from '../components/AddCategoryModal'
import EditCategoryModal from '../components/EditCategoryModal'
import AddAnimeModal from '../components/AddAnimeModal'
import EditAnimeModal from '../components/EditAnimeModal'
import ShareModal from '../components/ShareModal'
import ImportModal from '../components/ImportModal'
import { useToast } from '../components/Toast'

export default function HomePage() {
  const { user } = useAuthInfo()
  const isMobile = useIsMobile()
  const showToast = useToast()

  const { data: categories = [], isLoading: categoriesLoading } = useCategories()

  const [activeCategoryId, setActiveCategoryId] = useState(() => {
    try {
      const stored = localStorage.getItem('active_category')
      return stored ? parseInt(stored, 10) : null
    } catch {
      return null
    }
  })

  const effectiveCategoryId =
    activeCategoryId && categories.some(c => c.id === activeCategoryId)
      ? activeCategoryId
      : categories[0]?.id || null

  const { data: animeList = [], isLoading: animeLoading } = useAnimeList(effectiveCategoryId)

  const handleSelectCategory = useCallback((id) => {
    setActiveCategoryId(id)
    try {
      localStorage.setItem('active_category', String(id))
    } catch { /* best effort */ }
  }, [])

  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editCategoryData, setEditCategoryData] = useState(null)
  const [addAnimeOpen, setAddAnimeOpen] = useState(false)
  const [editAnimeData, setEditAnimeData] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const handleAddCategory = useCallback(() => setAddCategoryOpen(true), [])
  const handleAddAnime = useCallback(() => {
    if (categories.length === 0) {
      showToast('Please create a category first')
      return
    }
    setAddAnimeOpen(true)
  }, [categories.length, showToast])

  const handleEditCategory = useCallback((id, name) => {
    setEditCategoryData({ id, name })
  }, [])

  const handleEditAnime = useCallback((animeData, categoryId) => {
    setEditAnimeData({ ...animeData, _categoryId: categoryId })
  }, [])

  const handleExport = useCallback(async () => {
    const CIRCUMFERENCE = 113 // 2*π*18
    const profileBtn = document.getElementById('user_profile_btn')
    const ringFill = document.querySelector('.export_ring_fill')

    function setExportProgress(pct) {
      if (!ringFill) return
      const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE
      ringFill.style.strokeDashoffset = offset
    }

    function formatSeasons(seasons) {
      if (!seasons || !seasons.length) return ''
      return seasons.map(s => {
        let label
        if (s.number % 1 !== 0) {
          const after = Math.floor(s.number)
          label = `OVA(after S${after})`
        } else {
          label = `S${Math.floor(s.number)}`
        }
        let text = `${label}: ${s.watched_episodes}/${s.total_episodes}`
        if (s.comment) text += ` [${s.comment}]`
        return text
      }).join(', ')
    }

    if (profileBtn) profileBtn.classList.add('exporting')
    setExportProgress(0)

    try {
      const XLSX = await import('xlsx')

      // Fetch categories
      const catRes = await apiFetch('/anime/category/')
      if (!catRes.ok) throw new Error('Failed to fetch categories')
      let cats = await catRes.json()
      if (!Array.isArray(cats)) cats = cats.results || []
      if (cats.length === 0) throw new Error('No categories to export')

      const wb = XLSX.utils.book_new()

      for (let i = 0; i < cats.length; i++) {
        const cat = cats[i]
        const animeRes = await apiFetch(`/anime/list/category/${cat.id}/`)
        if (!animeRes.ok) throw new Error('Failed to fetch anime')
        let animeList = await animeRes.json()
        if (!Array.isArray(animeList)) animeList = animeList.results || []

        const sheetData = [['Name', 'Season', 'Language', 'Stars', 'Thumbnail URL']]
        for (const a of animeList) {
          sheetData.push([
            a.name || '',
            formatSeasons(a.seasons),
            a.language || '',
            a.stars != null ? a.stars : '',
            a.thumbnail_url || '',
          ])
        }

        const ws = XLSX.utils.aoa_to_sheet(sheetData)
        ws['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 12 }, { wch: 6 }, { wch: 50 }]

        const sheetName = cat.name.replace(/[\\/?*[\]]/g, '_').substring(0, 31)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)

        setExportProgress(((i + 1) / cats.length) * 100)
      }

      XLSX.writeFile(wb, 'animelist.ods', { bookType: 'ods' })

      if (profileBtn) {
        profileBtn.classList.remove('exporting')
        profileBtn.classList.add('export_done')
        setTimeout(() => profileBtn.classList.remove('export_done'), 600)
      }
      showToast('Export complete!')
    } catch (e) {
      if (profileBtn) profileBtn.classList.remove('exporting')
      setExportProgress(0)
      showToast('Export failed: ' + e.message)
    }
  }, [showToast])

  const navigateToAnime = useCallback((categoryId, animeId) => {
    handleSelectCategory(categoryId)

    // After switching category, wait for the anime element to render then scroll + highlight
    const HIGHLIGHT_MS = 1800
    const maxAttempts = 30
    let attempts = 0

    function findAnimeElement(id) {
      return (
        document.querySelector(`tr[data-anime-id="${id}"]`) ||
        document.querySelector(`.m_card[data-anime-id="${id}"]`) ||
        null
      )
    }

    function scrollAndHighlight(id) {
      const el = findAnimeElement(id)
      if (!el) return

      const stickyHeader = document.querySelector('.sticky_header')
      const headerHeight = stickyHeader ? stickyHeader.offsetHeight : 0
      const rect = el.getBoundingClientRect()
      const scrollTo = window.scrollY + rect.top - headerHeight - 20

      window.scrollTo({ top: scrollTo, behavior: 'smooth' })

      el.classList.remove('search_highlight')
      void el.offsetWidth
      el.classList.add('search_highlight')

      setTimeout(() => {
        el.classList.remove('search_highlight')
      }, HIGHLIGHT_MS)
    }

    const checker = setInterval(() => {
      attempts++
      const el = findAnimeElement(animeId)
      if (el) {
        clearInterval(checker)
        scrollAndHighlight(animeId)
      } else if (attempts >= maxAttempts) {
        clearInterval(checker)
      }
    }, 100)
  }, [handleSelectCategory])

  const hasCategories = categories.length > 0

  const userInfo = user
    ? {
        username: user.username,
        display: user.display || user.username,
        email: user.email,
        picture: user.picture || null,
      }
    : null

  return (
    <>
      <SeasonCommentPopup />
      <div className="sticky_header">
        <Header
          user={userInfo}
          hasCategories={hasCategories}
          onAddCategory={handleAddCategory}
          onAddAnime={handleAddAnime}
          onOpenSearch={() => setMobileSearchOpen(prev => !prev)}
          onOpenShare={() => setShareOpen(true)}
          onOpenImport={() => setImportOpen(true)}
          onExport={handleExport}
          navigateToAnime={navigateToAnime}
        />
        <CategoryTabs
          categories={categories}
          activeCategoryId={effectiveCategoryId}
          loading={categoriesLoading}
          onSelect={handleSelectCategory}
          onEditCategory={handleEditCategory}
        />
      </div>

      <main className="anime_table_wrapper">
        <AnimeList
          animeList={animeList}
          loading={animeLoading}
          categoryId={effectiveCategoryId}
          isMobile={isMobile}
          onEditAnime={handleEditAnime}
          showEditColumn
        />
        <MobileFAB
          hasCategories={hasCategories}
          onAddCategory={handleAddCategory}
          onAddAnime={handleAddAnime}
        />
      </main>

      <SearchMobile
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        navigateToAnime={navigateToAnime}
      />

      {addCategoryOpen && (
        <AddCategoryModal
          onClose={() => setAddCategoryOpen(false)}
          onCreated={(newCat) => {
            setAddCategoryOpen(false)
            handleSelectCategory(newCat.id)
          }}
        />
      )}

      {editCategoryData && (
        <EditCategoryModal
          categoryId={editCategoryData.id}
          currentName={editCategoryData.name}
          activeCategoryId={effectiveCategoryId}
          onClose={() => setEditCategoryData(null)}
        />
      )}

      {addAnimeOpen && (
        <AddAnimeModal
          categories={categories}
          activeCategoryId={effectiveCategoryId}
          onClose={() => setAddAnimeOpen(false)}
        />
      )}

      {editAnimeData && (
        <EditAnimeModal
          animeData={editAnimeData}
          categories={categories}
          activeCategoryId={effectiveCategoryId}
          onClose={() => setEditAnimeData(null)}
        />
      )}

      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </>
  )
}
