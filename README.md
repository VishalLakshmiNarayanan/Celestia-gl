

# 🌌 CELESTIA — Interactive 3D World Explorer

A futuristic **3D globe application** that lets you explore the world with AI-powered facts, videos, and a mascot narrator. Built with **Next.js**, **Three.js / react-globe.gl**, and integrated with **Groq AI** + **Pexels API**.

## ✨ Features

* 🌍 **Interactive 3D Globe** — Explore Earth with smooth, realistic visualization
* 🔎 **Smart Search** — Find any location worldwide using geocoding
* 🤖 **AI-Generated Facts** — Fascinating facts powered by Groq AI
* 🎥 **Auto-Playing Videos** — Watch authentic location clips from Pexels
* 🎭 **Mascot Narration** — Friendly voiceover synced with animated mascot frames
* 🧩 **Draggable Holographic UI** — Separate panels for video, facts, and narration
* 📊 **Real-time Exploration Stats** — Track locations you’ve visited

## 🛠 Tech Stack

* **Frontend**: Next.js 14, React 19, TypeScript
* **3D Visualization**: react-globe.gl + Three.js
* **Styling**: Tailwind CSS v4, shadcn/ui components
* **AI Integration**: Groq API (facts & narration)
* **APIs**:

  * Pexels (video search)
  * Nominatim (geocoding)
* **Deployment**: Vercel

## ⚙️ Setup

1. **Clone and Install**

   ```bash
   git clone https://github.com/VishalLakshmiNarayanan/celestia-ai.git
   cd celestia-ai
   npm install
   ```

2. **Environment Variables**

   * Groq API key (via Vercel integration or `.env.local`)
   * Pexels API key:

     ```env
     PEXELS_API_KEY=your_pexels_api_key_here
     ```

3. **Get a Pexels API Key**

   * Visit [Pexels API](https://www.pexels.com/api/)
   * Sign up for free
   * Copy your key into `.env.local`

4. **Run Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 🚀 Usage

1. **Search**: Enter a location in the search bar
2. **Explore**: Click a result to drop a marker on the globe
3. **Discover**: Click a marker to open holographic cards with:

   * 🎥 Videos from Pexels
   * ✨ AI-generated discovery facts
   * 🗣️ Narration from the mascot
4. **Arrange**: Drag and reposition cards anywhere on your screen
5. **Multi-Marker Mode**: Explore multiple locations at once

## 🔗 API Integrations

* **Groq AI** — Generates rich facts + narration for each location
* **Pexels API** — Fetches videos for immersive exploration
* **Nominatim** — Powers geocoding for search

## 🏗 Architecture

* **API Routes**: `/api/facts`, `/api/videos`, `/api/narrate`, `/api/geocode`
* **Components**: Modular React + TypeScript components
* **Custom Hooks**: Marker management, draggable panels, speech handling
* **Styling**: Futuristic holographic theme with glassmorphism effects

## 🌍 Deployment

One-click deploy to **Vercel** — Groq + Pexels integrations are already supported.

## 🤝 Open Source

Celestia AI is fully **open-source**.
Feel free to fork, explore, and extend it — contributions are welcome!


