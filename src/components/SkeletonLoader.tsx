'use client'

interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  className?: string
}

export function Skeleton({ width = '100%', height = '1rem', borderRadius = 'var(--radius)', className }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--muted) 25%, var(--border) 50%, var(--muted) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
    >
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  )
}

export function CollectionPageSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      paddingTop: '80px'
    }}>
      {/* Navbar skeleton */}
      <nav className="navbar">
        <div className="navbar-content">
          <Skeleton width="150px" height="32px" />
          <Skeleton width="80px" height="36px" />
        </div>
      </nav>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Hero skeleton */}
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '3rem',
          marginBottom: '2rem'
        }}>
          <Skeleton width="60px" height="6px" borderRadius="3px" />
          <div style={{ marginTop: '1.5rem' }}>
            <Skeleton width="300px" height="2.5rem" />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Skeleton width="100%" height="1rem" />
            <div style={{ marginTop: '0.5rem' }}>
              <Skeleton width="80%" height="1rem" />
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Skeleton width="32px" height="32px" borderRadius="50%" />
            <div>
              <Skeleton width="120px" height="0.875rem" />
              <div style={{ marginTop: '0.25rem' }}>
                <Skeleton width="100px" height="0.75rem" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Skeleton width="250px" height="1.5rem" />
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
          gap: '1.5rem'
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <Skeleton width="100%" height="225px" borderRadius="0" />
              <div style={{ padding: '1.25rem' }}>
                <Skeleton width="70%" height="1rem" />
                <div style={{ marginTop: '0.5rem' }}>
                  <Skeleton width="100%" height="0.875rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PinPageSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      paddingTop: '80px'
    }}>
      {/* Navbar skeleton */}
      <nav className="navbar">
        <div className="navbar-content">
          <Skeleton width="150px" height="32px" />
          <Skeleton width="80px" height="36px" />
        </div>
      </nav>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Image skeleton */}
        <div style={{ marginBottom: '2rem' }}>
          <Skeleton width="100%" height="600px" />
        </div>

        {/* Pin info card skeleton */}
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Skeleton width="150px" height="32px" />
          </div>
          <Skeleton width="80%" height="2rem" />
          <div style={{ marginTop: '1rem' }}>
            <Skeleton width="100%" height="1rem" />
            <div style={{ marginTop: '0.5rem' }}>
              <Skeleton width="90%" height="1rem" />
            </div>
          </div>
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <Skeleton width="40px" height="40px" borderRadius="50%" />
            <div>
              <Skeleton width="80px" height="0.875rem" />
              <div style={{ marginTop: '0.25rem' }}>
                <Skeleton width="120px" height="1rem" />
              </div>
            </div>
          </div>
        </div>

        {/* Location card skeleton */}
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '2rem'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <Skeleton width="120px" height="1.25rem" />
          </div>
          <Skeleton width="100%" height="300px" />
        </div>
      </div>
    </div>
  )
}
