import { useEffect, useRef } from 'react'
import useIsMobile from '../hooks/useIsMobile'

/**
 * SeasonCommentPopup — handles both:
 *   • Desktop: hover tooltip on .season_has_tooltip[data-comment]
 *   • Mobile:  tap popup on .m_season_has_popup[data-comment]
 *
 * Mirrors the core app's anime_renderer.js behavior exactly.
 * Mount this once (e.g. in HomePage) to enable comment popups everywhere.
 */
export default function SeasonCommentPopup() {
  const isMobile = useIsMobile()
  const tooltipRef = useRef(null)   // active desktop tooltip element
  const popupRef = useRef(null)     // active mobile popup overlay element
  const hoverTimerRef = useRef(null)

  useEffect(() => {
    // ────────────────────────────────
    //  Desktop tooltip helpers
    // ────────────────────────────────
    function removeTooltip() {
      if (tooltipRef.current) {
        tooltipRef.current.remove()
        tooltipRef.current = null
      }
    }

    function showTooltip(anchor) {
      const comment = anchor.getAttribute('data-comment')
      if (!comment) return
      removeTooltip()

      const tip = document.createElement('div')
      tip.className = 'season_comment_tooltip'

      const stem = document.createElement('div')
      stem.className = 'season_comment_stem'
      tip.appendChild(stem)

      const header = document.createElement('div')
      header.className = 'season_comment_header'
      header.textContent = (anchor.getAttribute('data-season') || 'Season') + ' Comment'
      tip.appendChild(header)

      const body = document.createElement('div')
      body.className = 'season_comment_body'
      body.textContent = comment
      tip.appendChild(body)

      const footer = document.createElement('div')
      footer.className = 'season_comment_footer'
      const closeBtn = document.createElement('button')
      closeBtn.className = 'season_comment_close_btn'
      closeBtn.type = 'button'
      closeBtn.textContent = 'Close'
      footer.appendChild(closeBtn)
      tip.appendChild(footer)

      document.body.appendChild(tip)
      tooltipRef.current = tip

      // Position the tooltip below the anchor
      const rect = anchor.getBoundingClientRect()
      const stemH = 10
      tip.style.visibility = 'hidden'
      tip.style.display = 'block'
      const tipRect = tip.getBoundingClientRect()
      tip.style.visibility = ''

      let left = rect.left + rect.width / 2 - tipRect.width / 2
      if (left < 8) left = 8
      if (left + tipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tipRect.width - 8
      }

      tip.style.top = (rect.bottom + stemH + window.scrollY) + 'px'
      tip.style.left = (left + window.scrollX) + 'px'

      const stemLeft = rect.left + rect.width / 2 - left - 8
      stem.style.left = Math.max(12, Math.min(stemLeft, tipRect.width - 28)) + 'px'

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        removeTooltip()
      })
    }

    // ────────────────────────────────
    //  Mobile popup helpers
    // ────────────────────────────────
    function removeMobilePopup() {
      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }
    }

    // ────────────────────────────────
    //  Event handlers
    // ────────────────────────────────
    function handleMouseOver(e) {
      if (window.innerWidth <= 768) return
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) {
        clearTimeout(hoverTimerRef.current)
        return
      }
      const el = e.target.closest('.season_has_tooltip[data-comment]')
      if (el) {
        clearTimeout(hoverTimerRef.current)
        showTooltip(el)
      }
    }

    function handleMouseOut(e) {
      if (window.innerWidth <= 768) return
      const fromAnchor = e.target.closest('.season_has_tooltip[data-comment]')
      const fromTooltip = tooltipRef.current &&
        (tooltipRef.current === e.target || tooltipRef.current.contains(e.target))

      if (fromAnchor || fromTooltip) {
        const related = e.relatedTarget
        if (tooltipRef.current &&
          (tooltipRef.current === related || tooltipRef.current.contains(related))) {
          return
        }
        if (related && related.closest &&
          related.closest('.season_has_tooltip[data-comment]')) {
          return
        }
        hoverTimerRef.current = setTimeout(removeTooltip, 150)
      }
    }

    function handleClick(e) {
      if (window.innerWidth <= 768) {
        // ── Mobile: popup card ──
        if (popupRef.current &&
          !popupRef.current.contains(e.target) &&
          !e.target.closest('.m_season_has_popup[data-comment]')) {
          removeMobilePopup()
          return
        }
        if (e.target.closest('.m_season_popup_close')) {
          removeMobilePopup()
          return
        }

        const el = e.target.closest('.m_season_has_popup[data-comment]')
        if (!el) return
        removeMobilePopup()

        const overlay = document.createElement('div')
        overlay.className = 'm_season_popup_overlay'

        const card = document.createElement('div')
        card.className = 'm_season_popup_card'

        const title = document.createElement('div')
        title.className = 'm_season_popup_title'
        title.textContent = (el.getAttribute('data-season') || 'Season') + ' Comment'

        const popupBody = document.createElement('div')
        popupBody.className = 'm_season_popup_body'
        popupBody.textContent = el.getAttribute('data-comment')

        const closeBtn = document.createElement('button')
        closeBtn.className = 'm_season_popup_close'
        closeBtn.type = 'button'
        closeBtn.textContent = 'Close'

        card.appendChild(title)
        card.appendChild(popupBody)
        card.appendChild(closeBtn)
        overlay.appendChild(card)
        document.body.appendChild(overlay)
        popupRef.current = overlay

        requestAnimationFrame(() => {
          overlay.classList.add('m_popup_visible')
        })
      } else {
        // ── Desktop: click toggle ──
        if (e.target.closest('.season_comment_close_btn')) return
        const el = e.target.closest('.season_has_tooltip[data-comment]')
        if (el) {
          if (tooltipRef.current) removeTooltip()
          else showTooltip(el)
        } else if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
          removeTooltip()
        }
      }
    }

    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
      document.removeEventListener('click', handleClick)
      clearTimeout(hoverTimerRef.current)
      removeTooltip()
      removeMobilePopup()
    }
  }, []) // Run once, use window.innerWidth for live checks

  // This component renders nothing — it only manages event delegation
  return null
}
