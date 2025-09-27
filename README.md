# CELESTIA - Interactive 3D World Explorer

A futuristic 3D globe application that lets you explore the world with AI-powered facts and videos. Built with Next.js, react-globe.gl, and integrated with Groq AI and Pexels API.

## Features

- **Interactive 3D Globe**: Explore Earth with a beautiful 3D visualization
- **Smart Search**: Search for any location worldwide with geocoding
- **AI-Generated Facts**: Get fascinating facts about locations powered by Groq AI
- **Auto-Playing Videos**: Watch related videos from Pexels for each location
- **Holographic UI**: Futuristic glassmorphism design with cyan accents
- **Marker System**: Drop and manage multiple location markers
- **Real-time Stats**: Track your exploration progress

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **3D Visualization**: react-globe.gl
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **AI Integration**: Groq (via AI SDK)
- **APIs**: Pexels (videos), Nominatim (geocoding)
- **Deployment**: Vercel

## Setup

1. **Clone and Install**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Variables**:
   - Groq API key is already configured via Vercel integration
   - Add your Pexels API key to environment variables:
     \`\`\`
     PEXELS_API_KEY=your_pexels_api_key_here
     \`\`\`

3. **Get Pexels API Key**:
   - Visit [Pexels API](https://www.pexels.com/api/)
   - Sign up for a free account
   - Copy your API key to the environment variables

4. **Run Development Server**:
   \`\`\`bash
   npm run dev
   \`\`\`

## Usage

1. **Search**: Use the search bar to find any location worldwide
2. **Explore**: Click on the search results to drop a marker on the globe
3. **Discover**: Click on markers to view holographic cards with:
   - AI-generated facts about the location
   - Auto-playing videos related to the area
   - Location details and timestamps
4. **Manage**: Clear all markers or explore multiple locations simultaneously

## API Integrations

- **Groq AI**: Generates 3 unique facts for each location
- **Pexels API**: Fetches relevant videos for visual exploration
- **Nominatim**: Provides geocoding for location search

## Architecture

- **API Routes**: `/api/facts`, `/api/videos`, `/api/geocode`
- **Components**: Modular React components with TypeScript
- **Hooks**: Custom hooks for marker management and state
- **Styling**: Holographic theme with glassmorphism effects

## Deployment

Deploy to Vercel with one click - all integrations are pre-configured.

## License

MIT License - feel free to explore and modify!
