export default function FeedSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: 'var(--card)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}
        >
          {/* Header Skeleton */}
          <div style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--muted)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: '1rem',
                width: '60%',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                marginBottom: '0.5rem',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              <div style={{
                height: '0.75rem',
                width: '30%',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
            </div>
          </div>

          {/* Content Skeleton */}
          <div style={{ padding: '1rem' }}>
            <div style={{
              height: '1.5rem',
              width: '80%',
              background: 'var(--muted)',
              borderRadius: 'var(--radius)',
              marginBottom: '0.75rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              height: '1rem',
              width: '100%',
              background: 'var(--muted)',
              borderRadius: 'var(--radius)',
              marginBottom: '0.5rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              height: '1rem',
              width: '70%',
              background: 'var(--muted)',
              borderRadius: 'var(--radius)',
              marginBottom: '1rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />

            {/* Image Grid Skeleton */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  style={{
                    aspectRatio: '1',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
              ))}
            </div>

            {/* Stats Skeleton */}
            <div style={{
              display: 'flex',
              gap: '1rem'
            }}>
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  style={{
                    height: '0.75rem',
                    width: '4rem',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions Skeleton */}
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '1rem'
          }}>
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                style={{
                  height: '2.5rem',
                  width: '5rem',
                  background: 'var(--muted)',
                  borderRadius: 'var(--radius)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              />
            ))}
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
}
