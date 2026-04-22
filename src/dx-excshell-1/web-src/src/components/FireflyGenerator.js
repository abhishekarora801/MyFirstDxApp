import React, { useState, useRef } from 'react'
import PropTypes from 'prop-types'
import { ProgressCircle } from '@adobe/react-spectrum'

import allActions from '../config.json'
import actionWebInvoke from '../utils'
import MaskCanvas from './MaskCanvas'

const FIREFLY_ACTION = Object.keys(allActions).find(k => k.includes('firefly-generate')) || ''
const REMOVE_BG_ACTION = Object.keys(allActions).find(k => k.includes('firefly-remove-bg')) || ''
const FILL_ACTION = Object.keys(allActions).find(k => k.includes('firefly-generative-fill')) || ''

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    padding: '40px 32px',
    fontFamily: '"Adobe Clean", "Source Sans Pro", sans-serif',
    color: '#fff'
  },
  header: {
    textAlign: 'center',
    marginBottom: 40
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: '4px 14px',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
    backdropFilter: 'blur(8px)'
  },
  title: {
    margin: 0,
    fontSize: 42,
    fontWeight: 700,
    background: 'linear-gradient(90deg, #fff 0%, #e879f9 50%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1.2
  },
  subtitle: {
    margin: '12px auto 0',
    maxWidth: 480,
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.6
  },
  tabBar: {
    display: 'flex',
    gap: 8,
    maxWidth: 860,
    margin: '0 auto 28px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 6
  },
  tabBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 12,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: 0.3
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, rgba(232,121,249,0.25), rgba(129,140,248,0.25))',
    border: '1px solid rgba(232,121,249,0.4)',
    color: '#fff'
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 28,
    backdropFilter: 'blur(16px)',
    maxWidth: 860,
    margin: '0 auto 32px'
  },
  promptLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: '14px 16px',
    fontSize: 15,
    color: '#fff',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.6,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: 20,
    flexWrap: 'wrap'
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase'
  },
  toggleRow: {
    display: 'flex',
    gap: 10
  },
  toggleBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleBtnActive: {
    border: '1px solid rgba(232,121,249,0.7)',
    background: 'rgba(232,121,249,0.15)',
    color: '#fff'
  },
  toggleIcon: {
    fontSize: 22
  },
  generateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #e879f9, #818cf8)',
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    whiteSpace: 'nowrap',
    letterSpacing: 0.3
  },
  generateBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
    transform: 'none'
  },
  errorBox: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 12,
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: 14,
    maxWidth: 860,
    margin: '0 auto 24px'
  },
  loadingBox: {
    textAlign: 'center',
    padding: '48px 0',
    color: 'rgba(255,255,255,0.6)',
    maxWidth: 860,
    margin: '0 auto'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    letterSpacing: 0.5
  },
  resultsSection: {
    maxWidth: 860,
    margin: '0 auto'
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20
  },
  resultsTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)'
  },
  resultsBadge: {
    background: 'rgba(232,121,249,0.2)',
    border: '1px solid rgba(232,121,249,0.4)',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 12,
    color: '#e879f9',
    fontWeight: 600
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  imageEl: {
    width: '100%',
    display: 'block',
    aspectRatio: '1 / 1',
    objectFit: 'cover'
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: 14,
    opacity: 0,
    transition: 'opacity 0.25s'
  },
  seedTag: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    letterSpacing: 0.5
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    textDecoration: 'none',
    width: 'fit-content'
  },
  uploadZone: {
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    background: 'rgba(255,255,255,0.03)'
  },
  uploadZoneHover: {
    borderColor: 'rgba(232,121,249,0.6)',
    background: 'rgba(232,121,249,0.05)'
  },
  sideBySide: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginTop: 24
  },
  imagePanel: {
    borderRadius: 14,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column'
  },
  imagePanelLabel: {
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.07)'
  },
  imagePanelBody: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  threeCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr 1fr',
    gap: 20,
    marginTop: 24
  }
}

function fileToBase64 (file) {
  // Resize to max 1024px and re-encode as JPEG to stay under OpenWhisk's 1MB payload limit
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 1024
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        resolve(dataUrl.split(',')[1])
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function ImageCard ({ img, idx }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        ...styles.imageCard,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 20px 40px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.3)'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={img.blobUrl || img.downloadUrl}
        alt={`Generated image ${idx + 1}`}
        style={styles.imageEl}
      />
      <div style={{ ...styles.imageOverlay, opacity: hovered ? 1 : 0 }}>
        {img.seed && <div style={styles.seedTag}>SEED: {img.seed}</div>}
        <a href={img.blobUrl || img.downloadUrl} download={`firefly-${idx + 1}.jpg`} target='_blank' rel='noreferrer' style={styles.downloadBtn}>
          ↓ Download
        </a>
      </div>
    </div>
  )
}

