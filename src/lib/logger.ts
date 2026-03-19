/**
 * Logger utility for consistent logging across the app
 * Only logs in development mode to keep production clean
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args)
  },

  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  },

  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args)
    }
  }
}
