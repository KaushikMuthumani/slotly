import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page-center" style={{ textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h1 style={{ marginBottom: 12 }}>Page Not Found</h1>
        <p style={{ marginBottom: 28 }}>The page or booking link you're looking for doesn't exist.</p>
        <Link href="/" className="btn btn-primary">Go Home</Link>
      </div>
    </div>
  )
}
