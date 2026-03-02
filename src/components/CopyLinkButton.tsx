'use client'

import { useState } from 'react'

export default function CopyLinkButton({ url, label = 'Copy Link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    // Always use the real APP_URL from env, not window.location (fixes localhost issue)
    const realUrl = url.replace('http://localhost:3000', process.env.NEXT_PUBLIC_APP_URL || url)
    await navigator.clipboard.writeText(realUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleCopy} className="btn btn-accent btn-sm" style={{ minWidth: 120 }}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  )
}
