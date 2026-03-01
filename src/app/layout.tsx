import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Slotly — Smart Booking for Indian Consultants',
  description: 'Professional booking with GST invoicing for CAs, Lawyers, and Designers. Share your link, collect UPI payments, auto-generate GST invoices.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