function UploadZone ({ onFile, disabled }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  function handleFile (file) {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 3 * 1024 * 1024) {
      alert('Image must be under 3MB')
      return
    }
    onFile(file)
  }

  function onDrop (e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div
      style={{ ...styles.uploadZone, ...(dragOver ? styles.uploadZoneHover : {}) }}
      onClick={() => !disabled && inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>🖼</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6 }}>
        Drop an image here or click to upload
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>JPEG, PNG, WebP · Max 3MB</div>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
        disabled={disabled}
      />
    </div>
  )
}

function FireflyGenerator (props) {
  // Tab state
  const [activeTab, setActiveTab] = useState('generate')

  // Text-to-image state
  const [prompt, setPrompt] = useState('')
  const [contentClass, setContentClass] = useState('photo')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState([])
  const [error, setError] = useState(null)
  const [promptFocused, setPromptFocused] = useState(false)

  // Remove Background state
  const [rbFile, setRbFile] = useState(null)
  const [rbOriginalUrl, setRbOriginalUrl] = useState(null)
  const [rbResultUrl, setRbResultUrl] = useState(null)
  const [rbLoading, setRbLoading] = useState(false)
  const [rbError, setRbError] = useState(null)

  // Generative Fill state
  const [gfFile, setGfFile] = useState(null)
  const [gfOriginalUrl, setGfOriginalUrl] = useState(null)
  const [gfPrompt, setGfPrompt] = useState('')
  const [gfResultUrl, setGfResultUrl] = useState(null)
  const [gfLoading, setGfLoading] = useState(false)
  const [gfError, setGfError] = useState(null)
  const [gfMaskReady, setGfMaskReady] = useState(false)
  const gfMaskCanvasRef = useRef(null)

  function getHeaders () {
    const headers = {}
    if (props.ims?.token) headers.authorization = `Bearer ${props.ims.token}`
    if (props.ims?.org) headers['x-gw-ims-org-id'] = props.ims.org
    return headers
  }

  // --- Text to Image ---
  const isDisabled = loading || !prompt.trim() || !FIREFLY_ACTION

  async function generateImages () {
    if (isDisabled) return
    setLoading(true)
    setError(null)
    setImages([])
    try {
      const response = await actionWebInvoke(allActions[FIREFLY_ACTION], getHeaders(), { prompt: prompt.trim(), contentClass })
      if (response?.images?.length) {
        const loaded = await Promise.all(
          response.images.map(async (img) => {
            try {
              const res = await fetch(img.url)
              const blob = await res.blob()
              return { seed: img.seed, blobUrl: URL.createObjectURL(blob), downloadUrl: img.url }
            } catch {
              return { seed: img.seed, blobUrl: null, downloadUrl: img.url }
            }
          })
        )
        setImages(loaded)
      } else {
        setError('No images returned. Check the action logs for details.')
      }
    } catch (e) {
      setError(e.message || 'Unexpected error calling Firefly action')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generateImages()
  }

  // --- Remove Background ---
  function handleRbFile (file) {
    setRbFile(file)
    setRbOriginalUrl(URL.createObjectURL(file))
    setRbResultUrl(null)
    setRbError(null)
  }

  async function handleRemoveBg () {
    if (!rbFile || rbLoading) return
    setRbLoading(true)
    setRbError(null)
    try {
      const base64 = await fileToBase64(rbFile)
      const response = await actionWebInvoke(allActions[REMOVE_BG_ACTION], getHeaders(), { imageBase64: base64, mimeType: 'image/jpeg' })
      if (response?.imageBase64) {
        // Backend returns base64 PNG (from AIO Files after Photoshop processing)
        const blob = await fetch(`data:image/png;base64,${response.imageBase64}`).then(r => r.blob())
        setRbResultUrl(URL.createObjectURL(blob))
      } else if (response?.imageUrl) {
        const blob = await fetch(response.imageUrl).then(r => r.blob())
        setRbResultUrl(URL.createObjectURL(blob))
      } else {
        setRbError(response?.error || 'No result returned from remove-background action.')
      }
    } catch (e) {
      setRbError(e.message || 'Unexpected error calling remove-background action')
    } finally {
      setRbLoading(false)
    }
  }

  // --- Generative Fill ---
  function handleGfFile (file) {
    setGfFile(file)
    setGfOriginalUrl(URL.createObjectURL(file))
    setGfResultUrl(null)
    setGfError(null)
    setGfMaskReady(false)
    gfMaskCanvasRef.current = null
  }

  function handleMaskChange (canvasRef) {
    gfMaskCanvasRef.current = canvasRef.current
    setGfMaskReady(true)
  }

  async function handleFill () {
    if (!gfFile || !gfPrompt.trim() || !gfMaskReady || gfLoading) return
    setGfLoading(true)
    setGfError(null)
    try {
      const base64 = await fileToBase64(gfFile)
      const maskDataUrl = gfMaskCanvasRef.current.toDataURL('image/png')
      const maskBase64 = maskDataUrl.replace(/^data:image\/png;base64,/, '')
      const response = await actionWebInvoke(allActions[FILL_ACTION], getHeaders(), {
        imageBase64: base64,
        maskBase64,
        prompt: gfPrompt.trim(),
        mimeType: 'image/jpeg'
      })
      if (response?.imageUrl) {
        const blob = await fetch(response.imageUrl).then(r => r.blob())
        setGfResultUrl(URL.createObjectURL(blob))
      } else {
        setGfError(response?.error || 'No result returned from Firefly.')
      }
    } catch (e) {
      setGfError(e.message || 'Unexpected error calling generative-fill action')
    } finally {
      setGfLoading(false)
    }
  }

  const tabs = [
    { id: 'generate', label: '✦ Text to Image' },
    { id: 'removebg', label: '✂ Remove Background' },
    { id: 'fill', label: '🖌 Generative Fill' }
  ]

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badge}>
          <span>✦</span> Adobe Firefly
        </div>
        <h1 style={styles.title}>Image Studio</h1>
        <p style={styles.subtitle}>
          Generate, edit, and transform images using Adobe Firefly's generative AI.
        </p>
      </div>

      {/* Tab Bar */}
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Text to Image ── */}
      {activeTab === 'generate' && (
        <>
          <div style={styles.card}>
            <label style={styles.promptLabel}>Describe your image</label>
            <textarea
              style={{
                ...styles.textarea,
                borderColor: promptFocused ? 'rgba(232,121,249,0.6)' : 'rgba(255,255,255,0.15)',
                boxShadow: promptFocused ? '0 0 0 3px rgba(232,121,249,0.15)' : 'none'
              }}
              placeholder='A serene Japanese garden at sunset with cherry blossoms, golden hour light, 8K, photorealistic...'
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={4}
            />

            <div style={styles.controlsRow}>
              <div style={styles.controlGroup}>
                <span style={styles.controlLabel}>Image Type</span>
                <div style={styles.toggleRow}>
                  {[
                    { id: 'photo', icon: '📷', label: 'Photo' },
                    { id: 'art', icon: '🎨', label: 'Art' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      style={{ ...styles.toggleBtn, ...(contentClass === opt.id ? styles.toggleBtnActive : {}) }}
                      onClick={() => setContentClass(opt.id)}
                      disabled={loading}
                    >
                      <span style={styles.toggleIcon}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                style={{ ...styles.generateBtn, ...(isDisabled ? styles.generateBtnDisabled : {}) }}
                onClick={generateImages}
                disabled={isDisabled}
                onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { if (!isDisabled) e.currentTarget.style.opacity = '1' }}
              >
                {loading ? <ProgressCircle aria-label='Generating' isIndeterminate size='S' /> : <span>✦</span>}
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Tip: Press Ctrl+Enter to generate
            </div>
          </div>

          {error && <div style={styles.errorBox}>⚠ {error}</div>}

          {images.length > 0 && (
            <div style={styles.resultsSection}>
              <div style={styles.resultsHeader}>
                <h2 style={styles.resultsTitle}>Generated Image</h2>
                <span style={styles.resultsBadge}>{images.length} image{images.length > 1 ? 's' : ''}</span>
              </div>
              <div style={styles.imageGrid}>
                {images.map((img, idx) => (
                  <ImageCard key={idx} img={img} idx={idx} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Remove Background ── */}
      {activeTab === 'removebg' && (
        <div style={styles.card}>
          <label style={styles.promptLabel}>Remove Background</label>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 20px' }}>
            Upload a photo and Firefly will remove its background, returning a transparent PNG.
          </p>

          {!rbFile && (
            <UploadZone onFile={handleRbFile} disabled={rbLoading} />
          )}

          {rbFile && (
            <>
              <div style={styles.sideBySide}>
                <div style={styles.imagePanel}>
                  <div style={styles.imagePanelLabel}>Original</div>
                  <div style={styles.imagePanelBody}>
                    <img src={rbOriginalUrl} alt='Original' style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8 }} />
                  </div>
                </div>
                <div style={styles.imagePanel}>
                  <div style={styles.imagePanelLabel}>Result</div>
                  <div style={{
                    ...styles.imagePanelBody,
                    background: rbResultUrl
                      ? 'repeating-conic-gradient(#333 0% 25%, #1a1a2e 0% 50%) 0 0 / 16px 16px'
                      : 'transparent'
                  }}>
                    {rbResultUrl
                      ? <img src={rbResultUrl} alt='Result' style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8 }} />
                      : <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>Result will appear here</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                <button
                  style={{ ...styles.generateBtn, ...(rbLoading || !REMOVE_BG_ACTION ? styles.generateBtnDisabled : {}) }}
                  onClick={handleRemoveBg}
                  disabled={rbLoading || !REMOVE_BG_ACTION}
                >
                  {rbLoading ? <ProgressCircle aria-label='Processing' isIndeterminate size='S' /> : <span>✂</span>}
                  {rbLoading ? 'Removing…' : 'Remove Background'}
                </button>

                {rbResultUrl && (
                  <a
                    href={rbResultUrl}
                    download='firefly-no-bg.png'
                    style={styles.downloadBtn}
                  >
                    ↓ Download PNG
                  </a>
                )}

                <button
                  style={{ ...styles.generateBtn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onClick={() => { setRbFile(null); setRbOriginalUrl(null); setRbResultUrl(null); setRbError(null) }}
                  disabled={rbLoading}
                >
                  Clear
                </button>
              </div>
            </>
          )}

          {rbError && <div style={{ ...styles.errorBox, marginTop: 16, margin: '16px 0 0' }}>⚠ {rbError}</div>}
        </div>
      )}

      {/* ── Tab: Generative Fill ── */}
      {activeTab === 'fill' && (
        <div style={styles.card}>
          <label style={styles.promptLabel}>Generative Fill</label>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 20px' }}>
            Upload a photo, paint over the area you want to replace, then describe what should appear there.
          </p>

          {!gfFile && (
            <UploadZone onFile={handleGfFile} disabled={gfLoading} />
          )}

          {gfFile && (
            <>
              <div style={styles.threeCol}>
                {/* Original */}
                <div style={styles.imagePanel}>
                  <div style={styles.imagePanelLabel}>Original</div>
                  <div style={styles.imagePanelBody}>
                    <img src={gfOriginalUrl} alt='Original' style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8 }} />
                  </div>
                </div>

                {/* Mask canvas */}
                <div style={styles.imagePanel}>
                  <div style={styles.imagePanelLabel}>Paint Mask</div>
                  <div style={{ padding: 12 }}>
                    <MaskCanvas imageUrl={gfOriginalUrl} onMaskChange={handleMaskChange} />
                  </div>
                </div>

                {/* Result */}
                <div style={styles.imagePanel}>
                  <div style={styles.imagePanelLabel}>Result</div>
                  <div style={styles.imagePanelBody}>
                    {gfResultUrl
                      ? <img src={gfResultUrl} alt='Result' style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8 }} />
                      : <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, textAlign: 'center' }}>Result will appear here</span>}
                  </div>
                </div>
              </div>

              {/* Prompt + controls */}
              <div style={{ marginTop: 20 }}>
                <label style={styles.promptLabel}>What should fill the painted area?</label>
                <textarea
                  style={{ ...styles.textarea, minHeight: 72 }}
                  placeholder='e.g. a lush green meadow with wildflowers...'
                  value={gfPrompt}
                  onChange={e => setGfPrompt(e.target.value)}
                  disabled={gfLoading}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  style={{
                    ...styles.generateBtn,
                    ...(!gfFile || !gfPrompt.trim() || !gfMaskReady || gfLoading || !FILL_ACTION ? styles.generateBtnDisabled : {})
                  }}
                  onClick={handleFill}
                  disabled={!gfFile || !gfPrompt.trim() || !gfMaskReady || gfLoading || !FILL_ACTION}
                >
                  {gfLoading ? <ProgressCircle aria-label='Processing' isIndeterminate size='S' /> : <span>🖌</span>}
                  {gfLoading ? 'Filling…' : 'Fill'}
                </button>

                {gfResultUrl && (
                  <>
                    <a href={gfResultUrl} download='firefly-fill.jpg' style={styles.downloadBtn}>
                      ↓ Download
                    </a>
                    <button
                      style={{ ...styles.generateBtn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                      onClick={() => { setGfResultUrl(null); setGfError(null) }}
                    >
                      Try Again
                    </button>
                  </>
                )}

                <button
                  style={{ ...styles.generateBtn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onClick={() => { setGfFile(null); setGfOriginalUrl(null); setGfResultUrl(null); setGfPrompt(''); setGfMaskReady(false); setGfError(null) }}
                  disabled={gfLoading}
                >
                  Clear
                </button>
              </div>

              {!gfMaskReady && gfFile && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 10 }}>
                  Paint over the area you want to replace before clicking Fill.
                </p>
              )}
            </>
          )}

          {gfError && <div style={{ ...styles.errorBox, marginTop: 16, margin: '16px 0 0' }}>⚠ {gfError}</div>}
        </div>
      )}
    </div>
  )
}

FireflyGenerator.propTypes = {
  runtime: PropTypes.any,
  ims: PropTypes.any
}

export default FireflyGenerator
