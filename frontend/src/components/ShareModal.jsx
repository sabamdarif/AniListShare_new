import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../api/client'
import { useToast } from './Toast'

export default function ShareModal({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [toggling, setToggling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const overlayRef = useRef(null)
  const modalRef = useRef(null)
  const showToast = useToast()

  useEffect(() => {
    fetchStatus()
    // Animate open
    requestAnimationFrame(() => {
      overlayRef.current?.classList.add('open')
      modalRef.current?.classList.add('open')
    })
  }, [])

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  async function fetchStatus() {
    try {
      const res = await apiFetch('/share/status/')
      if (res.ok) {
        const data = await res.json()
        setEnabled(!!data.enabled)
        if (data.url) {
          setShareUrl(data.url)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  function handleClose() {
    overlayRef.current?.classList.remove('open')
    modalRef.current?.classList.remove('open')
    setTimeout(onClose, 250)
  }

  async function handleToggle(newEnabled) {
    setToggling(true)
    setError('')
    try {
      const res = await apiFetch('/share/toggle/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: newEnabled }),
      })
      if (res.ok) {
        const data = await res.json()
        setEnabled(!!data.enabled)
        if (data.url) {
          setShareUrl(data.url)
        } else {
          setShareUrl('')
        }
      } else {
        throw new Error('Failed')
      }
    } catch {
      setError('Failed to update share settings.')
    }
    setToggling(false)
  }

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy')
    }
  }

  return (
    <>
      <div
        className="share_modal_overlay"
        ref={overlayRef}
        onClick={handleClose}
      />
      <div className="share_modal" ref={modalRef}>
        <div className="share_modal_header">
          <span className="share_modal_title">
            <i className="nf nf-md-share_all" /> Share Your List
          </span>
          <button className="share_modal_close" onClick={handleClose} aria-label="Close">
            <i className="nf nf-md-close" />
          </button>
        </div>

        <div className="share_modal_body">
          {loading ? (
            <div className="share_loading">
              <div className="share_spinner" />
            </div>
          ) : (
            <>
              <div className="share_toggle_row">
                <div className="share_toggle_label">
                  <span className="share_toggle_text">Enable Public Link</span>
                  <span className="share_toggle_hint">
                    Anyone with the link can view your list
                  </span>
                </div>
                <label className="share_toggle_switch">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={toggling}
                    onChange={(e) => handleToggle(e.target.checked)}
                  />
                  <span className="share_toggle_slider" />
                </label>
              </div>

              <div className={`share_link_section${enabled && shareUrl ? ' visible' : ''}`}>
                <div className="share_link_label">Your public link</div>
                <div className="share_link_box">
                  <input
                    className="share_link_url"
                    type="text"
                    readOnly
                    value={shareUrl}
                  />
                  <button
                    className={`share_copy_btn${copied ? ' copied' : ''}`}
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><i className="nf nf-md-check" /> Copied!</>
                    ) : (
                      <><i className="nf nf-md-content_copy" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="share_error">{error}</div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
