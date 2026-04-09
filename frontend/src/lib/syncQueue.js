import { rawFetchWithAuth } from '../api/client'

const STORAGE_KEY = 'anime_sync_queue'
const FLUSH_DELAY = 1500
const SYNC_URL = '/api/anime/bulk_sync/'

let queue = []
let flushTimer = null
let onIdsResolved = null
let onSyncError = null

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) queue = JSON.parse(stored)
  } catch {
    queue = []
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch { /* quota exceeded — best effort */ }
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, FLUSH_DELAY)
}

function squash(existing, incoming) {
  if (incoming.type === 'DELETE') {
    if (existing.type === 'CREATE') return null
    return { ...incoming }
  }
  if (incoming.type === 'UPDATE') {
    if (existing.type === 'CREATE') {
      return {
        ...existing,
        data: { ...existing.data, ...incoming.data },
      }
    }
    return {
      ...existing,
      type: 'UPDATE',
      data: { ...existing.data, ...incoming.data },
    }
  }
  return incoming
}

function findIndex(action) {
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i]
    if (action.temp_id && q.temp_id === action.temp_id) return i
    if (action.id && q.id === action.id) return i
  }
  return -1
}

export function pushAction(action) {
  const idx = findIndex(action)
  if (idx !== -1) {
    const merged = squash(queue[idx], action)
    if (merged === null) {
      queue.splice(idx, 1)
    } else {
      queue[idx] = merged
    }
  } else {
    queue.push(action)
  }
  save()
  scheduleFlush()
}

export function generateTempId() {
  return 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

async function flush() {
  if (queue.length === 0) return

  const batch = [...queue]
  queue = []
  save()

  try {
    const res = await rawFetchWithAuth(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions: batch }),
    })

    if (!res.ok) {
      queue = [...batch, ...queue]
      save()
      scheduleFlush()
      if (onSyncError) onSyncError()
      return
    }

    const data = await res.json()

    if (data.id_map && onIdsResolved) {
      onIdsResolved(data.id_map)
    }
  } catch {
    queue = [...batch, ...queue]
    save()
    scheduleFlush()
    if (onSyncError) onSyncError()
  }
}

export function flushSync() {
  if (queue.length === 0) return
  const batch = [...queue]
  queue = []
  save()

  try {
    rawFetchWithAuth(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions: batch }),
      keepalive: true,
    })
  } catch { /* best effort on unload */ }
}

export function setOnIdsResolved(fn) {
  onIdsResolved = fn
}

export function setOnSyncError(fn) {
  onSyncError = fn
}

export function getPendingCount() {
  return queue.length
}

load()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (flushTimer) clearTimeout(flushTimer)
    if (queue.length > 0) {
      const body = JSON.stringify({ actions: [...queue] })
      navigator.sendBeacon?.(SYNC_URL, new Blob([body], { type: 'application/json' }))
        || fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        })
      queue = []
      save()
    }
  })
}
