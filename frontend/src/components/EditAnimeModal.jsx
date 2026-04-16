import AnimeModalBase from './AnimeModalBase'
import { pushAction } from '../lib/syncQueue'
import { useAnimeListActions } from '../hooks/useAnimeList'
import { useToast } from './Toast'

export default function EditAnimeModal({ animeData, categories, activeCategoryId, onClose }) {
  const { updateLocalAnime, removeLocalAnime } = useAnimeListActions(activeCategoryId)
  const showToast = useToast()

  async function handleSave(payload, catId, ctx) {
    const animeId = ctx.animeId
    const oldCatId = ctx.oldCategoryId || catId
    if (!animeId) throw new Error('No anime selected')

    const targetCatId = parseInt(catId, 10)
    const action = {
      type: 'UPDATE',
      data: { ...payload, category_id: targetCatId },
    }

    if (typeof animeId === 'string' && animeId.startsWith('temp_')) {
      action.temp_id = animeId
    } else {
      action.id = parseInt(animeId, 10)
    }

    pushAction(action)
    ctx.close()

    const optimisticData = { ...payload, id: animeId }
    if (action.temp_id) optimisticData.temp_id = action.temp_id

    if (String(oldCatId) !== String(targetCatId)) {
      removeLocalAnime(animeId)
    } else {
      updateLocalAnime(optimisticData)
    }

    showToast(`"${payload.name}" updated`)
  }

  async function handleDelete(animeId, catId, ctx) {
    const action = { type: 'DELETE' }
    if (typeof animeId === 'string' && animeId.startsWith('temp_')) {
      action.temp_id = animeId
    } else {
      action.id = parseInt(animeId, 10)
    }

    pushAction(action)
    ctx.close()
    removeLocalAnime(animeId)
    showToast('Anime deleted')
  }

  return (
    <AnimeModalBase
      title="Edit Anime"
      saveBtnText="Update"
      showDeleteBtn
      onSave={handleSave}
      onDelete={handleDelete}
      onClose={onClose}
      prefill={animeData}
      categories={categories}
      activeCategoryId={activeCategoryId}
    />
  )
}
