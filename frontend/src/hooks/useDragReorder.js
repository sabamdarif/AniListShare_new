import { useRef, useCallback, useEffect } from 'react'

const DEAD_ZONE = 4
const EDGE_ZONE = 60
const SCROLL_SPEED = 15
const MOBILE_LONG_PRESS = 400
const MOBILE_EDGE_ZONE = 80

export default function useDragReorder({
  containerRef,
  itemSelector,
  getItemId,
  onReorder,
  ghostClass = 'anime_drag_ghost',
  indicatorClass = 'anime_drop_indicator',
  activeClass = 'anime_reorder_active',
  direction = 'vertical', // 'vertical' or 'horizontal'
}) {
  const stateRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    dragItem: null,
    ghost: null,
    indicator: null,
    scrollTimer: null,
    longPressTimer: null,
    items: [],
    orderedIds: [],
    dropIdx: -1,
  })

  const cleanupRef = useRef(null)

  const getItems = useCallback(() => {
    if (!containerRef.current) return []
    return Array.from(containerRef.current.querySelectorAll(itemSelector))
  }, [containerRef, itemSelector])

  const createGhost = useCallback((el) => {
    const ghost = el.cloneNode(true)
    ghost.className = ghostClass
    const rect = el.getBoundingClientRect()
    Object.assign(ghost.style, {
      position: 'fixed',
      width: rect.width + 'px',
      height: rect.height + 'px',
      pointerEvents: 'none',
      zIndex: 9999,
      opacity: '0.85',
      transition: 'none',
    })
    document.body.appendChild(ghost)
    return ghost
  }, [ghostClass])

  const createIndicator = useCallback(() => {
    const ind = document.createElement('div')
    ind.className = indicatorClass
    if (direction === 'vertical') {
      const line = document.createElement('div')
      line.className = 'anime_drop_line'
      ind.appendChild(line)
    }
    Object.assign(ind.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: 9998,
    })
    document.body.appendChild(ind)
    return ind
  }, [indicatorClass, direction])

  const updateIndicator = useCallback((indicator, items, dropIdx, direction) => {
    if (dropIdx < 0 || !indicator) {
      if (indicator) indicator.style.display = 'none'
      return
    }

    const isHoriz = direction === 'horizontal'
    let ref = null

    if (dropIdx < items.length) {
      ref = items[dropIdx].getBoundingClientRect()
    } else if (items.length > 0) {
      ref = items[items.length - 1].getBoundingClientRect()
    }

    if (!ref) { indicator.style.display = 'none'; return }

    indicator.style.display = 'block'

    if (isHoriz) {
      const x = dropIdx < items.length ? ref.left - 2 : ref.right + 2
      indicator.style.left = x + 'px'
      indicator.style.top = ref.top + 'px'
      indicator.style.width = '3px'
      indicator.style.height = ref.height + 'px'
    } else {
      const y = dropIdx < items.length ? ref.top - 2 : ref.bottom + 2
      indicator.style.left = ref.left + 'px'
      indicator.style.top = y + 'px'
      indicator.style.width = ref.width + 'px'
      indicator.style.height = '3px'
    }
  }, [])

  const autoScroll = useCallback((clientY) => {
    const s = stateRef.current
    if (s.scrollTimer) cancelAnimationFrame(s.scrollTimer)

    const edge = direction === 'horizontal' ? EDGE_ZONE : EDGE_ZONE
    const vh = window.innerHeight

    if (clientY < edge) {
      const speed = Math.round(SCROLL_SPEED * (1 - clientY / edge))
      const scroller = () => {
        window.scrollBy(0, -speed)
        s.scrollTimer = requestAnimationFrame(scroller)
      }
      s.scrollTimer = requestAnimationFrame(scroller)
    } else if (clientY > vh - edge) {
      const speed = Math.round(SCROLL_SPEED * (1 - (vh - clientY) / edge))
      const scroller = () => {
        window.scrollBy(0, speed)
        s.scrollTimer = requestAnimationFrame(scroller)
      }
      s.scrollTimer = requestAnimationFrame(scroller)
    }
  }, [direction])

  const findDropIndex = useCallback((items, clientX, clientY, dragItem) => {
    const isHoriz = direction === 'horizontal'

    for (let i = 0; i < items.length; i++) {
      if (items[i] === dragItem) continue
      const rect = items[i].getBoundingClientRect()
      const mid = isHoriz
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2
      const pos = isHoriz ? clientX : clientY

      if (pos < mid) return i
    }
    return items.length
  }, [direction])

  const startDrag = useCallback((e, item, clientX, clientY) => {
    const s = stateRef.current
    s.dragging = true
    s.dragItem = item
    s.items = getItems()
    s.orderedIds = s.items.map(el => getItemId(el))

    item.style.opacity = '0.3'
    document.body.classList.add(activeClass)

    s.ghost = createGhost(item)
    s.indicator = createIndicator()

    const rect = item.getBoundingClientRect()
    s.ghost.style.left = rect.left + 'px'
    s.ghost.style.top = rect.top + 'px'
    s.startX = clientX - rect.left
    s.startY = clientY - rect.top
  }, [getItems, getItemId, createGhost, createIndicator, activeClass])

  const moveDrag = useCallback((clientX, clientY) => {
    const s = stateRef.current
    if (!s.dragging || !s.ghost) return

    s.ghost.style.left = (clientX - s.startX) + 'px'
    s.ghost.style.top = (clientY - s.startY) + 'px'

    s.dropIdx = findDropIndex(s.items, clientX, clientY, s.dragItem)
    updateIndicator(s.indicator, s.items, s.dropIdx, direction)
    autoScroll(clientY)
  }, [findDropIndex, updateIndicator, autoScroll, direction])

  const endDrag = useCallback(() => {
    const s = stateRef.current
    if (!s.dragging) return

    if (s.scrollTimer) { cancelAnimationFrame(s.scrollTimer); s.scrollTimer = null }
    if (s.ghost) { s.ghost.remove(); s.ghost = null }
    if (s.indicator) { s.indicator.remove(); s.indicator = null }
    if (s.dragItem) { s.dragItem.style.opacity = '' }
    document.body.classList.remove(activeClass)

    if (s.dropIdx >= 0 && s.dragItem) {
      const dragId = getItemId(s.dragItem)
      const fromIdx = s.orderedIds.indexOf(dragId)
      if (fromIdx !== -1 && fromIdx !== s.dropIdx && fromIdx !== s.dropIdx - 1) {
        const newOrder = [...s.orderedIds]
        newOrder.splice(fromIdx, 1)
        const toIdx = s.dropIdx > fromIdx ? s.dropIdx - 1 : s.dropIdx
        newOrder.splice(toIdx, 0, dragId)
        onReorder(newOrder)
      }
    }

    s.dragging = false
    s.dragItem = null
    s.items = []
    s.orderedIds = []
    s.dropIdx = -1
  }, [getItemId, onReorder, activeClass])

  // Desktop: mousedown on item
  const onMouseDown = useCallback((e) => {
    const item = e.target.closest(itemSelector)
    if (!item || e.button !== 0) return
    if (e.target.closest('button, input, select, textarea, a')) return

    const s = stateRef.current
    s.startX = e.clientX
    s.startY = e.clientY
    let started = false

    function onMouseMove(ev) {
      const dx = ev.clientX - s.startX
      const dy = ev.clientY - s.startY
      if (!started && Math.abs(dx) + Math.abs(dy) > DEAD_ZONE) {
        started = true
        startDrag(ev, item, ev.clientX, ev.clientY)
      }
      if (started) {
        ev.preventDefault()
        moveDrag(ev.clientX, ev.clientY)
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (started) endDrag()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [itemSelector, startDrag, moveDrag, endDrag])

  // Mobile: touchstart on item
  const onTouchStart = useCallback((e) => {
    const item = e.target.closest(itemSelector)
    if (!item) return
    if (e.target.closest('button, input, select, textarea, a')) return

    const touch = e.touches[0]
    const s = stateRef.current
    s.startX = touch.clientX
    s.startY = touch.clientY

    s.longPressTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50)
      startDrag(e, item, touch.clientX, touch.clientY)

      function onTouchMove(ev) {
        ev.preventDefault()
        const t = ev.touches[0]
        moveDrag(t.clientX, t.clientY)
      }

      function onTouchEnd() {
        document.removeEventListener('touchmove', onTouchMove, { passive: false })
        document.removeEventListener('touchend', onTouchEnd)
        document.removeEventListener('touchcancel', onTouchEnd)
        endDrag()
      }

      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd)
      document.addEventListener('touchcancel', onTouchEnd)
    }, MOBILE_LONG_PRESS)
  }, [itemSelector, startDrag, moveDrag, endDrag])

  const onTouchEnd = useCallback(() => {
    const s = stateRef.current
    if (s.longPressTimer) { clearTimeout(s.longPressTimer); s.longPressTimer = null }
  }, [])

  const onTouchMove = useCallback((e) => {
    const s = stateRef.current
    if (s.longPressTimer) {
      const touch = e.touches[0]
      const dx = Math.abs(touch.clientX - s.startX)
      const dy = Math.abs(touch.clientY - s.startY)
      if (dx + dy > DEAD_ZONE) {
        clearTimeout(s.longPressTimer)
        s.longPressTimer = null
      }
    }
  }, [])

  return { onMouseDown, onTouchStart, onTouchEnd, onTouchMove }
}
