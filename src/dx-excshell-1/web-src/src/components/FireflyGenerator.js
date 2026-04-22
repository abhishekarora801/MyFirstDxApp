import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { ProgressCircle } from '@adobe/react-spectrum'

import allActions from '../config.json'
import actionWebInvoke from '../utils'

const FIREFLY_ACTION = Object.keys(allActions).find(k => k.includes('firefly-generate')) || ''

const ASPECT_RATIOS = [
  { id: 'square', label: 'Square', sub: '1:1', width: 2048, height: 2048 },
  { id: 'landscape', label: 'Landscape', sub: '4:3', width: 2304, height: 1792 },
  { id: 'portrait', label: 'Portrait', sub: '3:4', width: 1792, height: 2304 },
  { id: 'widescreen', label: 'Widescreen', sub: '16:9', width: 2688, height: 1536 }
]

// Curated Firefly v3 style presets. `preset` is the API value; `null` means "no preset".
const STYLE_PRESETS = {
  photo: [
    { id: 'none', label: 'None', icon: '○', preset: null },
    { id: 'cinematic', label: 'Cinematic', icon: '🎬', preset: 'cinematic' },
    { id: 'dramatic', label: 'Dramatic', icon: '⚡', preset: 'dramatic_lighting' },
    { id: 'vintage', label: 'Vintage', icon: '📼', preset: 'vintage_photo' },
    { id: 'bw', label: 'B&W', icon: '◐', preset: 'bw' },
    { id: 'macro', label: 'Macro', icon: '🔍', preset: 'macrophotography' }
  ],
  art: [
    { id: 'none', label: 'None', icon: '○', preset: null },
    { id: 'anime', label: 'Anime', icon: '🌸', preset: 'anime' },
    { id: 'watercolor', label: 'Watercolor', icon: '🎨', preset: 'watercolor' },
    { id: '3d', label: '3D Render', icon: '🧊', preset: '3d' },
    { id: 'line_art', label: 'Line Art', icon: '✏️', preset: 'line_art' },
    { id: 'pop_art', label: 'Pop Art', icon: '💥', preset: 'pop_art' }
  ]
}

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
  }
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

function FireflyGenerator (props) {
  const [prompt, setPrompt] = useState('')
  const [contentClass, setContentClass] = useState('photo')
  const [aspectRatio, setAspectRatio] = useState('square')
  const [stylePreset, setStylePreset] = useState('none')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState([])
  const [error, setError] = useState(null)
  const [promptFocused, setPromptFocused] = useState(false)

  function getHeaders () {
    const headers = {}
    if (props.ims?.token) headers.authorization = `Bearer ${props.ims.token}`
    if (props.ims?.org) headers['x-gw-ims-org-id'] = props.ims.org
    return headers
  }

  const isDisabled = loading || !prompt.trim() || !FIREFLY_ACTION

  async function generateImages () {
    if (isDisabled) return
    setLoading(true)
    setError(null)
    setImages([])
    try {
      const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[0]
      const presetList = STYLE_PRESETS[contentClass] || STYLE_PRESETS.photo
      const activePreset = presetList.find(p => p.id === stylePreset)
      const payload = {
        prompt: prompt.trim(),
        contentClass,
        size: { width: ratio.width, height: ratio.height }
      }
      if (activePreset && activePreset.preset) {
        payload.stylePresets = [activePreset.preset]
      }
      const response = await actionWebInvoke(allActions[FIREFLY_ACTION], getHeaders(), payload)
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

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badge}>
          <span>✦</span> Adobe Firefly
        </div>
        <h1 style={styles.title}>Image Studio</h1>
        <p style={styles.subtitle}>
          Generate images using Adobe Firefly's generative AI.
        </p>
      </div>

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
                  onClick={() => { setContentClass(opt.id); setStylePreset('none') }}
                  disabled={loading}
                >
                  <span style={styles.toggleIcon}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...styles.controlGroup, flex: 1, minWidth: 260 }}>
            <span style={styles.controlLabel}>Aspect Ratio</span>
            <div style={styles.toggleRow}>
              {ASPECT_RATIOS.map(opt => (
                <button
                  key={opt.id}
                  style={{ ...styles.toggleBtn, padding: '10px 8px', ...(aspectRatio === opt.id ? styles.toggleBtnActive : {}) }}
                  onClick={() => setAspectRatio(opt.id)}
                  disabled={loading}
                  title={`${opt.width} × ${opt.height}`}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <span style={styles.controlLabel}>Style Preset</span>
          <div style={{ ...styles.toggleRow, marginTop: 8, flexWrap: 'wrap' }}>
            {(STYLE_PRESETS[contentClass] || STYLE_PRESETS.photo).map(p => (
              <button
                key={p.id}
                style={{
                  ...styles.toggleBtn,
                  flex: '0 0 auto',
                  flexDirection: 'row',
                  padding: '8px 14px',
                  ...(stylePreset === p.id ? styles.toggleBtnActive : {})
                }}
                onClick={() => setStylePreset(p.id)}
                disabled={loading}
              >
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
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
    </div>
  )
}

FireflyGenerator.propTypes = {
  runtime: PropTypes.any,
  ims: PropTypes.any
}

export default FireflyGenerator
