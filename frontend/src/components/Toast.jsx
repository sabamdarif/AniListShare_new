import { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

function ToastItem({ message, onDone }) {
  const ref = useRef(null)

  useEffect(() => {
    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
      if (ref.current) ref.current.classList.add('asq_toast_visible')
    })

    const timer = setTimeout(() => {
      if (ref.current) ref.current.classList.remove('asq_toast_visible')
      setTimeout(onDone, 300)
    }, 2500)

    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div ref={ref} className="asq_toast">
      {message}
    </div>
  )
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const showToast = useCallback((message) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="asq_toast_container">
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            message={t.message}
            onDone={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
