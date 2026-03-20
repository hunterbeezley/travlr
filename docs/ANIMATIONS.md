# Animation System

Travlr uses a custom CSS animation system for rich micro-interactions throughout the app.

## Available Animations

### Float
**Usage:** Floating badges, decorative elements
**Class:** `animate-float`
**Duration:** 6s infinite

```tsx
<div className="animate-float">
  🏆 Badge
</div>
```

### Glow
**Usage:** Active/selected states, notifications
**Class:** `animate-glow`
**Duration:** 2s infinite alternate

```tsx
<button className="animate-glow">
  🔔 New Notification
</button>
```

### Pulse Slow
**Usage:** Background orbs, subtle attention
**Class:** `animate-pulse-slow`
**Duration:** 6s infinite

```tsx
<div className="animate-pulse-slow">
  ✨ Feature highlight
</div>
```

### Gradient Animation
**Usage:** Animated gradient backgrounds
**Class:** `animate-gradient-x`
**Duration:** 15s infinite
**Note:** Requires `background-size: 200% 200%`

```tsx
<div
  className="animate-gradient-x"
  style={{
    background: 'linear-gradient(90deg, #E63946, #FF6B6B, #E63946)',
    backgroundSize: '200% 200%'
  }}
>
  Animated gradient
</div>
```

### Scale In
**Usage:** Modal/toast entry animations
**Class:** `animate-scale-in`
**Duration:** 0.2s

```tsx
<div className="animate-scale-in">
  🎉 Success message
</div>
```

### Slide Up
**Usage:** List items, cards entering view
**Class:** `animate-slide-up`
**Duration:** 0.3s

```tsx
<div className="animate-slide-up">
  📋 List item
</div>
```

### Fade In Fast
**Usage:** Quick opacity transitions
**Class:** `animate-fade-in-fast`
**Duration:** 0.2s

```tsx
<div className="animate-fade-in-fast">
  Appearing content
</div>
```

## Stagger Animations

Use stagger classes to create sequential animations for lists:

```tsx
{items.map((item, index) => (
  <div
    key={item.id}
    className={`animate-slide-up stagger-${Math.min(index + 1, 5)}`}
  >
    {item.name}
  </div>
))}
```

Available stagger classes:
- `.stagger-1` - 0.05s delay
- `.stagger-2` - 0.1s delay
- `.stagger-3` - 0.15s delay
- `.stagger-4` - 0.2s delay
- `.stagger-5` - 0.25s delay

## Existing Animations

### Already Available
- `.fade-in` - Standard fade in (0.5s)
- `.fade-in-delay` - Fade in with 0.1s delay
- `.stagger-fade-in` - Fade in for sequential items
- `.slide-up-sharp` - Sharp slide up entrance

### Spinners
- `.spinner` - Loading spinner animation

## Accessibility

All animations automatically respect the user's motion preferences. If a user has `prefers-reduced-motion: reduce` enabled, all animations are disabled.

## Examples

### Notification Badge
```tsx
<div style={{
  position: 'relative',
  display: 'inline-block'
}}>
  <button>Messages</button>
  <span className="animate-glow" style={{
    position: 'absolute',
    top: -8,
    right: -8,
    background: 'var(--accent)',
    color: 'white',
    borderRadius: '50%',
    width: 20,
    height: 20,
    fontSize: '0.75rem'
  }}>
    3
  </span>
</div>
```

### Success Toast
```tsx
<div className="animate-scale-in" style={{
  background: 'var(--success)',
  padding: '1rem',
  borderRadius: 'var(--radius)'
}}>
  ✅ Collection saved successfully!
</div>
```

### Animated List
```tsx
<div>
  {collections.map((collection, i) => (
    <div
      key={collection.id}
      className={`animate-slide-up stagger-${Math.min(i + 1, 5)}`}
      style={{
        padding: '1rem',
        marginBottom: '0.5rem',
        background: 'var(--card)'
      }}
    >
      {collection.title}
    </div>
  ))}
</div>
```

### Floating Decorative Element
```tsx
<div className="animate-float" style={{
  position: 'absolute',
  top: 50,
  right: 50,
  fontSize: '2rem',
  opacity: 0.3
}}>
  ✨
</div>
```

## Best Practices

1. **Use sparingly** - Too many animations can be distracting
2. **Match context** - Use appropriate animations for the action (e.g., scale-in for appearing modals, slide-up for lists)
3. **Performance** - Animations use CSS transforms which are GPU-accelerated
4. **Accessibility** - Always consider users with motion sensitivity
5. **Duration** - Keep animations quick (< 0.5s) for UI feedback, slower (> 3s) for decorative elements

## Performance Notes

- All animations use `transform` and `opacity` which are GPU-accelerated
- No layout thrashing or repaints during animations
- Animations pause when tab is not visible (browser optimization)
- All animations respect `prefers-reduced-motion`

---

**Issue:** #77
**Last Updated:** March 2026
