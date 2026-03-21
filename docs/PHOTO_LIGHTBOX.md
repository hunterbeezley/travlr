# Photo Lightbox Component

Full-screen photo viewing component with navigation, keyboard controls, and mobile swipe support.

## Usage

```tsx
import PhotoLightbox from '@/components/PhotoLightbox'
import { useState } from 'react'

function MyComponent() {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const images = [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
    'https://example.com/photo3.jpg'
  ]

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      {/* Thumbnail grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Photo ${index + 1}`}
            onClick={() => openLightbox(index)}
            style={{ cursor: 'pointer', borderRadius: 'var(--radius)' }}
          />
        ))}
      </div>

      {/* Lightbox */}
      <PhotoLightbox
        images={images}
        initialIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `images` | `string[]` | Yes | Array of image URLs to display |
| `initialIndex` | `number` | No | Index of initial image to show (default: 0) |
| `isOpen` | `boolean` | Yes | Controls visibility of lightbox |
| `onClose` | `() => void` | Yes | Callback when lightbox closes |

## Features

### Navigation

**Keyboard Controls:**
- **←** Previous image
- **→** Next image
- **Esc** Close lightbox

**Mouse Controls:**
- **Prev/Next buttons** - Navigate between images
- **Close button** (top right) - Close lightbox
- **Click backdrop** - Close lightbox

**Touch Controls:**
- **Swipe left** - Next image
- **Swipe right** - Previous image
- Minimum swipe distance: 50px

### Visual Elements

**Image Counter:**
- Displays current position (e.g., "3 / 10")
- Positioned at top center
- Glass morphism styling

**Navigation Buttons:**
- Prev/Next arrows on sides
- Hidden when at boundaries
- Glass morphism with hover effects
- Scale animation on hover

**Close Button:**
- X icon at top right
- Glass morphism styling
- Hover effect

**Loading State:**
- Spinner shown while image loads
- Fades in smoothly when loaded
- Prevents layout shift

### Accessibility

**ARIA Labels:**
- Close button: "Close lightbox"
- Previous button: "Previous image"
- Next button: "Next image"

**Image Alt Text:**
- Descriptive alt text: "Image X of Y"

**Keyboard Navigation:**
- All controls accessible via keyboard
- Escape key to close
- Arrow keys to navigate

**Body Scroll:**
- Prevents background scrolling when open
- Restores scroll on close

## Styling

**Backdrop:**
- Dark overlay: `rgba(0, 0, 0, 0.95)`
- Backdrop blur: 8px
- Smooth fade-in animation

**Buttons:**
- Glass morphism effect
- White borders with transparency
- Backdrop blur
- Hover states with scale/opacity

**Image:**
- Max size: 90vw x 90vh
- Object-fit: contain (preserves aspect ratio)
- Rounded corners
- Drop shadow for depth

**Transitions:**
- Fade-in animation for overlay
- Image opacity transition on load
- Button hover transitions

## Examples

### Single Image Viewer

```tsx
function ImageViewer({ imageUrl }: { imageUrl: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <img
        src={imageUrl}
        onClick={() => setOpen(true)}
        style={{ cursor: 'pointer' }}
      />

      <PhotoLightbox
        images={[imageUrl]}
        initialIndex={0}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
```

### Pin Image Gallery

```tsx
function PinImageGallery({ pin }: { pin: Pin }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const images = [
    pin.image_url, // Primary image
    ...pin.additional_images.map(img => img.url) // Additional images
  ].filter(Boolean)

  return (
    <>
      {/* Primary Image */}
      <img
        src={pin.image_url}
        alt={pin.title}
        onClick={() => {
          setCurrentIndex(0)
          setLightboxOpen(true)
        }}
        style={{ cursor: 'pointer' }}
      />

      {/* Additional Images */}
      {pin.additional_images.map((img, idx) => (
        <img
          key={img.id}
          src={img.url}
          alt={`${pin.title} ${idx + 2}`}
          onClick={() => {
            setCurrentIndex(idx + 1)
            setLightboxOpen(true)
          }}
          style={{ cursor: 'pointer' }}
        />
      ))}

      {/* Lightbox */}
      <PhotoLightbox
        images={images}
        initialIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
```

### Collection Cover Photos

```tsx
function CollectionCoverGallery({ collections }: { collections: Collection[] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const coverImages = collections
    .map(c => c.cover_image_url)
    .filter(Boolean)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {collections.map((collection, idx) => (
          <div
            key={collection.id}
            onClick={() => {
              setCurrentIndex(idx)
              setLightboxOpen(true)
            }}
            style={{ cursor: 'pointer' }}
          >
            <img
              src={collection.cover_image_url}
              alt={collection.title}
              style={{ width: '100%', borderRadius: 'var(--radius-lg)' }}
            />
            <h3>{collection.title}</h3>
          </div>
        ))}
      </div>

      <PhotoLightbox
        images={coverImages}
        initialIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
```

## Integration Points

**Recommended Usage:**
- Pin detail pages (view full-size photos)
- Collection pages (browse pin images)
- User profile galleries
- Map popups (quick photo preview)
- Search results (preview images)

**Best Practices:**
- Always provide alt text for images
- Optimize image sizes (serve appropriate resolutions)
- Show thumbnail grid before opening lightbox
- Include image counter for multi-image galleries
- Test keyboard navigation
- Test mobile swipe gestures

## Technical Details

### State Management

The component manages several internal states:
- `currentIndex`: Current image being displayed
- `imageLoading`: Loading state for current image
- `touchStart/touchEnd`: Touch coordinates for swipe detection

### Event Listeners

**Keyboard Events:**
- Registered when lightbox opens
- Cleaned up when lightbox closes
- Prevents memory leaks

**Touch Events:**
- Detects left/right swipes
- 50px minimum distance to trigger
- Works on any touch device

**Body Scroll Lock:**
- Prevents background scrolling
- Applied when lightbox opens
- Removed when lightbox closes

### Performance

**Optimizations:**
- Images load on demand
- Only one image loaded at a time
- Keyboard events cleaned up properly
- No re-renders on touch move

**Animations:**
- CSS transitions (GPU accelerated)
- Fade-in animation
- Smooth opacity transitions

## Browser Support

**Desktop:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Mobile:**
- iOS Safari 14+
- Chrome Android 90+
- Samsung Internet 14+

**Touch Gestures:**
- Requires touch event support
- Works on all modern mobile browsers

---

**Issue:** #75
**Last Updated:** March 2026
