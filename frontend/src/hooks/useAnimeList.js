import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { normalizeAnime } from '../lib/animeUtils'

async function fetchAnimeList(categoryId) {
  if (!categoryId) return []
  const res = await apiFetch(`/anime/list/category/${categoryId}/`)
  if (!res.ok) throw new Error('Failed to fetch anime')
  const data = await res.json()
  const list = Array.isArray(data) ? data : data.results || []
  return list.map(normalizeAnime)
}

async function reorderAnime(categoryId, orderedIds) {
  const res = await apiFetch(`/anime/list/category/${categoryId}/reorder/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: orderedIds }),
  })
  if (!res.ok) throw new Error('Reorder failed')
}

export function useAnimeList(categoryId) {
  return useQuery({
    queryKey: ['animeList', categoryId],
    queryFn: () => fetchAnimeList(categoryId),
    enabled: !!categoryId,
  })
}

export function useAnimeListActions(categoryId) {
  const qc = useQueryClient()

  function addLocalAnime(anime) {
    qc.setQueryData(['animeList', categoryId], old => {
      if (!old) return [normalizeAnime(anime)]
      return [...old, normalizeAnime(anime)]
    })
  }

  function updateLocalAnime(anime) {
    qc.setQueryData(['animeList', categoryId], old => {
      if (!old) return old
      return old.map(a => {
        if (a.id === anime.id || (a.temp_id && a.temp_id === anime.temp_id)) {
          return normalizeAnime({ ...a, ...anime })
        }
        return a
      })
    })
  }

  function removeLocalAnime(animeId) {
    qc.setQueryData(['animeList', categoryId], old => {
      if (!old) return old
      return old.filter(a => a.id !== animeId && a.temp_id !== animeId)
    })
  }

  function resolveAnimeIds(idMap) {
    qc.setQueryData(['animeList', categoryId], old => {
      if (!old) return old
      return old.map(a => {
        if (a.temp_id && idMap[a.temp_id]) {
          return { ...a, id: idMap[a.temp_id], temp_id: null }
        }
        return a
      })
    })
  }

  function setAnimeList(list) {
    qc.setQueryData(['animeList', categoryId], list.map(normalizeAnime))
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['animeList', categoryId] })
  }

  return {
    addLocalAnime,
    updateLocalAnime,
    removeLocalAnime,
    resolveAnimeIds,
    setAnimeList,
    invalidate,
    reorderAnime: orderedIds => reorderAnime(categoryId, orderedIds),
  }
}
