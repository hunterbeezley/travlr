

interface UserAvatarProps {
  profileImageUrl?: string | null
  email: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function UserAvatar({ 
  profileImageUrl, 
  email, 
  size = 'medium',
  className = '' 
}: UserAvatarProps) {
  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return {
          width: '1.5rem',
          height: '1.5rem',
          fontSize: '0.65rem'
        }
      case 'large':
        return {
          width: '6rem',
          height: '6rem',
          fontSize: '2rem'
        }
      case 'medium':
      default:
        return {
          width: '2rem',
          height: '2rem',
          fontSize: '0.875rem'
        }
    }
  }

  const sizeStyles = getSizeStyles(size)

  return (
    <div 
      className={`user-avatar ${className}`}
      style={{
        ...sizeStyles,
        borderRadius: '50%',
        background: profileImageUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '600',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {profileImageUrl ? (
        <img 
          src={profileImageUrl} 
          alt="Profile" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            borderRadius: '50%'
          }}
        />
      ) : (
        getUserInitials(email)
      )}
    </div>
  )
}