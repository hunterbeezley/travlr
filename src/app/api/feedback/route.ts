import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'hunterbeezley'
const GITHUB_REPO = process.env.GITHUB_REPO || 'travlr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedback, type, userEmail, username, currentPage, userAgent } = body

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: 'Feedback is required' },
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

    const issueTitle = `${config.emoji} [${config.label.toUpperCase()}] ${feedback.slice(0, 60)}${feedback.length > 60 ? '...' : ''}`

    // Create issue body with metadata
    const issueBody = `## User Feedback

${feedback}

---

### Metadata
- **Type**: ${type}
- **Submitted by**: ${username} (${userEmail})
- **Page**: \`${currentPage}\`
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
