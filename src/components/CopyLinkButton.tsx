'use client'

import { useState } from 'react'

export default function CopyLinkButton({ url, label = 'Copy Link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="btn btn-accent btn-sm" style={{ minWidth: 120 }}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  )
}
