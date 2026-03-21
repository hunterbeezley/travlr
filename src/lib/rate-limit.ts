import { RateLimiter } from 'limiter'

interface RateLimitStore {
  [key: string]: {
    limiter: RateLimiter
    lastReset: number
  }
}

// In-memory store for rate limiters (per IP address)
const limiters: RateLimitStore = {}

// Cleanup old limiters every 10 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(limiters).forEach((key) => {
    if (now - limiters[key].lastReset > 600000) {
      // 10 minutes
      delete limiters[key]
    }
  })
}, 600000)

/**
 * Rate limiting configuration presets
 */
export const RateLimitConfig = {
  // Authentication endpoints: 5 requests per 15 minutes per IP
  AUTH: {
    tokensPerInterval: 5,
    interval: 'minute' as const,
    intervalMultiplier: 15,
  },
  // API endpoints: 100 requests per minute per IP
  API: {
    tokensPerInterval: 100,
    interval: 'minute' as const,
    intervalMultiplier: 1,
  },
  // Search endpoints: 30 requests per minute per IP
  SEARCH: {
    tokensPerInterval: 30,
    interval: 'minute' as const,
    intervalMultiplier: 1,
  },
  // File upload endpoints: 10 requests per hour per IP
  UPLOAD: {
    tokensPerInterval: 10,
    interval: 'hour' as const,
    intervalMultiplier: 1,
  },
} as const

/**
 * Get or create a rate limiter for a specific identifier and config
 */
function getLimiter(
  identifier: string,
  config: (typeof RateLimitConfig)[keyof typeof RateLimitConfig]
) {
  const key = `${identifier}:${config.tokensPerInterval}:${config.interval}`

  if (!limiters[key]) {
    limiters[key] = {
      limiter: new RateLimiter({
        tokensPerInterval: config.tokensPerInterval,
        interval: config.interval,
      }),
      lastReset: Date.now(),
    }
  }

  return limiters[key].limiter
}

/**
 * Rate limit a request based on IP address
 * @param identifier - Usually the IP address
 * @param config - Rate limit configuration preset
 * @returns true if rate limit exceeded, false otherwise
 */
export async function rateLimit(
  identifier: string,
  config: (typeof RateLimitConfig)[keyof typeof RateLimitConfig]
): Promise<boolean> {
  const limiter = getLimiter(identifier, config)
  const tokensRemaining = await limiter.removeTokens(1)

  // If no tokens remaining, rate limit exceeded
  return tokensRemaining < 0
}

/**
 * Get the client IP address from a request
 */
export function getClientIp(request: Request): string {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  // Return the first available IP
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a default (should not happen in production)
  return 'unknown'
}

/**
 * Middleware helper to check rate limit and return 429 if exceeded
 */
export async function checkRateLimit(
  request: Request,
  config: (typeof RateLimitConfig)[keyof typeof RateLimitConfig]
): Promise<Response | null> {
  const ip = getClientIp(request)
  const isRateLimited = await rateLimit(ip, config)

  if (isRateLimited) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please try again later',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    )
  }

  return null
}
