'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Auth from '@/components/Auth'
import { Mail, Bell } from 'lucide-react'

interface NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
  digest_frequency: 'daily' | 'weekly' | 'never'
  notify_on_like: boolean
  notify_on_save: boolean
  notify_on_comment: boolean
  notify_on_follow: boolean
  notify_on_mention: boolean
}

export default function NotificationSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    digest_frequency: 'daily',
    notify_on_like: true,
    notify_on_save: true,
    notify_on_comment: true,
    notify_on_follow: true,
    notify_on_mention: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase.rpc('get_notification_preferences')

      if (error) throw error

      if (data && data.length > 0) {
        setPreferences(data[0])
      }
    } catch (error) {
      logger.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase.rpc('update_notification_preferences', {
        p_email_notifications: preferences.email_notifications,
        p_push_notifications: preferences.push_notifications,
        p_digest_frequency: preferences.digest_frequency,
        p_notify_on_like: preferences.notify_on_like,
        p_notify_on_save: preferences.notify_on_save,
        p_notify_on_comment: preferences.notify_on_comment,
        p_notify_on_follow: preferences.notify_on_follow,
        p_notify_on_mention: preferences.notify_on_mention
      })

      if (error) throw error

      setMessage('Preferences saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      logger.error('Error saving preferences:', error)
      setMessage('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>Loading preferences...</div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem', paddingTop: '5rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid var(--border)'
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            padding: 0
          }}
        >
          ← Back
        </button>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          fontFamily: 'var(--font-display)',
          margin: 0
        }}>
          Notification Settings
        </h1>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem',
          marginTop: '0.5rem'
        }}>
          Manage how you receive notifications
        </p>
      </div>

      {/* Delivery Settings */}
      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1rem'
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
          <Mail size={18} color="var(--accent)" />
          Delivery Channels
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem',
            background: 'var(--muted)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer'
          }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>Email Notifications</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Receive notifications via email
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_notifications}
              onChange={(e) => updatePreference('email_notifications', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem',
            background: 'var(--muted)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer'
          }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>Push Notifications</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Receive push notifications in your browser
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.push_notifications}
              onChange={(e) => updatePreference('push_notifications', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </label>

          <div style={{
            padding: '0.75rem',
            background: 'var(--muted)',
            borderRadius: 'var(--radius)'
          }}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Digest Frequency
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.75rem' }}>
              How often to receive email digests
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['daily', 'weekly', 'never'].map((freq) => (
                <button
                  key={freq}
                  onClick={() => updatePreference('digest_frequency', freq)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: preferences.digest_frequency === freq ? 'var(--accent)' : 'var(--background)',
                    color: preferences.digest_frequency === freq ? 'white' : 'var(--foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Settings */}
      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1rem'
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
          <Bell size={18} color="var(--accent)" />
          Activity Notifications
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {[
            { key: 'notify_on_like', label: 'Likes', desc: 'Someone likes your collection' },
            { key: 'notify_on_save', label: 'Saves', desc: 'Someone saves your collection' },
            { key: 'notify_on_comment', label: 'Comments', desc: 'Someone comments on your collection' },
            { key: 'notify_on_follow', label: 'Follows', desc: 'Someone starts following you' },
            { key: 'notify_on_mention', label: 'Mentions', desc: 'Someone mentions you in a comment' }
          ].map(({ key, label, desc }) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  {desc}
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences[key as keyof NotificationPreferences] as boolean}
                onChange={(e) => updatePreference(key as keyof NotificationPreferences, e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: saving ? 'var(--muted)' : 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius)',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>

      {/* Success/Error Message */}
      {message && (
        <div style={{
          padding: '0.75rem',
          background: message.includes('success') ? 'var(--success)' : 'var(--destructive)',
          color: 'white',
          borderRadius: 'var(--radius)',
          textAlign: 'center',
          fontSize: '0.875rem'
        }}>
          {message}
        </div>
      )}
    </div>
    </>
  )
}
