import { useState, useEffect } from 'react'

const BREAKPOINT = 768

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= BREAKPOINT)

  useEffect(() => {
    let rafId = null
    function handleResize() {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setIsMobile(window.innerWidth <= BREAKPOINT)
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return isMobile
}
