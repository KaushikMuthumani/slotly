'use client'
// src/app/dashboard/briefs/page.tsx
import { useState, useEffect } from 'react'

const QUESTION_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select', label: 'Multiple choice' },
]

const DEFAULT_QUESTIONS = [
  { question: 'What is the main purpose of this consultation?', question_type: 'textarea', is_required: true },
  { question: 'What specific outcome are you hoping to achieve?', question_type: 'textarea', is_required: true },
  { question: 'Have you consulted with anyone else on this before?', question_type: 'select', options: ['Yes', 'No', 'Not sure'], is_required: false },
  { question: 'Is there anything else I should know before our meeting?', question_type: 'textarea', is_required: false },
]

export default function BriefsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ question: '', question_type: 'text', options: '', is_required: false, sort_order: 0 })

  useEffect(() => { fetchQuestions() }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    const res = await fetch('/api/intake-questions')
    const data = await res.json()
    setQuestions(data.questions || [])
    setLoading(false)
  }

  const saveQuestion = async () => {
    if (!form.question.trim()) return alert('Enter a question')
    setSaving(true)
    const payload = {
      ...form,
      options: form.question_type === 'select' ? form.options.split(',').map(o => o.trim()).filter(Boolean) : null,
      sort_order: questions.length,
    }
    await fetch('/api/intake-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ question: '', question_type: 'text', options: '', is_required: false, sort_order: 0 })
    fetchQuestions()
  }

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/intake-questions?id=${id}`, { method: 'DELETE' })
    fetchQuestions()
  }

  const addDefaults = async () => {
    setSaving(true)
    for (let i = 0; i < DEFAULT_QUESTIONS.length; i++) {
      await fetch('/api/intake-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...DEFAULT_QUESTIONS[i], sort_order: i }),
      })
    }
    setSaving(false)
    fetchQuestions()
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Intake Questions & AI Briefs</h1>
        <p>Collect context before every booking. AI generates a meeting brief for you automatically.</p>
      </div>

      {/* How it works */}
      <div className="card" style={{ marginBottom: 28, background: 'var(--color-bg-muted)', border: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { icon: '📋', title: 'Client fills form', desc: 'Answers your questions when booking' },
            { icon: '🤖', title: 'AI generates brief', desc: 'Claude summarizes key context for you' },
            { icon: '📬', title: 'You get briefed', desc: 'Ready before the meeting starts' },
          ].map(s => (
            <div key={s.title} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!loading && questions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h3 style={{ marginBottom: 8 }}>No intake questions yet</h3>
          <p style={{ marginBottom: 20, color: 'var(--color-text-muted)' }}>Add questions to collect context before every meeting.</p>
          <button onClick={addDefaults} disabled={saving} className="btn btn-primary">
            {saving ? 'Adding...' : '⚡ Use recommended questions'}
          </button>
        </div>
      )}

      {/* Questions list */}
      {questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {questions.map((q, i) => (
            <div key={q.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500, marginBottom: 2 }}>{q.question}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {QUESTION_TYPES.find(t => t.value === q.question_type)?.label}
                  {q.is_required && <span style={{ color: '#ef4444', marginLeft: 8 }}>• Required</span>}
                  {q.options && <span> • {q.options.join(', ')}</span>}
                </p>
              </div>
              <button onClick={() => deleteQuestion(q.id)} className="btn btn-sm" style={{ color: '#ef4444', flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add question button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Add Question
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ maxWidth: 520, marginTop: 16 }}>
          <h3 style={{ marginBottom: 20 }}>New Question</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Question</label>
              <input value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} placeholder="e.g. What is the purpose of this meeting?" />
            </div>
            <div className="form-group">
              <label>Answer Type</label>
              <select value={form.question_type} onChange={e => setForm(p => ({ ...p, question_type: e.target.value }))}>
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.question_type === 'select' && (
              <div className="form-group">
                <label>Options (comma separated)</label>
                <input value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))} placeholder="Yes, No, Maybe" />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="required" checked={form.is_required} onChange={e => setForm(p => ({ ...p, is_required: e.target.checked }))} />
              <label htmlFor="required" style={{ marginBottom: 0, cursor: 'pointer' }}>Required question</label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveQuestion} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Save Question'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
