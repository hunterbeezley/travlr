'use client'
import { logger } from '@/lib/logger'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logger.log('Service workers not supported')
      return
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        logger.log('Service Worker registered:', registration)

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // Check every hour

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, show update prompt
                logger.log('New service worker available')

                if (confirm('A new version of Travlr is available! Reload to update?')) {
                  newWorker.postMessage({ action: 'skipWaiting' })
                  window.location.reload()
                }
              }
            })
          }
        })
      })
      .catch((error) => {
        logger.error('Service Worker registration failed:', error)
      })

    // Handle controller change (when new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.log('New service worker activated')
    })

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      logger.log('Message from service worker:', event.data)
    })

    // Handle online/offline status
    const handleOnline = () => {
      logger.log('App is online')
      // You can show a toast notification here
    }

    const handleOffline = () => {
      logger.log('App is offline')
      // You can show a toast notification here
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return null
}
