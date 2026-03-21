# Comment Reactions System

Emoji reactions allow users to quickly respond to comments with emotional feedback without writing a full reply.

## Features

- **5 Emoji Reactions**: 👍 Like, ❤️ Love, 😂 Laugh, 😮 Wow, 😢 Sad
- **Toggle On/Off**: Click to add reaction, click again to remove
- **Real-time Updates**: Reactions update live via Supabase subscriptions
- **Optimistic UI**: Instant feedback while server updates
- **Reaction Counts**: Shows total count for each emoji
- **Visual Feedback**: Highlights user's own reactions

## Database Schema

### Table: `comment_reactions`

```sql
CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES collection_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, emoji)
);
```

**Key Constraints:**
- Each user can only react with each emoji once per comment
- Reactions are deleted when comment is deleted (CASCADE)
- Only 5 specific emojis allowed

### Functions

**toggle_comment_reaction(comment_id, emoji)**
- Adds reaction if doesn't exist
- Removes reaction if already exists
- Returns JSON: `{ action: 'added' | 'removed', emoji: '👍' }`

**get_comment_reactions(comment_id)**
- Returns reactions grouped by emoji
- Includes count and array of user IDs
- Ordered by count (descending)

**get_user_reactions_on_comment(comment_id)**
- Returns array of emojis current user has reacted with
- Empty array if not authenticated

## Usage

### Basic Implementation

```tsx
import CommentReactions from '@/components/CommentReactions'

function Comment({ comment, currentUserId }) {
  return (
    <div>
      {/* Comment content */}
      <div>{comment.text}</div>

      {/* Reactions */}
      <CommentReactions
        commentId={comment.id}
        currentUserId={currentUserId}
      />
    </div>
  )
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `commentId` | `string` | Yes | UUID of the comment |
| `currentUserId` | `string` | No | UUID of current user (enables interaction) |

### In Comments Section

```tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import CommentReactions from '@/components/CommentReactions'

