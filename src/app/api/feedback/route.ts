import { logger } from '@/lib/logger'
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit'
import { sanitizeString, validateEmail, validateStringLength } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'hunterbeezley'
const GITHUB_REPO = process.env.GITHUB_REPO || 'travlr'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 feedback submissions per 15 minutes per IP
    const rateLimitResponse = await checkRateLimit(request, RateLimitConfig.AUTH)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { feedback, type, userEmail, username, currentPage, userAgent } = body

    // Server-side validation
    const feedbackValidation = validateStringLength(feedback, 10, 2000, 'Feedback')
    if (!feedbackValidation.valid) {
      return NextResponse.json(
        { error: feedbackValidation.error },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (userEmail) {
      const emailValidation = validateEmail(userEmail)
      if (!emailValidation.valid) {
        return NextResponse.json(
          { error: emailValidation.error },
          { status: 400 }
        )
      }
    }

    // Sanitize inputs to prevent XSS
    const sanitizedFeedback = sanitizeString(feedback)
    const sanitizedUsername = sanitizeString(username)
    const sanitizedCurrentPage = sanitizeString(currentPage)

    // Validate type
    const validTypes = ['bug', 'feature', 'other']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    // Check if GitHub token is configured
    if (!GITHUB_TOKEN) {
      logger.error('GITHUB_TOKEN is not configured')
      return NextResponse.json(
        { error: 'Feedback system is not configured' },
        { status: 500 }
      )
    }

    // Determine issue title and labels based on type
    const typeConfig = {
      bug: { emoji: '🐛', label: 'bug', color: 'ef4444' },
      feature: { emoji: '✨', label: 'enhancement', color: '3b82f6' },
      other: { emoji: '💭', label: 'feedback', color: '8b5cf6' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.other

    const issueTitle = `${config.emoji} [${config.label.toUpperCase()}] ${sanitizedFeedback.slice(0, 60)}${sanitizedFeedback.length > 60 ? '...' : ''}`

    // Create issue body with metadata
    const issueBody = `## User Feedback

${sanitizedFeedback}

---

### Metadata
- **Type**: ${type}
- **Submitted by**: ${sanitizedUsername} (${userEmail})
- **Page**: \`${sanitizedCurrentPage}\`
- **User Agent**: \`${userAgent}\`
- **Timestamp**: ${new Date().toISOString()}

---

*This issue was automatically created from user feedback.*`

    // Create GitHub issue
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Travlr-Feedback-Bot'
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: [config.label, 'user-feedback']
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      logger.error('GitHub API error:', errorData)
      throw new Error(`GitHub API returned ${response.status}`)
    }

    const issue = await response.json()

    return NextResponse.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url
    })
  } catch (error) {
    logger.error('Error creating GitHub issue:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
