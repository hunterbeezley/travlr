# Travlr

A mapping application for organizing and sharing your adventures, interests and your city's best kept secrets.

> **⚠️ Work in Progress**  
> This project is currently under active development. Features and functionality are subject to change.

## 🚀 Getting Started

### Prereqs
- Node.js 18+ 
- npm or yarn
- A Mapbox account and API key
- A Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hunterbeezley/Travlr.git
   cd Travlr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with React 19
- **Styling**: Pure CSS with CSS Custom Properties
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Maps**: Mapbox GL JS
- **TypeScript**: Full type safety
- **Deployment**: Vercel (recommended)

## 🗂️ Arch

```
src/
├── app/                 # Next.js app directory
│   ├── globals.css     # Global styles and design system
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── Auth.tsx        # Authentication component
│   └── Map.tsx         # Interactive map component
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication hook
└── lib/                # Utility libraries
    └── supabase.ts     # Supabase client configuration
```

## 🔧 Env Setup

### Mapbox Setup
1. Sign up at [mapbox.com](https://mapbox.com)
2. Create a new access token
3. Add the token to your `.env.local` file

### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Add both to your `.env.local` file

## 🤝 Contributing

This project is currently in early development. Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Ack

- [Mapbox](https://mapbox.com) for mapping services
- [Supabase](https://supabase.com) for backend infrastructure
- [Next.js](https://nextjs.org) for the React framework
- [Vercel](https://vercel.com) for deployment platform

---

**Note**: This is a personal project and is not affiliated with any commercial entity. The app is provided as-is while under development.
