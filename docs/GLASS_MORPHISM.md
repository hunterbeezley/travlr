# Glass Morphism System

Travlr uses a comprehensive glass morphism system for creating modern, translucent UI elements with backdrop blur effects.

## Available Glass Variants

### Standard Glass
**Usage:** Balanced transparency for cards, panels, floating elements
**Class:** `.glass`

```tsx
<div className="glass" style={{
  padding: '1.5rem',
  borderRadius: 'var(--radius-lg)'
}}>
  <h3>Glass Card</h3>
  <p>Balanced transparency with subtle backdrop blur</p>
</div>
```

**Properties:**
- Background: `rgba(255, 255, 255, 0.05)` (dark mode)
- Backdrop blur: `10px`
- Border: `1px solid rgba(255, 255, 255, 0.1)`

---

### Strong Glass
**Usage:** More prominent elements, hero sections, important cards
**Class:** `.glass-strong`

```tsx
<div className="glass-strong" style={{
  padding: '2rem',
  borderRadius: 'var(--radius-lg)'
}}>
  <h2>Featured Content</h2>
  <p>Higher contrast with stronger backdrop blur</p>
</div>
```

**Properties:**
- Background: `rgba(255, 255, 255, 0.1)` (dark mode)
- Backdrop blur: `20px` (stronger)
- Border: `1px solid rgba(255, 255, 255, 0.2)`

---

### Subtle Glass
**Usage:** Very subtle overlays, minimal visual weight
**Class:** `.glass-subtle`

```tsx
<div className="glass-subtle" style={{
  padding: '1rem',
  borderRadius: 'var(--radius)'
}}>
  <p>Barely-there glass effect</p>
</div>
```

**Properties:**
- Background: `rgba(39, 39, 42, 0.9)` (dark mode)
- Backdrop blur: `12px`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Note: Uses `!important` for consistency

---

### Dark Glass
**Usage:** Overlays, darkened backgrounds, photo backgrounds
**Class:** `.glass-dark`

```tsx
<div className="glass-dark" style={{
  padding: '1.5rem',
  borderRadius: 'var(--radius-lg)',
  color: 'white'
}}>
  <h3>Dark Overlay</h3>
  <p>Darker background for text contrast</p>
</div>
```

**Properties:**
- Background: `rgba(0, 0, 0, 0.3)` (dark mode)
- Backdrop blur: `10px`
- Border: `1px solid rgba(255, 255, 255, 0.1)`

---

### Modal Glass
**Usage:** Modal dialogs, popups
**Class:** `.glass-modal`

```tsx
<div className="glass-modal" style={{
  padding: '2rem',
  borderRadius: 'var(--radius-lg)',
  maxWidth: '500px'
}}>
  <h2>Modal Title</h2>
  <p>Modal content with glass effect</p>
</div>
```

**Properties:**
- Background: `rgba(39, 39, 42, 0.85)` (dark mode)
- Backdrop blur: `16px`
- Border: `1px solid rgba(255, 255, 255, 0.15)`

---

### Overlay Glass
**Usage:** Full-screen overlays, backdrop layers
**Class:** `.glass-overlay`

```tsx
<div className="glass-overlay" style={{
  position: 'fixed',
  inset: 0,
  zIndex: 50
}}>
  {/* Content */}
</div>
```

**Properties:**
- Background: `rgba(39, 39, 42, 0.95)` (dark mode)
- Backdrop blur: `8px`
- Border: `1px solid rgba(255, 255, 255, 0.08)`

## Light Mode

All glass variants automatically adjust for light mode:

```css
/* Dark Mode (default) */
.glass {
  background: rgba(255, 255, 255, 0.05);
}

/* Light Mode */
@media (prefers-color-scheme: light) {
  .glass {
    background: rgba(255, 255, 255, 0.7);
  }
}
```

## Design Principles

### When to Use Each Variant

1. **`.glass`** - Default choice for most cards and panels
2. **`.glass-strong`** - When you need more visual prominence
3. **`.glass-subtle`** - When you want minimal visual weight
4. **`.glass-dark`** - When you need contrast for light text
5. **`.glass-modal`** - For modal dialogs and popups
6. **`.glass-overlay`** - For full-screen backdrop layers

### Layering Glass Elements