export default function CommentsSection({ collectionId, currentUserId }) {
  const [comments, setComments] = useState([])

  // Load comments...

  return (
    <div>
      <h3>Comments</h3>
      {comments.map(comment => (
        <div key={comment.id} style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--card)'
        }}>
          {/* Comment header */}
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>{comment.username}</strong>
            <span style={{ color: 'var(--muted-foreground)', marginLeft: '0.5rem' }}>
              {formatDate(comment.created_at)}
            </span>
          </div>

          {/* Comment text */}
          <p>{comment.comment_text}</p>

          {/* Reactions */}
          <CommentReactions
            commentId={comment.id}
            currentUserId={currentUserId}
          />
        </div>
      ))}
    </div>
  )
}
```

## Available Emojis

| Emoji | Meaning | Use Case |
|-------|---------|----------|
| 👍 | Like | Agreement, approval, support |
| ❤️ | Love | Strong positive emotion, favorite |
| 😂 | Laugh | Funny, humorous comment |
| 😮 | Wow | Surprise, amazement, shock |
| 😢 | Sad | Sympathy, sadness, empathy |

**Note:** The emoji set is fixed in the database constraint. To add more emojis, you must update the database schema.

## User Interface

### Reaction Display

Active reactions appear as pills below the comment:

```
👍 5   ❤️ 3   😂 12
```

- Shows emoji and count
- User's reactions highlighted in red
- Hover effect scales up slightly
- Click to toggle reaction

### Emoji Picker

Click the smile button (😊) to open the picker:

```
[Popup above button]
👍  ❤️  😂  😮  😢
```

- Glass morphism style popup
- Appears above the add button
- Scale animation on open
- Hover effect enlarges emoji
- User's active reactions show red border
- Closes after selecting emoji or clicking X

### Not Authenticated

If `currentUserId` is not provided:
- Reactions display as read-only
- No add button shown
- Reaction buttons disabled (not clickable)

## Real-time Updates

Reactions update automatically when other users react:

```tsx
// Subscribe to reactions channel
const channel = supabase
  .channel(`comment-reactions:${commentId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'comment_reactions',
    filter: `comment_id=eq.${commentId}`
  }, () => {
    loadReactions()
  })
  .subscribe()
```

**Events:**
- INSERT - User adds reaction
- DELETE - User removes reaction
- All users see updates instantly

## Optimistic Updates

For better UX, the component updates immediately:

```tsx
// Before server response
setUserReactions(prev =>
  prev.includes(emoji)
    ? prev.filter(e => e !== emoji)
    : [...prev, emoji]
)

// Server request happens in background
await supabase.rpc('toggle_comment_reaction', {
  p_comment_id: commentId,
  p_emoji: emoji
})
```

Users see instant feedback while the server processes the request.

## Styling

### Reaction Pills

**User Has Reacted:**
- Red border (`var(--color-red-muted)`)
- Red background (20% opacity)
- Bold font weight
- Glass-strong variant

**User Has Not Reacted:**
- Transparent border
- Subtle background (5% white)
- Normal font weight
- Glass-subtle variant

### Add Button

- Circular (32px diameter)
- Glass-subtle background
- Smile emoji (😊) when closed
- X when picker is open
- Scales on hover

### Emoji Picker

- Glass-strong with backdrop blur
- Positioned above add button
- Scale-in animation
- Dark background (95% opacity)
- 5 circular emoji buttons (40px each)
- Hover scale effect (1.2x)

## Accessibility

### ARIA Labels

```tsx
<button aria-label="Add reaction">
  😊
</button>

<button aria-label="React with 👍">
  👍
</button>
```

### Keyboard Support

- **Tab**: Navigate between reactions and add button
- **Enter/Space**: Toggle reaction or open picker
- **Escape**: Close picker (could be added)

### Screen Readers

Announces:
- "Add reaction button"
- "React with thumbs up"
- "5 users reacted with thumbs up"
- Current state (reacted or not)

## Examples

### With Auth Check

```tsx
'use client'
import { useAuth } from '@/hooks/useAuth'
import CommentReactions from '@/components/CommentReactions'

function CommentItem({ comment }) {
  const { user } = useAuth()

  return (
    <div>
      <p>{comment.text}</p>
      <CommentReactions
        commentId={comment.id}
        currentUserId={user?.id}
      />
    </div>
  )
}
```

### Collection Comments

```tsx
// In CollectionPageClient.tsx
import CommentReactions from '@/components/CommentReactions'

// Inside comment rendering
{comments.map(comment => (
  <div key={comment.id} className="glass" style={{
    padding: '1rem',
    borderRadius: 'var(--radius-lg)',
    marginBottom: '1rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <UserAvatar profileImageUrl={comment.user_profile_image} size="small" />
      <strong>{comment.username}</strong>
    </div>

    <p style={{ marginLeft: '2.5rem' }}>{comment.comment_text}</p>

    <div style={{ marginLeft: '2.5rem' }}>
      <CommentReactions
        commentId={comment.id}
        currentUserId={user?.id}
      />
    </div>
  </div>
))}
```

### Mobile Responsive

```tsx
// Adjust picker position on mobile
<div
  className="glass-strong"
  style={{
    position: 'absolute',
    bottom: 'calc(100% + 0.5rem)',
    left: 0,
    // On mobile, center the picker
    '@media (max-width: 768px)': {
      left: '50%',
      transform: 'translateX(-50%)'
    }
  }}
>
  {/* Emoji buttons */}
</div>
```

## Database Queries

### Get All Reactions for Comment

```tsx
const { data, error } = await supabase.rpc('get_comment_reactions', {
  p_comment_id: commentId
})

// Returns: [
//   { emoji: '👍', count: 5, users: ['uuid1', 'uuid2', ...] },
//   { emoji: '❤️', count: 3, users: ['uuid3', 'uuid4', ...] }
// ]
```

### Get User's Reactions

```tsx
const { data, error } = await supabase.rpc('get_user_reactions_on_comment', {
  p_comment_id: commentId
})

// Returns: ['👍', '❤️'] (emojis user has reacted with)
```

### Toggle Reaction

```tsx
const { data, error } = await supabase.rpc('toggle_comment_reaction', {
  p_comment_id: commentId,
  p_emoji: '👍'
})

// Returns: { action: 'added' | 'removed', emoji: '👍' }
```

## Performance

**Optimizations:**
- Reactions grouped by emoji (reduces rows returned)
- Indexed columns (comment_id, user_id)
- Unique constraint prevents duplicates
- Real-time subscriptions filtered by comment_id
- Optimistic updates for instant feedback

**Scalability:**
- Each comment can have up to (5 emojis × user count) reactions
- Efficient GROUP BY in database function
- UNIQUE constraint prevents spam
- Cascade delete keeps orphaned data clean

## Migration

To apply the reactions feature:

```bash
# Run migration
psql -U postgres -d travlr -f migrations/add-comment-reactions.sql

# Or via Supabase dashboard:
# 1. Go to SQL Editor
# 2. Paste contents of add-comment-reactions.sql
# 3. Run query
```

## Extending Emojis

To add more emojis, update:

1. **Database constraint:**
```sql
ALTER TABLE comment_reactions
DROP CONSTRAINT comment_reactions_emoji_check;

ALTER TABLE comment_reactions
ADD CONSTRAINT comment_reactions_emoji_check
CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢', '🔥', '🎉'));
```

2. **Component:**
```tsx
const AVAILABLE_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉']
```

3. **Function validation:**
```sql
IF p_emoji NOT IN ('👍', '❤️', '😂', '😮', '😢', '🔥', '🎉') THEN
  RAISE EXCEPTION 'Invalid emoji...';
END IF;
```

## Testing Checklist

- [ ] Add reaction to comment
- [ ] Remove reaction (toggle off)
- [ ] Multiple users can react
- [ ] User can use multiple different emojis
- [ ] User cannot react twice with same emoji
- [ ] Reaction counts update correctly
- [ ] Real-time updates work
- [ ] Emoji picker opens/closes
- [ ] User's reactions highlighted
- [ ] Works when not authenticated (read-only)
- [ ] Optimistic updates work
- [ ] Database constraints enforced

## Browser Support

**Features:**
- Emoji rendering (all modern browsers)
- Real-time subscriptions (WebSocket)
- CSS animations (all modern browsers)

**Compatibility:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

---

**Issue:** #80
**Related:** #30 (Comments System)
**Last Updated:** March 2026
