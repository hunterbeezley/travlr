'use client'
import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'nowrap'
      }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search collections..."
          style={{
            flex: '1 1 auto',
            minWidth: '0',
            padding: '0.75rem 1rem',
            background: 'var(--card)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--foreground)',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'var(--transition)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            transition: 'var(--transition)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          🔍 Search
        </button>
      </div>
    </form>
  )
}
