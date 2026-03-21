/**
 * Server-side validation utilities
 * All user inputs should be validated server-side before processing
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return ''

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000) // Limit string length
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string | null | undefined): {
  valid: boolean
  sanitized: string
  error?: string
} {
  if (!email) {
    return { valid: false, sanitized: '', error: 'Email is required' }
  }

  const sanitized = email.trim().toLowerCase()

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized, error: 'Invalid email format' }
  }

  if (sanitized.length > 255) {
    return { valid: false, sanitized, error: 'Email is too long' }
  }

  return { valid: true, sanitized }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string | null | undefined): {
  valid: boolean
  error?: string
} {
  if (!uuid) {
    return { valid: false, error: 'UUID is required' }
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: 'Invalid UUID format' }
  }

  return { valid: true }
}

/**
 * Validate URL format
 */
export function validateURL(url: string | null | undefined): {
  valid: boolean
  sanitized: string
  error?: string
} {
  if (!url) {
    return { valid: false, sanitized: '', error: 'URL is required' }
  }

  const sanitized = url.trim()

  try {
    const parsed = new URL(sanitized)

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        valid: false,
        sanitized,
        error: 'URL must use HTTP or HTTPS protocol',
      }
    }

    return { valid: true, sanitized }
  } catch {
    return { valid: false, sanitized, error: 'Invalid URL format' }
  }
}

/**
 * Validate latitude coordinate
 */
export function validateLatitude(lat: number | null | undefined): {
  valid: boolean
  error?: string
} {
  if (lat === null || lat === undefined) {
    return { valid: false, error: 'Latitude is required' }
  }

  if (typeof lat !== 'number' || isNaN(lat)) {
    return { valid: false, error: 'Latitude must be a number' }
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' }
  }

  return { valid: true }
}

/**
 * Validate longitude coordinate
 */
export function validateLongitude(lng: number | null | undefined): {
  valid: boolean
  error?: string
} {
  if (lng === null || lng === undefined) {
    return { valid: false, error: 'Longitude is required' }
  }

  if (typeof lng !== 'number' || isNaN(lng)) {
    return { valid: false, error: 'Longitude must be a number' }
  }

  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' }
  }

  return { valid: true }
}

/**
 * Validate coordinates (lat, lng pair)
 */
export function validateCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
): {
  valid: boolean
  error?: string
} {
  const latResult = validateLatitude(lat)
  if (!latResult.valid) return latResult

  const lngResult = validateLongitude(lng)
  if (!lngResult.valid) return lngResult

  return { valid: true }
}

/**
 * Validate number within range
 */
export function validateNumber(
  value: number | null | undefined,
  min?: number,
  max?: number
): {
  valid: boolean
  error?: string
} {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Number is required' }
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Value must be a number' }
  }

  if (min !== undefined && value < min) {
    return { valid: false, error: `Value must be at least ${min}` }
  }

  if (max !== undefined && value > max) {
    return { valid: false, error: `Value must be at most ${max}` }
  }

  return { valid: true }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string | null | undefined,
  minLength?: number,
  maxLength?: number,
  fieldName: string = 'Field'
): {
  valid: boolean
  sanitized: string
  error?: string
} {
  if (!value) {
    return {
      valid: minLength ? false : true,
      sanitized: '',
      error: minLength ? `${fieldName} is required` : undefined,
    }
  }

  const sanitized = sanitizeString(value)

  if (minLength !== undefined && sanitized.length < minLength) {
    return {
      valid: false,
      sanitized,
      error: `${fieldName} must be at least ${minLength} characters`,
    }
  }

  if (maxLength !== undefined && sanitized.length > maxLength) {
    return {
      valid: false,
      sanitized,
      error: `${fieldName} must be at most ${maxLength} characters`,
    }
  }

  return { valid: true, sanitized }
}

/**
 * Validate boolean value
 */
export function validateBoolean(value: any): {
  valid: boolean
  sanitized: boolean
  error?: string
} {
  if (typeof value === 'boolean') {
    return { valid: true, sanitized: value }
  }

  if (value === 'true' || value === '1' || value === 1) {
    return { valid: true, sanitized: true }
  }

  if (value === 'false' || value === '0' || value === 0) {
    return { valid: true, sanitized: false }
  }

  return { valid: false, sanitized: false, error: 'Invalid boolean value' }
}

/**
 * Validate array of values
 */
export function validateArray<T>(
  value: any,
  validator: (item: any) => { valid: boolean; error?: string },
  minLength?: number,
  maxLength?: number
): {
  valid: boolean
  error?: string
} {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'Value must be an array' }
  }

  if (minLength !== undefined && value.length < minLength) {
    return {
      valid: false,
      error: `Array must have at least ${minLength} items`,
    }
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return { valid: false, error: `Array must have at most ${maxLength} items` }
  }

  for (let i = 0; i < value.length; i++) {
    const result = validator(value[i])
    if (!result.valid) {
      return { valid: false, error: `Item ${i}: ${result.error}` }
    }
  }

  return { valid: true }
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSizeMB: number
): {
  valid: boolean
  error?: string
} {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
    }
  }

  return { valid: true }
}

/**
 * Common validation presets
 */
export const ValidationPresets = {
  // Collection validation
  collectionTitle: (value: string | null | undefined) =>
    validateStringLength(value, 1, 100, 'Collection title'),
  collectionDescription: (value: string | null | undefined) =>
    validateStringLength(value, 0, 500, 'Collection description'),

  // Pin validation
  pinTitle: (value: string | null | undefined) =>
    validateStringLength(value, 1, 200, 'Pin title'),
  pinDescription: (value: string | null | undefined) =>
    validateStringLength(value, 0, 1000, 'Pin description'),

  // User validation
  username: (value: string | null | undefined) =>
    validateStringLength(value, 3, 30, 'Username'),
  bio: (value: string | null | undefined) =>
    validateStringLength(value, 0, 500, 'Bio'),

  // Image validation
  imageFile: (file: File) =>
    validateFile(file, ['image/jpeg', 'image/png', 'image/webp'], 5),
}
