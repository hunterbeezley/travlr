# Travlr 

Drop pins, share spots, build your perfect city guide.

<p align="center">
  <img src="public/screenshots/screenshot-1.png" width="32%" />
  <img src="public/screenshots/screenshot-2.png" width="32%" />
  <img src="public/screenshots/screenshot-3.png" width="32%" />
</p>

> **🚧 Development Status**
> Core features are working! Currently adding social engagement features (voting, comments, city feeds).
> Security hardening in progress. Not production-ready yet, but great for testing!

## ✨ What Works Right Now

### Core Features
- 📍 Drop pins anywhere on the map with photos & details
- 📁 Organize pins into collections (public or private)
- 🎨 Custom collection colors (preset + hex color picker)
- 🗺️ Multiple map styles (Streets, Satellite, Terrain, Dark)
- 🔍 Google Places integration with business details, hours, ratings

### Social Features
- 👥 Follow other users and see their public collections
- 🔔 Real-time notifications for follows and friend activity
- 🌍 Discover public collections from friends and the community
- 👤 User profiles with stats (pins, collections, followers)

### Advanced
- 📸 Up to 5 images per pin with image galleries
- 🏷️ 10 pin categories with custom colored icons
- 🔒 GDPR compliance (data export, account deletion, consent management)
- 📱 Dark mode support

### Coming Soon
- 💬 Comments on collections
- ⬆️⬇️ Voting/rating system
- 🏙️ City-based discovery feeds
- 📊 Enhanced mobile experience

## 🎯 Save, collect, share

Drop pins on that random taco spot you found, organize them into collections like "Date Night Spots" or "Best Coffee in Portland," and share them publicly with friends or the world.

## 🚀 Get It Running

### You'll Need
- Node.js 18+
- npm or yarn 
- A Mapbox account 
- A Supabase project 

### Setup

Clone and install:
`git clone https://github.com/hunterbeezley/Travlr.git`
`cd Travlr`
`npm install`

Environment setup:
`cp .env.example .env.local`
Fill this out with your API keys (see below)

Run it:
`npm run dev`

Open http://localhost:3000 and start dropping pins.

### API Keys Setup

Create `.env.local` with:
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Get your keys:**
- Mapbox: Sign up at mapbox.com → Account → Access tokens
- Supabase: New project at supabase.com → Settings → API

### Supabase Storage Setup

**⚠️ Important:** Image uploads require Supabase Storage to be configured.

Follow the detailed guide: [STORAGE_SETUP.md](./STORAGE_SETUP.md)

Quick steps:
1. Create a public bucket named `travlr-images` in Supabase Storage
2. Set up RLS policies to allow authenticated uploads
3. Test at http://localhost:3000/test-images


🛠️ Tech Stack
Framework: Next.js 15 + React 19
Backend: Supabase (PostgreSQL + Auth + Storage)
Maps: Mapbox GL JS
Styling: Pure CSS with custom properties
TypeScript

📁 Project Structure
```
travlr/
├── src/
│   ├── app/                    # Next.js 15 app router pages
│   │   ├── page.tsx           # Main map interface (homepage)
│   │   ├── profile/page.tsx   # User profiles
│   │   └── settings/page.tsx  # User settings
│   ├── components/            # React components
│   │   ├── Auth.tsx          # Authentication (login/signup)
│   │   ├── Map.tsx           # Interactive Google Maps
│   │   ├── PinCreationModal.tsx    # Pin creation with images
│   │   ├── CollectionDetailsModal.tsx  # Collection management
│   │   ├── NotificationBadge.tsx   # Real-time notifications
│   │   ├── ConsentBanner.tsx      # GDPR consent
│   │   └── ...more               # Image uploads, modals, avatars
│   ├── hooks/                # Custom React hooks
│   └── lib/                  # Utilities and Supabase client
├── migrations/               # Database migrations & schema
├── scripts/                  # Utility scripts
├── public/                   # Static assets
└── docs/                     # Additional documentation
```



