# Travlr 🗺️

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
