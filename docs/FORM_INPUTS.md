# Enhanced Form Input States

Travlr uses enhanced form input states with clear visual feedback for focus, validation, and special styling.

## Default Input Styles

All form inputs use consistent base styling:

```tsx
<input
  type="text"
  className="form-input"
  placeholder="Enter your name"
/>
```

**Features:**
- Border radius with rounded corners
- Monospace font (var(--font-mono))
- Smooth transitions (0.2s ease)
- Focus state with background change
- Uppercase placeholder text

## Focus States

### Standard Focus
When an input receives focus, it displays:
- **Background**: Light red tint (5% opacity)
- **Border**: Red muted color
- **Shadow**: 3px focus ring with subtle red

```css
.form-input:focus {
  outline: none;
  background: rgba(230, 57, 70, 0.05);
  border-color: var(--color-red-muted);
  box-shadow: 0 0 0 3px var(--color-red-subtle);
}
```

This applies to:
- `<input>` with `.form-input` class
- `<textarea>` elements
- `<select>` dropdowns

## Validation States

### Error State

Use `.form-input-error` for validation errors:

```tsx
<input
  type="email"
  className="form-input form-input-error"
  placeholder="Email address"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" style={{ color: 'var(--color-red)', fontSize: '0.75rem' }}>
  Please enter a valid email address
</p>
```

**Visual Changes:**
- **Border**: Red color
- **Background**: Red tint (10% opacity)
- **Focus**: Background increases to 15% opacity
- **Focus ring**: Red shadow at 20% opacity

### Success State

Use `.form-input-success` for valid inputs:

```tsx
<input
  type="email"
  className="form-input form-input-success"
  placeholder="Email address"
  aria-invalid="false"
/>
```

**Visual Changes:**
- **Border**: Green color (#22c55e)
- **Background**: Green tint (5% opacity)
- **Focus**: Background increases to 8% opacity
- **Focus ring**: Green shadow at 15% opacity

## Glass Morphism Variant

Use `.input-glass` for transparent, blurred inputs:

```tsx
<input
  type="text"
  className="form-input input-glass"
  placeholder="Search..."
/>
```

**Visual Changes:**
- **Background**: Translucent white (5% opacity)
- **Backdrop blur**: 10px blur effect
- **Border**: White with transparency
- **Focus**: Red tinted background (8% opacity)

**Best used on:**
- Search bars over images
- Floating forms over backgrounds
- Modal/overlay inputs

## Form Elements

### Text Input

```tsx
<div style={{ marginBottom: '1rem' }}>
  <label htmlFor="username" style={{
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }}>
    Username
  </label>
  <input
    id="username"
    type="text"
    className="form-input"
    placeholder="Enter username"
    required
  />
</div>
```

### Textarea

```tsx
<div style={{ marginBottom: '1rem' }}>
  <label htmlFor="bio" style={{
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }}>
    Bio
  </label>
  <textarea
    id="bio"
    placeholder="Tell us about yourself"
    rows={4}
    style={{ minHeight: '100px' }}
  />
</div>
```

**Features:**
- Min-height: 100px
- Vertical resize only
- Same focus states as inputs
- Uppercase placeholder

### Select Dropdown

```tsx
<div style={{ marginBottom: '1rem' }}>
  <label htmlFor="category" style={{
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }}>
    Category
  </label>
  <select id="category">
    <option value="">Select a category</option>
    <option value="food">🍽️ Food & Drink</option>
    <option value="nature">🌲 Nature</option>
    <option value="culture">🎨 Culture</option>
  </select>
</div>
```

## Validation Pattern

```tsx
'use client'
import { useState } from 'react'

function ContactForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailValid, setEmailValid] = useState(false)

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) {
      setEmailError('Email is required')
      setEmailValid(false)
    } else if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email')
      setEmailValid(false)
    } else {
      setEmailError('')
      setEmailValid(true)
    }
  }

  return (
    <form>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          className={`form-input ${emailError ? 'form-input-error' : emailValid ? 'form-input-success' : ''}`}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            validateEmail(e.target.value)
          }}
          onBlur={() => validateEmail(email)}
          placeholder="your@email.com"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError && (
          <p
            id="email-error"
            style={{
              color: 'var(--color-red)',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {emailError}
          </p>
        )}
      </div>
    </form>
  )
}
```

## Accessibility

### ARIA Attributes

**Invalid Input:**
```tsx
<input
  className="form-input form-input-error"
  aria-invalid="true"
  aria-describedby="input-error"
/>
<span id="input-error" role="alert">Error message</span>
```

**Valid Input:**
```tsx
<input
  className="form-input form-input-success"
  aria-invalid="false"
/>
```

### Focus Visible

All inputs have clear focus indicators:
- Visible focus ring (3px shadow)
- Background color change
- Border color change
- High contrast for accessibility

### Keyboard Navigation

- All inputs support Tab navigation
- Select dropdowns support arrow keys
- Enter submits forms
- Escape clears/cancels (custom behavior)

## Best Practices

### Do ✅

- Use consistent `.form-input` class on all inputs
- Add validation states (error/success) for user feedback
- Include descriptive labels with `htmlFor` matching input `id`
- Use placeholder text for examples, not instructions
- Test focus states with keyboard navigation
- Provide error messages with `aria-describedby`

### Don't ❌

- Don't skip label elements (accessibility)
- Don't use placeholder as the only label
- Don't mix validation state classes (error + success)
- Don't disable autofill (bad UX)
- Don't remove focus styles (accessibility)
- Don't use generic error messages

## Styling Combinations

### Search Input with Glass

```tsx
<div style={{
  position: 'relative',
  background: 'url(/hero.jpg)',
  padding: '3rem',
  borderRadius: 'var(--radius-xl)'
}}>
  <input
    type="search"
    className="form-input input-glass"
    placeholder="Search collections"
    style={{
      fontSize: '1.125rem',
      padding: '1rem 1.5rem'
    }}
  />
</div>
```

### Inline Form with Error

```tsx
<form style={{ display: 'flex', gap: '0.5rem' }}>
  <input
    type="email"
    className="form-input form-input-error"
    placeholder="Enter email"
    style={{ flex: 1 }}
  />
  <button type="submit" className="btn-gradient">
    Subscribe
  </button>
</form>
```

### Multi-Step Form

```tsx
function MultiStepForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [validated, setValidated] = useState({
    name: false,
    email: false,
    password: false
  })

  return (
    <form>
      {step === 1 && (
        <input
          className={`form-input ${validated.name ? 'form-input-success' : ''}`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Full Name"
        />
      )}
      {/* More steps... */}
    </form>
  )
}
```

## Browser Support

**Focus States:**
- All modern browsers (Chrome, Firefox, Safari, Edge)
- IE 11+ (with polyfills)

**Backdrop Blur (Glass Variant):**
- Chrome/Edge 76+
- Firefox 103+
- Safari 9+ (with -webkit- prefix)

**Transitions:**
- All modern browsers
- Respects `prefers-reduced-motion`

---

**Issue:** #78
**Last Updated:** March 2026
