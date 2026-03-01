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
          <h2 style={{ marginBottom: 6, fontSize: '1.75rem' }}>Welcome back</h2>
          <p style={{ marginBottom: 28, fontSize: '0.9375rem' }}>Sign in to manage your bookings</p>
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}
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
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
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
