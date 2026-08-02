# TogetherWatch 🎬🍿

TogetherWatch is a premium, real-time social watching platform. It brings the Netflix-style media discovery experience and pairs it with a synchronized watch-party layer—complete with interactive watch rooms, synchronized playheads, chat rooms, and real-time reaction bursts.

## 🚀 Features

- **Netflix-Style UI**: Curated home feed, top lists, continue watching rows, recommendations grids, and full anime support (search & details).
- **Synchronized Watch Parties**: Perfect video sync across hosts and guests driven by Supabase Realtime Broadcast.
- **Cinematic Sync Countdown**: Host-initiated countdowns that orchestrate starting video playback in perfect unison.
- **Real-Time Interactive Chat**: Chat panel integrated directly in the watch room.
- **Live Watchers Count**: Presence-driven indicators showing how many people are active in the watch party.
- **Multiple Streaming Sources**: Pluggable source system with an in-room switcher supporting popular third-party embeds.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16.2](https://nextjs.org/) + [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (slices for room state, UI state, auth state, and localStorage watchlist)
- **Database / Sync**: [Supabase](https://supabase.com/) (Auth, Postgres DB, and Realtime Broadcast/Presence)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📐 Architecture & Data Flow

```
+-----------------------------------------------------------+
|                      Browser / Client                     |
+---------------------+-------------------+-----------------+
                      |                   |
        AniList / Consumet API        Supabase (Auth, Postgres, Realtime)
                      |                   |
               [Metadata, Streams]   [Room State, Presence, Chat Messages]
```

TogetherWatch uses **Supabase Realtime** for both:
1. **Presence**: Keeping track of active viewer counts.
2. **Broadcasts**: Distributing playback sync commands (`play`, `pause`, `seek`, `resync`, and countdown launches) from the host to the guest clients.

Clients communicate with the video player iframe via `window.postMessage` to control seeking and playback of HLS streams safely.

---

## 📦 Setup & Installation

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) and npm/pnpm installed.

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in the values:
```bash
cp .env.example .env.local
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🗄️ Database Schemas (Supabase)

Here are the SQL DDL commands to set up the necessary tables for TogetherWatch:

### `rooms` Table
```sql
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  name text not null,
  host_id text not null,
  host_name text not null,
  host_avatar text,
  media_id text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  media_title text,
  selected_source text default 'vidsrcme' not null,
  is_public boolean default false not null,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### `messages` Table
```sql
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  user_id text not null,
  user_name text not null,
  content text not null,
  message_type text default 'message'::text not null check (message_type in ('message', 'reaction', 'system')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### `watch_progress` Table
```sql
create table public.watch_progress (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  media_id text not null,
  media_type text not null,
  media_title text not null,
  poster_path text,
  progress_seconds integer not null,
  duration_seconds integer not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```
