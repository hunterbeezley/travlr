# Travlr 🗺️

Drop pins, share spots, build your perfect city guide. Your adventures, organized.

> **🚧 Currently Building**  
> This thing is evolving fast. Don't expect everything to work perfectly (yet).

## 🎯 What's This?

Travlr is for people who actually explore their cities. Drop pins on that random taco spot you found, organize them into collections like "Date Night Spots" or "Best Coffee in Brooklyn," and share them with friends who have taste.

Think: Google Maps meets your actual personality.

## 🚀 Get It Running

### You'll Need
- Node.js 18+ (don't be that person running old versions)
- npm or yarn (your choice, we're not judging)
- A Mapbox account (free tier is fine)
- A Supabase project (also free)

### Setup
```bash
# Clone and install
git clone https://github.com/hunterbeezley/Travlr.git
cd Travlr
npm install

# Environment setup
cp .env.example .env.local
# ^ Fill this out with your API keys (see below)

# Run it
npm run dev
Open http://localhost:3000 and start dropping pins.
API Keys Setup
Create .env.local with:
envNEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
Mapbox: Sign up at mapbox.com → Account → Access tokens
Supabase: New project at supabase.com → Settings → API
⚡ What's Built So Far
✅ Pin dropping - Click map, add details, boom
✅ Image uploads - Single or multiple pics per pin
✅ Collections - Group your pins (public/private)
✅ User profiles - With profile pics that don't look terrible
✅ Authentication - Sign up, sign in, don't lose your data
🚧 Coming Soon: Feed, following, discovery that doesn't suck
🛠️ Tech Stack
Framework: Next.js 15 + React 19 (staying current)
Backend: Supabase (PostgreSQL + Auth + Storage)
Maps: Mapbox GL JS (way better than Google Maps)
Styling: Pure CSS with custom properties (no framework bloat)
TypeScript: Because we're not animals
📁 How It's Organized
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
🔧 Dev Notes
Image Handling: We've got both single and multiple image uploads working. The SingleImageUpload and MultipleImageUpload components handle the heavy lifting.
Database: Using Supabase with proper RLS policies. No one's seeing your private collections.
Storage: Images go to Supabase Storage with automatic resizing for profiles.
🤝 Contributing
This is a personal project but if you want to help build something cool:

Fork it
Make it better
PR with good commit messages
Don't break the build

📄 License
MIT - Use it, fork it, whatever. Just don't sue me.

Currently caffeinated and building in public. Follow along or don't. ☕
