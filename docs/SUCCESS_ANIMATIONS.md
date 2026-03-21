# Success Animations & Toast Variants

Travlr includes animated success states and enhanced toast notifications to provide satisfying user feedback for actions.

## SuccessAnimation Component

A standalone success animation component with an animated checkmark icon.

### Basic Usage

```tsx
import SuccessAnimation from '@/components/SuccessAnimation'

<SuccessAnimation
  title="Success!"
  description="Your collection was created."
  size="medium"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Success!"` | Title text displayed below the icon |
| `description` | `string` | `undefined` | Optional description text |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Size of the checkmark icon and container |

### Size Reference

- **small**: 40px container, 20px icon - For compact spaces
- **medium**: 48px container, 24px icon - Default, balanced size
- **large**: 64px container, 32px icon - For prominent success messages

### Examples

#### In a Modal

```tsx
function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="glass-modal" style={{
      padding: '2rem',
      borderRadius: 'var(--radius-lg)',
      maxWidth: '400px'
    }}>
      <SuccessAnimation
        title="Collection Created!"
        description="Your new collection is ready to fill with amazing places."
        size="large"
      />

      <button onClick={onClose} style={{ marginTop: '1.5rem' }}>
        View Collection
      </button>
    </div>
  )
}
```

#### Inline Success State

```tsx
function FormSuccess() {
  return (
    <div className="glass" style={{ padding: '1.5rem' }}>
      <SuccessAnimation
        title="Saved"
        description="Your changes have been saved."
        size="small"
      />
    </div>
  )
}
```

## Toast Component with Variants

Enhanced toast notifications with variant support and animations.

### Usage

```tsx
import Toast from '@/components/Toast'

// Success toast with animated checkmark
<Toast
  message="Collection created successfully!"
  variant="success"
  onClose={() => setShowToast(false)}
/>

// Error toast
<Toast
  message="Failed to save changes"
  variant="error"
  onClose={() => setShowToast(false)}
/>

// Warning toast
<Toast
  message="Your session is about to expire"
  variant="warning"
  onClose={() => setShowToast(false)}
/>

// Info toast
<Toast
  message="Tip: Use tags to organize your pins"
  variant="info"
  onClose={() => setShowToast(false)}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | *required* | Message text to display |
| `variant` | `'success' \| 'error' \| 'warning' \| 'info' \| 'default'` | `'default'` | Visual style and icon |
| `duration` | `number` | `3000` | Auto-close duration in milliseconds |
| `onClose` | `() => void` | *required* | Callback when toast closes |
| `icon` | `string` | `undefined` | Custom emoji icon (only used with `variant="default"`) |

### Variant Styles

#### Success
- **Icon**: Animated checkmark (scale-in animation)
- **Color**: Green (`rgb(34, 197, 94)`)
- **Use for**: Completed actions, successful operations

#### Error
- **Icon**: X icon
- **Color**: Red (`rgb(239, 68, 68)`)
- **Use for**: Failed operations, validation errors

#### Warning
- **Icon**: Alert circle
- **Color**: Yellow (`rgb(251, 191, 36)`)
- **Use for**: Caution messages, potential issues

#### Info
- **Icon**: Info icon
- **Color**: Blue (`rgb(59, 130, 246)`)
- **Use for**: Tips, helpful information, neutral updates

### Implementation Pattern

```tsx
'use client'
import { useState } from 'react'
import Toast from '@/components/Toast'

export default function MyComponent() {
  const [showToast, setShowToast] = useState(false)
  const [toastConfig, setToastConfig] = useState({
    message: '',
    variant: 'success' as const
  })

  const handleAction = async () => {
    try {
      // Perform action
      await createCollection()

      // Show success toast
      setToastConfig({
        message: 'Collection created!',
        variant: 'success'
      })
      setShowToast(true)
    } catch (error) {
      // Show error toast
      setToastConfig({
        message: 'Failed to create collection',
        variant: 'error'
      })
      setShowToast(true)
    }
  }

  return (
    <>
      <button onClick={handleAction}>Create Collection</button>

      {showToast && (
        <Toast
          message={toastConfig.message}
          variant={toastConfig.variant}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  )
}
```

## Recommended Actions for Success Toasts

Use success variant toasts for these key user actions:

### Collections
- ✅ Collection created
- ✅ Collection updated
- ✅ Collection deleted
- ✅ Collection saved/unsaved

### Pins
- ✅ Pin added to collection
- ✅ Pin removed from collection
- ✅ Pin updated
- ✅ Pin deleted

### Social Actions
- ✅ User followed
- ✅ User unfollowed
- ✅ Comment posted
- ✅ Reply sent

### Profile & Settings
- ✅ Profile updated
- ✅ Settings saved
- ✅ Password changed
- ✅ Email verified

### Sharing
- ✅ Link copied to clipboard
- ✅ Collection shared
- ✅ Invite sent

## Animation Details

### Scale-In Animation
The success checkmark uses a `scale-in` animation defined in `globals.css`:

```css
.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

This creates a smooth "pop-in" effect that feels satisfying and draws attention to the success state.

### Toast Slide-Up Animation
All toasts slide up from the bottom with a smooth cubic-bezier easing:

```css
@keyframes toastSlideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
```

## Accessibility

### SuccessAnimation
- Uses semantic HTML
- Clear visual feedback with icon + text
- Color is not the only indicator (icon shape provides meaning)

### Toast
- Uses `role="alert"` for screen readers
- Uses `aria-live="polite"` to announce messages
- Sufficient color contrast for all variants
- Auto-dismisses after 3 seconds (customizable)
- Can be manually dismissed

### Reduced Motion
Both components respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-scale-in {
    animation: none;
  }
}
```

Users with motion sensitivity will see instant appearance instead of animations.

## Best Practices

### Do ✅
- Use success toasts for completed actions
- Keep messages concise (< 50 characters ideal)
- Use consistent messaging across similar actions
- Show toast immediately after action completes
- Provide clear, specific messages ("Collection created!" not "Success!")

### Don't ❌
- Don't show success toasts for every tiny action
- Don't use multiple toasts simultaneously
- Don't make toasts too long (> 5 seconds)
- Don't use success variant for non-success messages
- Don't block user interaction with toasts

## Examples in Codebase

### Clipboard Copy
```tsx
// src/app/collections/[id]/CollectionPageClient.tsx
{showShareToast && (
  <Toast
    message="Link copied to clipboard!"
    variant="success"
    onClose={() => setShowShareToast(false)}
  />
)}
```

### Pin Creation
```tsx
// After creating a pin
const handleCreatePin = async () => {
  try {
    await createPin(pinData)
    setToastConfig({
      message: 'Pin added to collection!',
      variant: 'success'
    })
    setShowToast(true)
  } catch (error) {
    setToastConfig({
      message: 'Failed to create pin',
      variant: 'error'
    })
    setShowToast(true)
  }
}
```

---

**Issue:** #73
**Last Updated:** March 2026
