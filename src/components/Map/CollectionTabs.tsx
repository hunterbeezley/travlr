'use client'

export type CollectionTabId = 'discover' | 'my-collections' | 'friends'

interface CollectionTabsProps {
  activeTab: CollectionTabId
  onTabChange: (tab: CollectionTabId) => void
  // Desktop sidebar buttons use 0.5rem vertical padding; the mobile bottom
  // sheet used a taller 0.6rem for a bigger touch target - preserved via
  // this override rather than silently dropping the mobile sizing.
  buttonPadding?: string
}

const TABS: Array<[CollectionTabId, string]> = [
  ['discover', 'Discover'],
  ['my-collections', 'Mine'],
  ['friends', 'Friends'],
]

export default function CollectionTabs({
  activeTab,
  onTabChange,
  buttonPadding = '0.5rem 0.5rem',
}: CollectionTabsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '0.4rem',
      marginBottom: '1rem',
      padding: '0.25rem',
      background: 'var(--muted)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)'
    }}>
      {TABS.map(([tab, label]) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          style={{
            flex: 1,
            padding: buttonPadding,
            background: activeTab === tab ? 'var(--accent)' : 'transparent',
            color: activeTab === tab ? 'white' : 'var(--foreground)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: '0.625rem',
            fontWeight: '700',
            transition: 'var(--transition)'
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
