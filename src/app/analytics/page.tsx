'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Auth from '@/components/Auth'
import {
  Library,
  MapPin,
  Eye,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  TrendingUp,
  BarChart3,
  Trophy,
} from 'lucide-react'

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, timeRange])

  const loadAnalytics = async () => {
    try {
      // Verify session exists
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        logger.error('No session found')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_user_analytics', {
        p_days: timeRange
      })

      if (error) throw error
      setAnalytics(data)
    } catch (error) {
      logger.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading analytics...</div>
      </div>
    )
  }

  const summary = analytics?.summary || {}
  const topCollections = analytics?.top_collections || []
  const engagementTrend = analytics?.engagement_trend || []

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem', paddingTop: '5rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid var(--border)'
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          fontFamily: 'var(--font-display)',
          marginBottom: '0.5rem'
        }}>
          Creator Analytics
        </h1>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem'
        }}>
          Track your collection performance and engagement
        </p>
      </div>

      {/* Time Range Selector */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setTimeRange(days)}
            style={{
              padding: '0.5rem 1rem',
              background: timeRange === days ? 'var(--accent)' : 'var(--muted)',
              color: timeRange === days ? 'white' : 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: '600',
              fontFamily: 'var(--font-body)'
            }}
          >
            {days} Days
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[
          { label: 'Collections', value: summary.total_collections || 0, icon: Library },
          { label: 'Total Pins', value: summary.total_pins || 0, icon: MapPin },
          { label: 'Views', value: summary.total_views || 0, icon: Eye },
          { label: 'Likes', value: summary.total_likes || 0, icon: Heart },
          { label: 'Saves', value: summary.total_saves || 0, icon: Bookmark },
          { label: 'Shares', value: summary.total_shares || 0, icon: Share2 },
          { label: 'Comments', value: summary.total_comments || 0, icon: MessageCircle },
          { label: 'Engagement', value: `${summary.avg_engagement_rate || 0}%`, icon: TrendingUp }
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--card)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              textAlign: 'center'
            }}
          >
            <stat.icon size={28} color="var(--accent)" style={{ marginBottom: '0.5rem' }} />
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              fontFamily: 'var(--font-body)',
              marginBottom: '0.25rem'
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Engagement Trend Chart */}
      {engagementTrend.length > 0 && (
        <div style={{
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '700',
            fontFamily: 'var(--font-display)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <BarChart3 size={20} color="var(--accent)" />
            Engagement Trend
          </h2>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {engagementTrend.slice(0, 14).map((day: any) => (
              <div
                key={day.date}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.8125rem'
                }}
              >
                <div style={{
                  minWidth: '80px',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--muted-foreground)'
                }}>
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={14} color="var(--muted-foreground)" /> {day.views}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Heart size={14} color="var(--muted-foreground)" /> {day.likes}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Bookmark size={14} color="var(--muted-foreground)" /> {day.saves}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Collections */}
      {topCollections.length > 0 && (
        <div style={{
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '700',
            fontFamily: 'var(--font-display)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Trophy size={20} color="var(--accent)" />
            Top Performing Collections
          </h2>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {topCollections.map((collection: any) => (
              <Link
                key={collection.collection_id}
                href={`/collections/${collection.collection_id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'var(--muted)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--background)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--muted)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    marginBottom: '0.25rem'
                  }}>
                    {collection.collection_name}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-body)',
                    display: 'flex',
                    gap: '1rem'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Eye size={13} /> {collection.views}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Heart size={13} /> {collection.likes}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Bookmark size={13} /> {collection.saves}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <TrendingUp size={13} /> {collection.engagement_rate}%
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {topCollections.length === 0 && (
        <div style={{
          padding: '3rem 1rem',
          textAlign: 'center',
          background: 'var(--muted)',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)'
        }}>
          <BarChart3 size={48} color="var(--muted-foreground)" style={{ marginBottom: '1rem' }} />
          <h3 style={{
            fontSize: '1.375rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-display)'
          }}>
            No Analytics Yet
          </h3>
          <p style={{
            color: 'var(--muted-foreground)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            Create some collections to start tracking analytics
          </p>
          <Link
            href="/profile"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: '600',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem'
            }}
          >
            Create Collection
          </Link>
        </div>
      )}
    </div>
    </>
  )
}
