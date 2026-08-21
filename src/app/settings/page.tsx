'use client'
import { logger } from '@/lib/logger'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DatabaseService } from '@/lib/database'
import { Download, Trash2, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')

  const handleExportData = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await DatabaseService.exportUserData()

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `travlr-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert('Your data has been exported successfully!')
    } catch (err: any) {
      logger.error('Export error:', err)
      setError(err.message || 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await DatabaseService.deleteUserAccount()

      if (result.success) {
        alert('Your account has been deleted successfully. You will be redirected to the home page.')
        router.push('/')
      } else {
        setError(result.error || 'Failed to delete account')
      }
    } catch (err: any) {
      logger.error('Delete account error:', err)
      setError(err.message || 'Failed to delete account')
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'var(--card-elevated)',
        color: 'var(--foreground)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', fontFamily: 'var(--font-display)', marginBottom: '10px' }}>
          Settings & Privacy
        </h1>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: '40px' }}>
          Manage your data and privacy settings
        </p>

        {/* Data Export Section */}
        <div style={{
          padding: '30px',
          background: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: 'var(--font-display)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Download size={20} color="var(--accent)" />
            Download Your Data
          </h2>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '20px', lineHeight: '1.6' }}>
            Export all your data including profile information, pins, collections, and followers.
            This will download a JSON file with all your information.
          </p>
          <button
            onClick={handleExportData}
            disabled={loading}
            style={{
              background: 'var(--accent)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 'var(--radius)',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: 'var(--font-body)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Exporting...' : 'Download My Data'}
          </button>
          <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '10px' }}>
            GDPR Right to Data Portability
          </p>
        </div>

        {/* Account Deletion Section */}
        <div style={{
          padding: '30px',
          background: 'var(--color-red-subtle)',
          border: '2px solid var(--color-red-muted)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: 'var(--font-display)',
            marginBottom: '10px',
            color: 'var(--destructive)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Trash2 size={20} color="var(--destructive)" />
            Delete Account
          </h2>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '20px', lineHeight: '1.6' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
            All your pins, collections, and profile information will be removed.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            style={{
              background: 'var(--destructive)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 'var(--radius)',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: 'var(--font-body)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            Delete My Account
          </button>
          <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '10px' }}>
            GDPR Right to Erasure
          </p>
        </div>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'var(--color-red-subtle)',
            border: '1px solid var(--color-red-muted)',
            borderRadius: 'var(--radius)',
            color: 'var(--destructive)'
          }}>
            {error}
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            marginTop: '30px',
            color: 'var(--muted-foreground)',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--card-elevated)',
            color: 'var(--foreground)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-display)',
              marginBottom: '20px',
              color: 'var(--destructive)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertTriangle size={22} color="var(--destructive)" />
              Confirm Account Deletion
            </h3>
            <p style={{ marginBottom: '20px', lineHeight: '1.6', color: 'var(--muted-foreground)' }}>
              This will permanently delete:
            </p>
            <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: 'var(--muted-foreground)' }}>
              <li>Your profile and account information</li>
              <li>All your pins and images</li>
              <li>All your collections</li>
              <li>All your follows and followers</li>
              <li>All your notifications</li>
            </ul>
            <p style={{ marginBottom: '20px', fontWeight: 'bold', color: 'var(--destructive)' }}>
              This action cannot be undone!
            </p>
            <p style={{ marginBottom: '10px', fontWeight: '600' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE"
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '16px',
                marginBottom: '20px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmation('')
                  setError('')
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: '16px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmation !== 'DELETE'}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--destructive)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: '16px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-body)',
                  cursor: (loading || deleteConfirmation !== 'DELETE') ? 'not-allowed' : 'pointer',
                  opacity: (loading || deleteConfirmation !== 'DELETE') ? 0.5 : 1
                }}
              >
                {loading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
