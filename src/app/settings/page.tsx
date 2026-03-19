'use client'
import { logger } from '@/lib/logger'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DatabaseService } from '@/lib/database'

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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
          Settings & Privacy
        </h1>
        <p style={{ color: '#666', marginBottom: '40px' }}>
          Manage your data and privacy settings
        </p>

        {/* Data Export Section */}
        <div style={{
          padding: '30px',
          background: '#f8f9fa',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
            📥 Download Your Data
          </h2>
          <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
            Export all your data including profile information, pins, collections, and followers.
            This will download a JSON file with all your information.
          </p>
          <button
            onClick={handleExportData}
            disabled={loading}
            style={{
              background: '#3b82f6',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Exporting...' : 'Download My Data'}
          </button>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
            GDPR Right to Data Portability
          </p>
        </div>

        {/* Account Deletion Section */}
        <div style={{
          padding: '30px',
          background: '#fff5f5',
          border: '2px solid #fecaca',
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#dc2626' }}>
            🗑️ Delete Account
          </h2>
          <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
            All your pins, collections, and profile information will be removed.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={loading}
            style={{
              background: '#dc2626',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            Delete My Account
          </button>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
            GDPR Right to Erasure
          </p>
        </div>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            marginTop: '30px',
            color: '#666',
            background: 'none',
            border: 'none',
            fontSize: '16px',
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
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#dc2626' }}>
              ⚠️ Confirm Account Deletion
            </h3>
            <p style={{ marginBottom: '20px', lineHeight: '1.6', color: '#666' }}>
              This will permanently delete:
            </p>
            <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#666' }}>
              <li>Your profile and account information</li>
              <li>All your pins and images</li>
              <li>All your collections</li>
              <li>All your follows and followers</li>
              <li>All your notifications</li>
            </ul>
            <p style={{ marginBottom: '20px', fontWeight: 'bold', color: '#dc2626' }}>
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
                border: '2px solid #ddd',
                borderRadius: '8px',
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
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
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
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
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
