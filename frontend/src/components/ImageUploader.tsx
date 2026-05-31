import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  currentUrl: string | null
  fallback: ReactNode
  shape?: 'circle' | 'square'
  size?: number
  onUpload: (file: File) => Promise<{ url: string }>
  onRemove?: () => Promise<void>
  onChanged?: () => void
}

const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function ImageUploader({
  currentUrl, fallback, shape = 'circle', size = 96,
  onUpload, onRemove, onChanged,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
  const shown = preview ?? currentUrl

  async function handleFile(file: File) {
    setError('')
    if (!ALLOWED.includes(file.type)) {
      setError('Use a JPEG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 3 MB or smaller.')
      return
    }
    setPreview(URL.createObjectURL(file))
    setBusy(true)
    try {
      await onUpload(file)
      onChanged?.()
    } catch {
      setError('Upload failed. Please try again.')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!onRemove) return
    setBusy(true)
    setError('')
    try {
      await onRemove()
      setPreview(null)
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <div
          className={`${radius} overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center w-full h-full`}
        >
          {shown ? (
            <img src={shown} alt="" className="w-full h-full object-cover" />
          ) : (
            fallback
          )}
        </div>

        {/* Camera overlay button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          title="Change photo"
          className={`absolute bottom-0 right-0 w-8 h-8 ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'} bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm flex items-center justify-center border-2 border-[var(--app-bg)] transition-colors`}
        >
          {busy ? '…' : '📷'}
        </button>
      </div>

      <div className="min-w-0">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-4 py-2 rounded-lg glass glass-hover text-white/80 text-sm disabled:opacity-60 transition-colors"
        >
          {busy ? 'Uploading…' : shown ? 'Change photo' : 'Upload photo'}
        </motion.button>
        {shown && onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="ml-2 text-xs text-white/40 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
        <p className="text-[11px] text-white/30 mt-1.5">JPEG, PNG, WebP or GIF · max 3 MB</p>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
