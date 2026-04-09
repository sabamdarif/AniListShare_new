import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../api/client'
import { useToast } from './Toast'
import { useQueryClient } from '@tanstack/react-query'

const CHUNK_SIZE = 50

export default function ImportModal({ onClose }) {
  const overlayRef = useRef(null)
  const modalRef = useRef(null)
  const fileInputRef = useRef(null)
  const showToast = useToast()
  const queryClient = useQueryClient()

  const [selectedFile, setSelectedFile] = useState(null)
  const [dragover, setDragover] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('Preparing…')
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('') // 'success' or 'error'

  useEffect(() => {
    // Animate open
    requestAnimationFrame(() => {
      overlayRef.current?.classList.add('open')
      modalRef.current?.classList.add('open')
    })
  }, [])

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape' && !importing) handleClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [importing])

  function handleClose() {
    if (importing) return
    overlayRef.current?.classList.remove('open')
    modalRef.current?.classList.remove('open')
    setTimeout(onClose, 250)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragover(false)
    const file = e.dataTransfer?.files?.[0]
    if (file && file.name.endsWith('.ods')) {
      setSelectedFile(file)
      setStatus('')
      setStatusType('')
    } else {
      setStatus('Only .ods files are supported')
      setStatusType('error')
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.ods')) {
      setSelectedFile(file)
      setStatus('')
      setStatusType('')
    } else if (file) {
      setStatus('Only .ods files are supported')
      setStatusType('error')
    }
  }

  function removeFile() {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function parseSeasons(seasonStr) {
    if (!seasonStr || !seasonStr.trim()) return []
    const seasons = []
    const ovaCounters = {}
    const regex = /(?:S(\d+)|OVA\(after S(\d+)\)):\s*(\d+)\/(\d+)(?:\s*\[([^\]]*)\])?/gi
    let match
    while ((match = regex.exec(seasonStr)) !== null) {
      const sMatch = match[1]
      const ovaMatch = match[2]
      const watched = parseInt(match[3])
      const total = parseInt(match[4])
      const comment = match[5] ? match[5].trim() : ''
      let number
      if (ovaMatch !== undefined) {
        const baseNum = parseInt(ovaMatch)
        ovaCounters[baseNum] = (ovaCounters[baseNum] || 0) + 1
        number = Number((baseNum + ovaCounters[baseNum] * 0.01).toFixed(2))
      } else if (sMatch !== undefined) {
        number = parseInt(sMatch)
      } else {
        continue
      }
      seasons.push({ number, total_episodes: total, watched_episodes: watched, comment })
    }
    return seasons
  }

  async function startImport() {
    if (!selectedFile) return

    setImporting(true)
    setProgress(0)
    setProgressText('Reading file…')
    setStatus('')
    setStatusType('')

    try {
      const XLSX = await import('xlsx')
      const data = await selectedFile.arrayBuffer()
      const wb = XLSX.read(new Uint8Array(data), { type: 'array' })

      const sheetNames = wb.SheetNames
      if (!sheetNames.length) throw new Error('No sheets found in the file')

      // Count total anime and build data map
      let totalAnime = 0
      const sheetDataMap = []
      for (const sheetName of sheetNames) {
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const dataRows = rows.slice(1).filter(r => r && r.length > 0 && r[0])
        totalAnime += dataRows.length
        sheetDataMap.push({ name: sheetName, rows: dataRows })
      }

      let processed = 0

      // Fetch existing categories
      const existingCatRes = await apiFetch('/anime/category/')
      let existingCats = await existingCatRes.json()
      if (!Array.isArray(existingCats)) existingCats = existingCats.results || []

      for (const sheetInfo of sheetDataMap) {
        const categoryName = sheetInfo.name

        setProgressText(`Creating category: ${categoryName}…`)

        // Find or create category
        let catId = null
        for (const c of existingCats) {
          if (c.name === categoryName) {
            catId = c.id
            break
          }
        }

        if (!catId) {
          const catCreateRes = await apiFetch('/anime/category/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryName }),
          })
          if (!catCreateRes.ok) throw new Error('Failed to create category: ' + categoryName)
          const newCat = await catCreateRes.json()
          catId = newCat.id
          existingCats.push(newCat)
        }

        // Fetch existing anime for duplicate check
        const existingAnimeRes = await apiFetch(`/anime/list/category/${catId}/`)
        let existingAnime = await existingAnimeRes.json()
        if (!Array.isArray(existingAnime)) existingAnime = existingAnime.results || []
        const animeByName = {}
        for (const ea of existingAnime) {
          animeByName[ea.name] = ea
        }

        // Process rows in chunks
        let chunkActions = []

        for (let ri = 0; ri < sheetInfo.rows.length; ri++) {
          const row = sheetInfo.rows[ri]
          const animeName = String(row[0] || '').trim()
          if (!animeName) { processed++; continue }

          const seasonStr = row[1] != null ? String(row[1]) : ''
          const language = row[2] != null ? String(row[2]).trim() : ''
          let stars = row[3] != null && row[3] !== '' ? parseFloat(row[3]) : null
          const thumbnailUrl = row[4] != null ? String(row[4]).trim() : ''
          const seasons = parseSeasons(seasonStr)
          if (isNaN(stars)) stars = null

          const payload = {
            name: animeName,
            thumbnail_url: thumbnailUrl,
            language,
            stars,
            seasons,
            category_id: catId,
          }

          const existing = animeByName[animeName]
          if (existing) {
            chunkActions.push({ type: 'UPDATE', id: existing.id, data: payload })
          } else {
            chunkActions.push({ type: 'CREATE', data: payload })
          }

          processed++
          setProgressText(`Queuing: ${animeName}`)
          setProgress(totalAnime > 0 ? Math.round((processed / totalAnime) * 100) : 0)

          // Flush chunk
          if (chunkActions.length >= CHUNK_SIZE || ri === sheetInfo.rows.length - 1) {
            if (chunkActions.length > 0) {
              setProgressText(`Sending ${chunkActions.length} items to cloud...`)
              const bulkRes = await apiFetch('/anime/bulk_sync/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: chunkActions }),
              })
              if (!bulkRes.ok) throw new Error('Bulk import chunk failed.')
              chunkActions = []
            }
          }
        }
      }

      setProgress(100)
      setProgressText('Import complete!')
      setStatus(`✓ Successfully imported ${totalAnime} anime entries.`)
      setStatusType('success')
      showToast(`Import complete: ${totalAnime} anime imported`)

      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['animeList'] })

      setTimeout(handleClose, 1500)
    } catch (err) {
      setStatus('Import failed: ' + (err.message || 'Unknown error'))
      setStatusType('error')
      setImporting(false)
    }
  }

  return (
    <>
      <div
        className="import_overlay"
        ref={overlayRef}
        onClick={!importing ? handleClose : undefined}
      />
      <div className="import_modal" ref={modalRef}>
        <div className="import_modal_header">
          <h3>Import from ODS</h3>
          <button
            type="button"
            className="import_close_btn"
            onClick={!importing ? handleClose : undefined}
          >
            <i className="nf nf-cod-close" />
          </button>
        </div>
        <div className="import_modal_body">
          {!importing && !selectedFile && (
            <div
              className={`import_dropzone${dragover ? ' dragover' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragover(true) }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="import_dropzone_icon">
                <i className="nf nf-md-file_upload_outline" />
              </div>
              <div className="import_dropzone_text">
                <strong>Drop your .ods file here</strong>
                <br />
                or click to browse
              </div>
              <div className="import_dropzone_hint">
                Only .ods files exported from this app are supported
              </div>
              <input
                type="file"
                className="import_file_input"
                ref={fileInputRef}
                accept=".ods"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {!importing && selectedFile && (
            <>
              <div className="import_file_info visible">
                <i className="nf nf-md-file_document_outline" />
                <span className="import_file_name">{selectedFile.name}</span>
                <button type="button" className="import_file_remove" onClick={removeFile}>
                  <i className="nf nf-cod-close" />
                </button>
              </div>
              <button
                type="button"
                className="import_start_btn visible"
                onClick={startImport}
              >
                Start Import
              </button>
            </>
          )}

          {importing && (
            <div className="import_progress_wrapper visible">
              <div className="import_progress_label">
                <span>{progressText}</span>
                <span>{progress}%</span>
              </div>
              <div className="import_progress_bar_bg">
                <div
                  className="import_progress_bar_fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status && (
            <div className={`import_status visible ${statusType}`}>
              {status}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
