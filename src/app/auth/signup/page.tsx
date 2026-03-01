'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim()) return setError('Please enter your full name.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    setLoading(true)
    const { error: signupError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (signupError) {
      setError(signupError.message.includes('already registered') ? 'This email is already registered. Please sign in.' : signupError.message)
      return
    }
    setSuccess(true)
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
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h3 style={{ marginBottom: 12 }}>Check your email</h3>
              <p style={{ marginBottom: 8 }}>We sent a confirmation link to:</p>
              <p style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: 24 }}>{form.email}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Click the link to activate your account, then sign in.</p>
              <div style={{ marginTop: 24 }}>
                <Link href="/auth/login" className="btn btn-primary">Go to Sign In</Link>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: 6, fontSize: '1.75rem' }}>Create your account</h2>
              <p style={{ marginBottom: 28, fontSize: '0.9375rem' }}>Set up in 5 minutes. Free to start.</p>
              {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input name="fullName" type="text" placeholder="Rahul Sharma" value={form.fullName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input name="email" type="email" placeholder="rahul@example.com" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input name="password" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input name="confirmPassword" type="password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange} required />
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <><div className="spinner"></div> Creating account...</> : 'Create Account →'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9375rem' }}>
                Already have an account? <Link href="/auth/login" style={{ fontWeight: 600 }}>Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
