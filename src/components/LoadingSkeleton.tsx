'use client'

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'avatar' | 'collection'
  count?: number
}

export default function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
  const skeletonStyle = {
    background: 'linear-gradient(90deg, var(--muted) 25%, var(--card) 50%, var(--muted) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
    borderRadius: 'var(--radius)'
  }

  const renderSkeleton = () => {
    switch (type) {
      case 'avatar':
        return (
          <div
            style={{
              width: '100px',
              height: '100px',
              ...skeletonStyle
            }}
          />
        )

      case 'text':
        return (
          <div
            style={{
              width: '100%',
              height: '20px',
              marginBottom: '0.5rem',
              ...skeletonStyle
            }}
          />
        )

      case 'collection':
        return (
          <div
            style={{
              border: '1px solid var(--border)',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius)',
              background: 'var(--card)'
            }}
          >
            {/* Collection image skeleton */}
            <div
              style={{
                width: '100%',
                height: '200px',
                marginBottom: '1rem',
                ...skeletonStyle
              }}
            />

            {/* Title skeleton */}
            <div
              style={{
                width: '70%',
                height: '24px',
                marginBottom: '0.5rem',
                ...skeletonStyle
              }}
            />

            {/* Description skeleton */}
            <div
              style={{
                width: '100%',
                height: '16px',
                marginBottom: '0.25rem',
                ...skeletonStyle
              }}
            />
            <div
              style={{
                width: '80%',
                height: '16px',
                ...skeletonStyle
              }}
            />
          </div>
        )

      case 'card':
      default:
        return (
          <div
            style={{
              border: '1px solid var(--border)',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius)',
              background: 'var(--card)'
            }}
          >
            <div
              style={{
                width: '60%',
                height: '20px',
                marginBottom: '0.75rem',
                ...skeletonStyle
              }}
            />
            <div
              style={{
                width: '100%',
                height: '16px',
                marginBottom: '0.5rem',
                ...skeletonStyle
              }}
            />
            <div
              style={{
                width: '80%',
                height: '16px',
                ...skeletonStyle
              }}
            />
          </div>
        )
    }
  }

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ marginBottom: count > 1 ? 'var(--space-md)' : '0' }}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  )
}
