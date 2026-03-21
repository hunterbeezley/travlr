# Announcement Banner Component

A dismissible banner component for displaying announcements, new features, or important notices at the top of the page.

## Features

- **Dismissible** - Users can close the banner
- **Persistent** - Remembers user preference via localStorage
- **Variants** - Three styles: info, success, warning
- **Animated** - Smooth slide-down entrance
- **Accessible** - Proper ARIA labels and keyboard support
- **Mobile Responsive** - Adapts to all screen sizes

## Usage

```tsx
import AnnouncementBanner from '@/components/AnnouncementBanner'

function MyPage() {
  return (
    <>
      <AnnouncementBanner id="voting-feature-launch" variant="info">
        🎉 New feature: You can now vote on collections!
      </AnnouncementBanner>

      {/* Rest of page content */}
    </>
  )
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `id` | `string` | Yes | - | Unique ID for localStorage key |
| `children` | `React.ReactNode` | Yes | - | Banner content (text, links, emojis) |
| `variant` | `'info' \| 'success' \| 'warning'` | No | `'info'` | Visual style variant |

## Variants

### Info (Default)
Red gradient for general announcements and new features.

```tsx
<AnnouncementBanner id="new-feature-2024" variant="info">
  ✨ Introducing photo lightbox! Click any image to view full-screen.
</AnnouncementBanner>
```

**Visual:**
- Gradient: Red (#E63946) → Darker red (#D62839)
- Use for: New features, updates, general announcements

### Success
Green gradient for positive news and achievements.

```tsx
<AnnouncementBanner id="milestone-10k-users" variant="success">
  🎉 We just hit 10,000 users! Thank you for being part of Travlr!
</AnnouncementBanner>
```

**Visual:**
- Gradient: Green (#22c55e) → Darker green (#16a34a)
- Use for: Milestones, achievements, positive news

### Warning
Yellow/orange gradient for important notices and alerts.

```tsx
<AnnouncementBanner id="maintenance-notice" variant="warning">
  ⚠️ Scheduled maintenance on March 25th from 2-4 AM PST.
</AnnouncementBanner>
```

**Visual:**
- Gradient: Yellow (#fbbf24) → Orange (#f59e0b)
- Use for: Maintenance notices, important updates, cautions

## Unique ID Guidelines

The `id` prop is critical for localStorage persistence. Follow these guidelines:

### Good IDs ✅
```tsx
// Feature launches
<AnnouncementBanner id="voting-feature-2024">

// Version announcements
<AnnouncementBanner id="v2-launch">

// Seasonal events
<AnnouncementBanner id="summer-2024-contest">

// Maintenance notices
<AnnouncementBanner id="maintenance-march-2024">
```

### Bad IDs ❌
```tsx
// Too generic (will hide all announcements)
<AnnouncementBanner id="announcement">

// Not descriptive
<AnnouncementBanner id="banner1">

// Using dates without context
<AnnouncementBanner id="2024-03-20">
```

**Best Practice:** Use descriptive IDs with the feature/event name and optionally a date/version.

## Content Guidelines

### Keep It Concise
Banners should be brief (1-2 sentences max):

```tsx
// Good ✅
<AnnouncementBanner id="new-maps">
  🗺️ New map styles available! Check out the satellite and terrain views.
</AnnouncementBanner>

// Too long ❌
<AnnouncementBanner id="new-maps">
  We're excited to announce that we've added three new map styles including
  satellite view, terrain view, and hybrid view. You can find these in the
  map settings menu located at the top right of the map interface.
</AnnouncementBanner>
```

### Use Emojis
Emojis add visual interest and context:

- 🎉 New features, celebrations
- ✨ Improvements, enhancements
- ⚠️ Warnings, important notices
- 🔧 Maintenance, updates
- 📢 Announcements
- 🎁 Special offers
- 🚀 Launches

### Include Actions
Add links or CTAs when appropriate:

```tsx
<AnnouncementBanner id="beta-program" variant="info">
  🚀 Join our beta program! <a href="/beta" style={{
    color: 'white',
    textDecoration: 'underline',
    fontWeight: 'bold'
  }}>Sign up now</a>
</AnnouncementBanner>
```

## Placement

### Above Navbar
Place before the `<Navbar>` component:

```tsx
export default function Layout({ children }) {
  return (
    <>
      <AnnouncementBanner id="feature-launch">
        🎉 New voting system is live!
      </AnnouncementBanner>
      <Navbar />
      {children}
    </>
  )
}
```

### Page-Specific
Place at the top of specific pages:

```tsx
export default function BetaPage() {
  return (
    <>
      <Navbar />
      <AnnouncementBanner id="beta-welcome" variant="info">
        👋 Welcome to the beta! Your feedback helps us improve.
      </AnnouncementBanner>
      <main>{/* Page content */}</main>
    </>
  )
}
```

## Examples

### New Feature Announcement

```tsx
<AnnouncementBanner id="collections-voting-mar-2024" variant="info">
  🎉 New! Vote on your favorite collections and see what's trending.
