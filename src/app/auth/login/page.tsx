'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    })
    setLoading(false)
    if (loginError) {
      if (loginError.message.includes('Invalid login credentials')) setError('Incorrect email or password.')
      else if (loginError.message.includes('Email not confirmed')) setError('Please confirm your email first. Check your inbox.')
      else setError(loginError.message)
      return
    }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('onboarding_complete').eq('id', data.user.id).single()
      router.push(profile?.onboarding_complete ? '/dashboard' : '/onboarding')
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  return (
    <div className="page-center" style={{ padding: '16px' }}>
      <div className="auth-container animate-in" style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 22 }}>S</span>
            </div>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 26, color: 'var(--color-primary)' }}>zlotra</span>
          </Link>
        </div>

        <div className="card" style={{ padding: '28px 24px' }}>
          <h2 style={{ marginBottom: 6, fontSize: '1.75rem' }}>Welcome back</h2>
          <p style={{ marginBottom: 28, fontSize: '0.9375rem' }}>Sign in to manage your bookings</p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            style={{
              width: '100%', padding: '12px', marginBottom: 20,
              border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              background: 'white', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: '0.9375rem', fontWeight: 500, fontFamily: 'Sora, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {googleLoading ? (
              <div className="spinner spinner-dark"></div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="rahul@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Forgot password?</Link>
              </div>
              <input name="password" type="password" placeholder="Your password" value={form.password} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || googleLoading}>
              {loading ? <><div className="spinner"></div> Signing in...</> : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9375rem' }}>
            Don't have an account? <Link href="/auth/signup" style={{ fontWeight: 600 }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}