You can layer glass elements for depth:

```tsx
<div className="glass-dark" style={{
  padding: '3rem',
  borderRadius: 'var(--radius-xl)'
}}>
  <div className="glass-strong" style={{
    padding: '2rem',
    borderRadius: 'var(--radius-lg)'
  }}>
    <div className="glass" style={{
      padding: '1rem',
      borderRadius: 'var(--radius)'
    }}>
      Nested glass elements
    </div>
  </div>
</div>
```

## Browser Support

Glass morphism uses `backdrop-filter`, which requires:
- Chrome/Edge 76+
- Firefox 103+
- Safari 9+ (`-webkit-backdrop-filter`)

All classes include both standard and `-webkit-` prefixed versions for maximum compatibility.

## Performance Considerations

1. **GPU Acceleration:** Backdrop blur is GPU-accelerated
2. **Use Sparingly:** Too many glass elements can impact performance
3. **Fixed Backgrounds:** Works best over static or slowly-moving backgrounds
4. **Avoid Over-nesting:** Limit nesting to 2-3 levels maximum

## Examples

### Glass Card with Content

```tsx
<div className="glass" style={{
  padding: '1.5rem',
  borderRadius: 'var(--radius-lg)',
  maxWidth: '400px'
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  }}>
    <div style={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'var(--accent)'
    }} />
    <div>
      <h3 style={{ margin: 0 }}>Username</h3>
      <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
        @username
      </p>
    </div>
  </div>
  <p>Glass card with user profile information</p>
</div>
```

### Modal with Dark Overlay

```tsx
{/* Overlay */}
<div className="glass-overlay" style={{
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}>
  {/* Modal */}
  <div className="glass-modal animate-scale-in" style={{
    padding: '2rem',
    borderRadius: 'var(--radius-lg)',
    maxWidth: '500px',
    width: '90%'
  }}>
    <h2>Confirm Action</h2>
    <p>Are you sure you want to proceed?</p>
    <div style={{
      display: 'flex',
      gap: '1rem',
      marginTop: '1.5rem'
    }}>
      <button>Cancel</button>
      <button>Confirm</button>
    </div>
  </div>
</div>
```

### Floating Action Button

```tsx
<button className="glass-strong animate-glow" style={{
  position: 'fixed',
  bottom: 'calc(5rem + env(safe-area-inset-bottom))',
  right: '1.5rem',
  width: 56,
  height: 56,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.5rem'
}}>
  ✨
</button>
```

### Hero Section with Glass

```tsx
<section style={{
  position: 'relative',
  minHeight: '60vh',
  backgroundImage: 'url(/hero-bg.jpg)',
  backgroundSize: 'cover',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}>
  <div className="glass-dark" style={{
    padding: '3rem',
    borderRadius: 'var(--radius-xl)',
    maxWidth: '600px',
    textAlign: 'center'
  }}>
    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
      Welcome to Travlr
    </h1>
    <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
      Discover amazing places with friends
    </p>
    <button className="glass-strong" style={{
      padding: '1rem 2rem',
      fontSize: '1rem',
      border: 'none',
      borderRadius: 'var(--radius)',
      cursor: 'pointer'
    }}>
      Get Started
    </button>
  </div>
</section>
```

## Combining with Animations

Glass elements work great with animations:

```tsx
<div className="glass animate-slide-up" style={{
  padding: '1.5rem',
  borderRadius: 'var(--radius-lg)'
}}>
  Animated glass card
</div>

<div className="glass-strong animate-float" style={{
  padding: '1rem',
  borderRadius: '50%',
  width: 64,
  height: 64
}}>
  🎉
</div>
```

## Best Practices

1. ✅ **Use appropriate variant** - Match the visual weight to the element's importance
2. ✅ **Add border-radius** - Glass works best with rounded corners
3. ✅ **Ensure contrast** - Make sure text is readable on glass backgrounds
4. ✅ **Test both themes** - Verify appearance in both dark and light modes
5. ❌ **Don't overuse** - Too much glass creates visual noise
6. ❌ **Don't over-blur** - Stick to the predefined blur amounts
7. ❌ **Don't forget padding** - Glass elements need internal spacing

---

**Issue:** #71
**Last Updated:** March 2026
