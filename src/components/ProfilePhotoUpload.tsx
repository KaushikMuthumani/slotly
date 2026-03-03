'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePhotoUpload({ currentUrl, name }: { currentUrl?: string; name: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return }

    setError('')
    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/upload-photo', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Upload failed'); setPreview(currentUrl || null); return }
      setPreview(data.photoUrl)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setPreview(currentUrl || null)
    } finally {
      setLoading(false)
    }
  }

  const initial = name?.charAt(0)?.toUpperCase() || '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        onClick={() => !loading && fileRef.current?.click()}
        style={{
          width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
          background: 'var(--color-primary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: loading ? 'wait' : 'pointer',
          border: '3px solid var(--color-border)', position: 'relative',
          transition: 'opacity 0.2s',
        }}
        title="Click to change photo"
      >
        {preview ? (
          <img src={preview} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 36 }}>{initial}</span>
        )}
        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: loading ? 1 : 0, transition: 'opacity 0.2s', borderRadius: '50%',
        }}
          className="photo-hover-overlay"
        >
          <span style={{ color: 'white', fontSize: 22 }}>{loading ? '⏳' : '📷'}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="btn btn-outline btn-sm"
        disabled={loading}
        style={{ fontSize: '0.8125rem' }}
      >
        {loading ? 'Uploading...' : 'Change Photo'}
      </button>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <style>{`
        div:hover .photo-hover-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
