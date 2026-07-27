import { useRef, useState, type PointerEvent, type WheelEvent, type ReactNode } from 'react'
import { FaTimes, FaSearchPlus, FaSearchMinus, FaDownload, FaUndo } from 'react-icons/fa'

interface ImageViewerModalProps {
  /** Image source (data URL or URL). Null/empty closes the viewer. */
  src: string | null
  /** Download filename. */
  filename?: string
  onClose: () => void
}

const MIN = 1
const MAX = 6

/** Full-screen image viewer with zoom, drag-to-pan, and download. */
export function ImageViewerModal({ src, filename = 'image.jpg', onClose }: ImageViewerModalProps) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  if (!src) return null

  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n))
  const zoom = (delta: number) => setScale((s) => clamp(Math.round((s + delta) * 100) / 100))
  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }) }

  const onWheel = (event: WheelEvent) => zoom(event.deltaY < 0 ? 0.25 : -0.25)

  const onPointerDown = (event: PointerEvent) => {
    if (scale <= 1) return
    dragging.current = true
    last.current = { x: event.clientX, y: event.clientY }
    ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging.current) return
    setPos((p) => ({ x: p.x + (event.clientX - last.current.x), y: p.y + (event.clientY - last.current.y) }))
    last.current = { x: event.clientX, y: event.clientY }
  }
  const onPointerUp = () => { dragging.current = false }

  const download = () => {
    const a = document.createElement('a')
    a.href = src
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) => (
    <button onClick={onClick} title={title} aria-label={title} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/30">
      {children}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/90 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-semibold text-white/80">{Math.round(scale * 100)}%</span>
        <div className="flex items-center gap-2">
          <Btn onClick={() => zoom(-0.25)} title="Zoom out"><FaSearchMinus /></Btn>
          <Btn onClick={() => zoom(0.25)} title="Zoom in"><FaSearchPlus /></Btn>
          <Btn onClick={reset} title="Reset"><FaUndo /></Btn>
          <Btn onClick={download} title="Download"><FaDownload /></Btn>
          <Btn onClick={onClose} title="Close"><FaTimes /></Btn>
        </div>
      </div>
      <div
        className="flex flex-1 items-center justify-center overflow-hidden"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={(e) => { if (e.target === e.currentTarget && scale <= 1) onClose() }}
        style={{ cursor: scale > 1 ? (dragging.current ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
      >
        <img
          src={src}
          alt="Preview"
          draggable={false}
          className="max-h-full max-w-full select-none"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: dragging.current ? 'none' : 'transform 0.1s' }}
        />
      </div>
      <p className="pb-3 text-center text-xs text-white/50">Scroll or use +/− to zoom • drag to move • tap outside to close</p>
    </div>
  )
}
