import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
  return gstinRegex.test(gstin.toUpperCase())
}

export function calculateGST(amount: number, isInterState: boolean = false) {
  if (isInterState) {
    const igst = Math.round(amount * 0.18)
    return { subtotal: amount, cgst: 0, sgst: 0, igst, total: amount + igst }
  } else {
    const cgst = Math.round(amount * 0.09)
    const sgst = Math.round(amount * 0.09)
    return { subtotal: amount, cgst, sgst, igst: 0, total: amount + cgst + sgst }
  }
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  let currentMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  while (currentMinutes + durationMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60)
    const m = currentMinutes % 60
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    currentMinutes += durationMinutes
  }
  return slots
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
