import React, { useEffect, useRef, useState } from 'react'

function MaskCanvas ({ imageUrl, onMaskChange }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef(null)
  const [brushSize, setBrushSize] = useState(30)
  const [mode, setMode] = useState('draw') // 'draw' | 'erase'

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    img.src = imageUrl
  }, [imageUrl])

  function getPos (e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  function startDraw (e) {
    isDrawing.current = true
    lastPos.current = getPos(e, canvasRef.current)
  }

  function draw (e) {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)

    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = mode === 'draw' ? '#ffffff' : '#000000'
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPos.current = pos
    onMaskChange(canvasRef)
  }

  function stopDraw () {
    isDrawing.current = false
    lastPos.current = null
  }

  function clearCanvas () {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onMaskChange(canvasRef)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setMode('draw')}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: mode === 'draw' ? '#9b59b6' : 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 13,
            fontWeight: mode === 'draw' ? 700 : 400
          }}
        >
          Draw
        </button>
        <button
          onClick={() => setMode('erase')}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: mode === 'erase' ? '#9b59b6' : 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 13,
            fontWeight: mode === 'erase' ? 700 : 400
          }}
        >
          Erase
        </button>
        <button
          onClick={clearCanvas}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 13
          }}
        >
          Clear
        </button>
        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          Brush
          <input
            type='range'
            min='5'
            max='80'
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <span style={{ color: '#fff', minWidth: 24 }}>{brushSize}</span>
        </label>
      </div>

      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
        <img
          src={imageUrl}
          alt='Upload'
          style={{ display: 'block', maxWidth: '100%', maxHeight: 360, borderRadius: 8 }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: 8,
            opacity: 0.55,
            mixBlendMode: 'screen',
            cursor: mode === 'draw' ? 'crosshair' : 'cell'
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={e => { e.preventDefault(); draw(e) }}
          onTouchEnd={stopDraw}
        />
      </div>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
        Paint white over the area you want Firefly to fill
      </p>
    </div>
  )
}

export default MaskCanvas
