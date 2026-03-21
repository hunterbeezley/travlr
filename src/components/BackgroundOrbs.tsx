'use client'

export default function BackgroundOrbs() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    >
      {/* Large orb - top left */}
      <div
        className="animate-pulse-slow"
        style={{
          position: 'absolute',
          top: '5rem',
          left: '5rem',
          width: '18rem',
          height: '18rem',
          background: 'radial-gradient(circle, rgba(230, 57, 70, 0.2) 0%, rgba(230, 57, 70, 0.05) 50%, transparent 100%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Extra large orb - bottom right */}
      <div
        className="animate-pulse-slow"
        style={{
          position: 'absolute',
          bottom: '10rem',
          right: '5rem',
          width: '24rem',
          height: '24rem',
          background: 'radial-gradient(circle, rgba(230, 57, 70, 0.15) 0%, rgba(230, 57, 70, 0.03) 50%, transparent 100%)',
          borderRadius: '50%',
          filter: 'blur(70px)',
          animationDelay: '2s'
        }}
      />

      {/* Medium orb - center */}
      <div
        className="animate-pulse-slow"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '16rem',
          height: '16rem',
          background: 'radial-gradient(circle, rgba(230, 57, 70, 0.18) 0%, rgba(230, 57, 70, 0.04) 50%, transparent 100%)',
          borderRadius: '50%',
          filter: 'blur(65px)',
          transform: 'translate(-50%, -50%)',
          animationDelay: '4s'
        }}
      />

      {/* Small orb - top right */}
      <div
        className="animate-pulse-slow"
        style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          width: '12rem',
          height: '12rem',
          background: 'radial-gradient(circle, rgba(230, 57, 70, 0.12) 0%, rgba(230, 57, 70, 0.02) 50%, transparent 100%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          animationDelay: '6s'
        }}
      />

      {/* Accent orb - bottom left */}
      <div
        className="animate-pulse-slow"
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '15%',
          width: '14rem',
          height: '14rem',
          background: 'radial-gradient(circle, rgba(230, 57, 70, 0.16) 0%, rgba(230, 57, 70, 0.03) 50%, transparent 100%)',
          borderRadius: '50%',
          filter: 'blur(55px)',
          animationDelay: '8s'
        }}
      />
    </div>
  )
}
