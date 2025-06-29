// src/app/map-test/page.tsx
'use client'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Map from '@/components/Map'
import Auth from '@/components/Auth'

export default function MapTestPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1rem', fontSize: '2rem' }}>📍</div>
          <div>Loading Travlr...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '1.5rem' }}>📍</div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.5rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Travlr
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: '0.75rem', 
                color: 'var(--muted-foreground)' 
              }}>
                Pin Creation Test
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.875rem'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span>{user.email}</span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.reload()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)'
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{
                padding: '0.5rem 1rem',
                background: 'var(--accent)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.875rem'
              }}>
                Please log in to create pins
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {!user ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              alignItems: 'start'
            }}>
              {/* Map Preview */}
              <div>
                <div style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.5rem',
                  marginBottom: '1rem'
                }}>
                  <h2 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    🗺️ Interactive Map
                  </h2>
                  <p style={{
                    margin: '0 0 1.5rem 0',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.875rem'
                  }}>
                    Click anywhere on the map to create pins and build your collections.
                  </p>
                  <div style={{
                    height: '300px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden'
                  }}>
                    <Map />
                  </div>
                </div>

                <div style={{
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)'
                }}>
                  ℹ️ <strong>Note:</strong> Pin creation requires authentication. Please sign in to start creating your collections.
                </div>
              </div>

              {/* Auth Form */}
              <div>
                <Auth />
              </div>
            </div>
          ) : (
            <div>
              {/* Instructions */}
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <h2 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📍 Create Your First Pin
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      1️⃣ Click on the Map
                    </div>
                    <div style={{ color: 'var(--muted-foreground)' }}>
                      Click anywhere on the map where you want to create a pin
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      2️⃣ Fill the Form
                    </div>
                    <div style={{ color: 'var(--muted-foreground)' }}>
                      Add a title, description, category, and choose a collection
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      3️⃣ Create Pin
                    </div>
                    <div style={{ color: 'var(--muted-foreground)' }}>
                      Your pin will appear on the map with your chosen category icon
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Map */}
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.5rem',
                height: '600px'
              }}>
                <Map />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}