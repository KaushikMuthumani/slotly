'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    setLoading(false)
    if (resetError) { setError(resetError.message); return }
    setSent(true)
  }

  return (
    <div className="page-center">
      <div className="auth-container animate-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 22 }}>S</span>
            </div>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 26, color: 'var(--color-primary)' }}>Slotly</span>
          </Link>
        </div>
        <div className="card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h3 style={{ marginBottom: 12 }}>Check your email</h3>
              <p style={{ marginBottom: 24 }}>Password reset link sent to <strong>{email}</strong></p>
              <Link href="/auth/login" className="btn btn-outline">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: 6 }}>Reset Password</h2>
              <p style={{ marginBottom: 28, fontSize: '0.9375rem' }}>Enter your email and we'll send a reset link.</p>
              {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="rahul@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? <><div className="spinner"></div> Sending...</> : 'Send Reset Link'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9375rem' }}>
                <Link href="/auth/login">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
