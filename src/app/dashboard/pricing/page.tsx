'use client'
// src/app/dashboard/pricing/page.tsx
import { useState, useEffect } from 'react'

const RULE_TYPES = [
  { value: 'time_based', label: '🕐 Time-based (morning/evening surge)' },
  { value: 'day_based', label: '📅 Day-based (weekend premium)' },
  { value: 'last_minute', label: '⚡ Last-minute (surge pricing)' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed price (₹)' },
  { value: 'add', label: 'Add amount (₹)' },
  { value: 'multiplier', label: 'Multiplier (e.g. 1.5 = +50%)' },
]

const PRESETS = [
  { name: 'Morning Special', rule_type: 'time_based', start_hour: 6, end_hour: 9, price_type: 'multiplier', price_value: 0.8, rule_name: 'Morning Discount' },
  { name: 'Evening Premium', rule_type: 'time_based', start_hour: 17, end_hour: 21, price_type: 'multiplier', price_value: 1.3, rule_name: 'Evening Premium' },
  { name: 'Weekend Premium', rule_type: 'day_based', applies_to_days: [0, 6], price_type: 'multiplier', price_value: 1.25, rule_name: 'Weekend Premium' },
  { name: 'Last-Minute Surge', rule_type: 'last_minute', last_minute_hours: 2, price_type: 'multiplier', price_value: 1.5, rule_name: 'Last-Minute Surge' },
]

export default function PricingPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    rule_name: '', rule_type: 'time_based', start_hour: 9, end_hour: 12,
    applies_to_days: [] as number[], last_minute_hours: 2,
    price_type: 'multiplier', price_value: 1.2, is_active: true, priority: 0,
  })

  useEffect(() => { fetchRules() }, [])

  const fetchRules = async () => {
    setLoading(true)
    const res = await fetch('/api/pricing-rules')
    const data = await res.json()
    setRules(data.rules || [])
    setLoading(false)
  }

  const saveRule = async () => {
    if (!form.rule_name) return alert('Enter a rule name')
    setSaving(true)
    await fetch('/api/pricing-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ rule_name: '', rule_type: 'time_based', start_hour: 9, end_hour: 12, applies_to_days: [], last_minute_hours: 2, price_type: 'multiplier', price_value: 1.2, is_active: true, priority: 0 })
    fetchRules()
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    await fetch(`/api/pricing-rules?id=${id}`, { method: 'DELETE' })
    fetchRules()
  }

  const applyPreset = (preset: any) => {
    setForm(prev => ({ ...prev, ...preset }))
    setShowForm(true)
  }

  const describeRule = (r: any) => {
    const priceDesc = r.price_type === 'fixed' ? `₹${r.price_value} fixed`
      : r.price_type === 'add' ? `+₹${r.price_value}`
      : `×${r.price_value} (${r.price_value > 1 ? '+' : ''}${Math.round((r.price_value - 1) * 100)}%)`
    if (r.rule_type === 'time_based') return `${r.start_hour}:00–${r.end_hour}:00 → ${priceDesc}`
    if (r.rule_type === 'day_based') return `${(r.applies_to_days || []).map((d: number) => DAYS[d]).join(', ')} → ${priceDesc}`
    if (r.rule_type === 'last_minute') return `Within ${r.last_minute_hours}h of slot → ${priceDesc}`
    return priceDesc
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Dynamic Pricing</h1>
        <p>Set rules to automatically adjust slot prices based on time, day, or demand.</p>
      </div>

      {/* Presets */}
      {rules.length === 0 && !showForm && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>⚡ Quick presets:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {PRESETS.map(p => (
              <button key={p.name} onClick={() => applyPreset(p)}
                style={{ padding: '12px 16px', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {p.price_type === 'multiplier' ? `${p.price_value > 1 ? '+' : ''}${Math.round((p.price_value - 1) * 100)}%` : `₹${p.price_value}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Existing rules */}
      {rules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {rules.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>{r.rule_name}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{describeRule(r)}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${r.is_active ? 'badge-success' : ''}`}>{r.is_active ? 'Active' : 'Off'}</span>
                <button onClick={() => deleteRule(r.id)} className="btn btn-sm" style={{ color: '#ef4444' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Add Pricing Rule
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 style={{ marginBottom: 20 }}>New Pricing Rule</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Rule Name</label>
              <input value={form.rule_name} onChange={e => setForm(p => ({ ...p, rule_name: e.target.value }))} placeholder="e.g. Evening Premium" />
            </div>

            <div className="form-group">
              <label>Rule Type</label>
              <select value={form.rule_type} onChange={e => setForm(p => ({ ...p, rule_type: e.target.value }))}>
                {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {form.rule_type === 'time_based' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Start Hour (0–23)</label>
                  <input type="number" min={0} max={23} value={form.start_hour} onChange={e => setForm(p => ({ ...p, start_hour: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>End Hour (0–23)</label>
                  <input type="number" min={0} max={23} value={form.end_hour} onChange={e => setForm(p => ({ ...p, end_hour: +e.target.value }))} />
                </div>
              </div>
            )}

            {form.rule_type === 'day_based' && (
              <div className="form-group">
                <label>Days</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {DAYS.map((d, i) => (
                    <button key={i} type="button"
                      onClick={() => setForm(p => ({ ...p, applies_to_days: p.applies_to_days.includes(i) ? p.applies_to_days.filter(x => x !== i) : [...p.applies_to_days, i] }))}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid', borderColor: form.applies_to_days.includes(i) ? 'var(--color-primary)' : 'var(--color-border)', background: form.applies_to_days.includes(i) ? 'var(--color-primary)' : 'transparent', color: form.applies_to_days.includes(i) ? 'white' : 'inherit', cursor: 'pointer', fontWeight: 500 }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.rule_type === 'last_minute' && (
              <div className="form-group">
                <label>Hours before slot</label>
                <input type="number" min={1} value={form.last_minute_hours} onChange={e => setForm(p => ({ ...p, last_minute_hours: +e.target.value }))} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Price Adjustment</label>
                <select value={form.price_type} onChange={e => setForm(p => ({ ...p, price_type: e.target.value }))}>
                  {PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Value</label>
                <input type="number" step="0.01" value={form.price_value} onChange={e => setForm(p => ({ ...p, price_value: +e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={saveRule} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Save Rule'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
