# Travlr 

Drop pins, share spots, build your perfect city guide.

> **🚧 Currently Building**  
> Pls Don't expect everything to work perfectly (yet).

## 🎯 What do?

Drop pins on that random taco spot you found, organize them into collections like "Date Night Spots" or "Best Coffee in Portland," and share them with friends.

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

### Database Migrations

**New Feature: User Preferences** 🎨

Users can now save their map style preferences! To enable this:

1. Go to Supabase Dashboard → SQL Editor
2. Run the migration: `migrations/add_user_preferences.sql`
3. Restart your dev server

See [migrations/README.md](./migrations/README.md) for detailed instructions.

**What this does:**
- Remembers your map view choice (Street/Satellite/Outdoors/Dark)
- Settings persist across sessions
- Foundation for future preference features

⚡ What's Built So Far
✅ Pin dropping - Click map, add details
✅ Image uploads - Single or multiple pics per pin
✅ Collections - Group your pins (public/private)
✅ User profiles - With profile pics
✅ Authentication - Sign up, sign in
✅ User preferences - Map style settings saved per user
🚧 Coming Soon: Discovery, following, more preferences

🛠️ Tech Stack
Framework: Next.js 15 + React 19
Backend: Supabase (PostgreSQL + Auth + Storage)
Maps: Mapbox GL JS
Styling: Pure CSS with custom properties
TypeScript

📁 Arch
src/
├── app/                    # Next.js app router stuff
├── components/             # React components
│   ├── Auth.tsx           # Login/signup 
│   ├── Map.tsx            # The main map interface
│   ├── PinCreationModal.tsx # Pin creation with image uploads
│   ├── ProfilePictureUpload.tsx # Profile pic management
│   └── ...more            # SingleImageUpload, MultipleImageUpload, etc.
├── hooks/                 # Custom hooks
└── lib/                   # Database services, utilities

🤝 Contributing
Add to the project:

Fork it
Make it better
PR with good commit messages
Don't break the build

📄 License
MIT - Use it, fork it
