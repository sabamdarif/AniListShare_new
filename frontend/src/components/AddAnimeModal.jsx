import AnimeModalBase from './AnimeModalBase'
import { pushAction, generateTempId } from '../lib/syncQueue'
import { useAnimeListActions } from '../hooks/useAnimeList'
import { useToast } from './Toast'

export default function AddAnimeModal({ categories, activeCategoryId, onClose }) {
  const { addLocalAnime } = useAnimeListActions(activeCategoryId)
  const showToast = useToast()

  async function handleSave(payload, catId, ctx) {
    const tempId = generateTempId()

    const optimisticData = { ...payload }
    optimisticData.id = tempId
    optimisticData.temp_id = tempId
    if (!optimisticData.seasons) optimisticData.seasons = []

    const action = {
      type: 'CREATE',
      temp_id: tempId,
      data: { ...payload, category_id: parseInt(catId, 10) },
    }

    pushAction(action)
    ctx.close()

    if (parseInt(catId, 10) === activeCategoryId) {
      addLocalAnime(optimisticData)
    }

    showToast(`"${payload.name}" added`)
  }

  return (
    <AnimeModalBase
      title="Add Anime"
      saveBtnText="Save"
      showDeleteBtn={false}
      onSave={handleSave}
      onClose={onClose}
      categories={categories}
      activeCategoryId={activeCategoryId}
    />
  )
}
