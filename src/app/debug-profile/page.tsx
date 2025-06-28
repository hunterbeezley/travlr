// Save this as: src/app/debug-profile/page.tsx
// This will help debug your profile update issue

'use client'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function ProfileDebugPage() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [isDebugging, setIsDebugging] = useState(false)

  const runDiagnostics = async () => {
    if (!user) {
      setDebugInfo('No user logged in')
      return
    }

    setIsDebugging(true)
    let debug = '=== PROFILE DEBUG DIAGNOSTICS ===\n\n'

    try {
      // 1. Check if users table exists and what columns it has
      debug += '1. Checking users table structure...\n'
      const { data: tableInfo, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(0)

      if (tableError) {
        debug += `❌ Users table error: ${tableError.message}\n`
        debug += `Code: ${tableError.code}\n`
        debug += `Details: ${tableError.details}\n\n`
      } else {
        debug += '✅ Users table exists\n\n'
      }

      // 2. Check current user data
      debug += '2. Checking current user data...\n'
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userError) {
        debug += `❌ User data error: ${userError.message}\n`
        debug += `Code: ${userError.code}\n`
        debug += `Details: ${userError.details}\n`
        
        if (userError.code === 'PGRST116') {
          debug += '🔍 This error means no user record exists yet.\n'
          debug += 'Let me try to create one...\n\n'
          
          // Try to create user record
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email
            })
            .select()
            .single()

          if (createError) {
            debug += `❌ Failed to create user record: ${createError.message}\n`
            debug += `Code: ${createError.code}\n`
            debug += `Details: ${createError.details}\n\n`
          } else {
            debug += '✅ User record created successfully!\n'
            debug += `Data: ${JSON.stringify(newUser, null, 2)}\n\n`
          }
        }
      } else {
        debug += '✅ User data found:\n'
        debug += `${JSON.stringify(userData, null, 2)}\n\n`
      }

      // 3. Test update with minimal data
      debug += '3. Testing profile update with minimal data...\n'
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id)

      if (updateError) {
        debug += `❌ Update test failed: ${updateError.message}\n`
        debug += `Code: ${updateError.code}\n`
        debug += `Details: ${updateError.details}\n\n`
      } else {
        debug += '✅ Basic update works!\n\n'
      }

      // 4. Check what columns exist by trying to update each field
      debug += '4. Testing individual column updates...\n'
      const fieldsToTest = ['username', 'full_name', 'bio', 'location', 'website']
      
      for (const field of fieldsToTest) {
        const { error: fieldError } = await supabase
          .from('users')
          .update({ [field]: null })
          .eq('id', user.id)

        if (fieldError) {
          debug += `❌ Column '${field}' error: ${fieldError.message}\n`
        } else {
          debug += `✅ Column '${field}' exists and updateable\n`
        }
      }

      debug += '\n5. Authentication info...\n'
      debug += `User ID: ${user.id}\n`
      debug += `User Email: ${user.email}\n`
      debug += `User metadata: ${JSON.stringify(user.user_metadata, null, 2)}\n`

    } catch (error) {
      debug += `💥 Unexpected error: ${error}\n`
    }

    setDebugInfo(debug)
    setIsDebugging(false)
  }

  const createMissingColumns = async () => {
    setIsDebugging(true)
    let result = '=== CREATING MISSING COLUMNS ===\n\n'

    try {
      // This won't work directly through supabase-js, but it will show you the SQL
      result += 'SQL commands to run in Supabase SQL Editor:\n\n'
      result += `
-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update the users table to set updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public' 
ORDER BY ordinal_position;
`

      result += '\n\nCopy the above SQL and run it in your Supabase dashboard under "SQL Editor".\n'
      result += 'Then come back and test your profile updates!\n'

    } catch (error) {
      result += `Error: ${error}\n`
    }

    setDebugInfo(result)
    setIsDebugging(false)
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Profile Debug - Please Log In</h1>
        <p>You need to be logged in to debug profile issues.</p>
        <a href="/">← Back to Home</a>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ marginBottom: '2rem' }}>Profile Debug Helper</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={runDiagnostics}
          disabled={isDebugging}
          style={{
            padding: '0.75rem 1.5rem',
            marginRight: '1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: isDebugging ? 'not-allowed' : 'pointer',
            opacity: isDebugging ? 0.5 : 1
          }}
        >
          {isDebugging ? 'Running Diagnostics...' : '🔍 Run Profile Diagnostics'}
        </button>

        <button
          onClick={createMissingColumns}
          disabled={isDebugging}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: isDebugging ? 'not-allowed' : 'pointer',
            opacity: isDebugging ? 0.5 : 1
          }}
        >
          🛠️ Generate Column Fix SQL
        </button>
      </div>

      {debugInfo && (
        <div>
          <h2>Debug Results:</h2>
          <pre style={{
            backgroundColor: '#f3f4f6',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            {debugInfo}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
        <h3>Quick Fix Instructions:</h3>
        <ol style={{ lineHeight: '1.6' }}>
          <li>Click "Run Profile Diagnostics" to see what's wrong</li>
          <li>If columns are missing, click "Generate Column Fix SQL"</li>
          <li>Copy the SQL and run it in your Supabase dashboard → SQL Editor</li>
          <li>Go back to your profile page and try editing again</li>
        </ol>
        
        <div style={{ marginTop: '1rem' }}>
          <a href="/profile" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            ← Back to Profile Page
          </a>
        </div>
      </div>
    </div>
  )
}