</AnnouncementBanner>
```

### Maintenance Notice

```tsx
<AnnouncementBanner id="maintenance-apr-2024" variant="warning">
  ⚠️ Scheduled maintenance: April 15th, 2-4 AM PST. Brief downtime expected.
</AnnouncementBanner>
```

### Milestone Celebration

```tsx
<AnnouncementBanner id="100k-pins-milestone" variant="success">
  🎉 Amazing! Our community has saved over 100,000 pins!
</AnnouncementBanner>
```

### Beta Program Invitation

```tsx
<AnnouncementBanner id="beta-invite-2024" variant="info">
  🚀 Be an early tester! <a
    href="/beta"
    style={{
      color: 'white',
      textDecoration: 'underline',
      fontWeight: 'bold',
      marginLeft: '0.5rem'
    }}
  >
    Join our beta program →
  </a>
</AnnouncementBanner>
```

### Limited Time Offer

```tsx
<AnnouncementBanner id="premium-sale-spring-2024" variant="success">
  🎁 Spring sale: Get 50% off Premium for the first month!
  <a
    href="/premium"
    style={{
      color: 'white',
      textDecoration: 'underline',
      fontWeight: 'bold',
      marginLeft: '0.5rem'
    }}
  >
    Upgrade now
  </a>
</AnnouncementBanner>
```

### Survey/Feedback Request

```tsx
<AnnouncementBanner id="user-survey-q2-2024" variant="info">
  📋 Help us improve! Take our 2-minute survey and get early access to new features.
</AnnouncementBanner>
```

## LocalStorage Management

### How It Works

When a user dismisses a banner, the component saves to localStorage:

```javascript
localStorage.setItem('banner-dismissed-voting-feature-2024', 'true')
```

### Manually Reset a Banner

To show a banner again (e.g., for testing):

```javascript
// In browser console
localStorage.removeItem('banner-dismissed-voting-feature-2024')
```

### Clear All Banners

```javascript
// In browser console
Object.keys(localStorage)
  .filter(key => key.startsWith('banner-dismissed-'))
  .forEach(key => localStorage.removeItem(key))
```

### Programmatically Reset

```tsx
function AdminPanel() {
  const resetBanner = (id: string) => {
    localStorage.removeItem(`banner-dismissed-${id}`)
    window.location.reload() // Refresh to show banner
  }

  return (
    <button onClick={() => resetBanner('voting-feature-2024')}>
      Reset Banner
    </button>
  )
}
```

## Accessibility

### ARIA Attributes

The banner includes proper ARIA attributes:

```tsx
<div role="banner" aria-label="Announcement">
  {/* Content */}
</div>

<button aria-label="Dismiss announcement">
  {/* Close icon */}
</button>
```

### Keyboard Support

- **Tab**: Navigate to dismiss button
- **Enter/Space**: Dismiss banner
- **Escape**: Could be added for dismiss (optional)

### Screen Readers

Screen readers will announce:
1. "Announcement banner" when focused
2. Banner content
3. "Dismiss announcement button"

## Animation

The banner slides down smoothly on mount:

```css
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Duration:** 0.3s with ease-out easing

**Reduced Motion:** Add support for prefers-reduced-motion:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-slide-down {
    animation: none;
  }
}
```

## Mobile Responsiveness

The banner is fully responsive:

- **Padding**: Adjusts for smaller screens
- **Text size**: 0.875rem (readable on mobile)
- **Button position**: Absolute positioning prevents overlap
- **Content**: Centered with flex layout

## Best Practices

### Do ✅

- Use descriptive, unique IDs
- Keep content brief (1-2 sentences)
- Include relevant emojis
- Choose appropriate variant
- Test on mobile devices
- Use for important announcements only

### Don't ❌

- Don't use for permanent notices (use static UI)
- Don't show multiple banners simultaneously
- Don't use vague IDs like "banner1"
- Don't include long paragraphs
- Don't abuse the feature (users will ignore)
- Don't forget to test dismiss functionality

## Testing Checklist

- [ ] Banner appears on page load (if not dismissed)
- [ ] Dismiss button closes banner
- [ ] Banner stays dismissed after refresh
- [ ] Different IDs show different banners
- [ ] Variants display correct colors
- [ ] Mobile layout is readable
- [ ] Links (if any) are clickable
- [ ] Keyboard navigation works
- [ ] Screen reader announces content

## Browser Support

**Features:**
- localStorage (all modern browsers)
- CSS gradients (all modern browsers)
- CSS animations (all modern browsers)

**Compatibility:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

---

**Issue:** #79
**Last Updated:** March 2026
