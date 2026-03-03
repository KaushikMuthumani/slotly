'use client'
import { useState } from 'react'

export default function CopyLinkButton({ url, label = 'Copy Link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <button onClick={handleCopy} className="btn btn-accent btn-sm" style={{ minWidth: 120 }}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  )
}
