import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'

async function fetchCategories() {
  const res = await apiFetch('/anime/category/')
  if (!res.ok) throw new Error('Failed to fetch categories')
  const data = await res.json()
  return Array.isArray(data) ? data : data.results || []
}

async function createCategory(name) {
  const res = await apiFetch('/anime/category/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    const msg =
      err?.detail ||
      (err?.name ? (Array.isArray(err.name) ? err.name[0] : err.name) : null) ||
      err?.non_field_errors?.[0] ||
      'Save failed'
    throw new Error(msg)
  }
  return res.json()
}

async function updateCategory({ id, name }) {
  const res = await apiFetch(`/anime/category/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    const msg =
      err?.detail ||
      (err?.name ? (Array.isArray(err.name) ? err.name[0] : err.name) : null) ||
      err?.non_field_errors?.[0] ||
      'Save failed'
    throw new Error(msg)
  }
  return res.json()
}

async function deleteCategory(id) {
  const res = await apiFetch(`/anime/category/${id}/`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.detail || 'Delete failed')
  }
}

async function reorderCategories(orderedIds) {
  const res = await apiFetch('/anime/category/reorder/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: orderedIds }),
  })
  if (!res.ok) throw new Error('Reorder failed')
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reorderCategories,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
