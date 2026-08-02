-- ========================================================
-- TOGETHERWATCH SUPABASE DATABASE SCHEMA SETUP
-- Project Reference: fgupmoffipeeepfegdhl
-- Copy and run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fgupmoffipeeepfegdhl/sql/new
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROOMS TABLE (Watch Party Rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    host_id TEXT NOT NULL,
    host_name TEXT NOT NULL,
    host_avatar TEXT,
    media_id TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'movie',
    media_title TEXT,
    selected_source TEXT DEFAULT 'videasy',
    is_public BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast room code lookups
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_public ON public.rooms(is_public, started_at DESC);

-- 2. MESSAGES TABLE (Real-time Watch Party Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'message',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching room messages quickly
CREATE INDEX IF NOT EXISTS idx_messages_room_code ON public.messages(room_code, created_at ASC);

-- 3. WATCH PROGRESS TABLE (User History & Resume Playback)
CREATE TABLE IF NOT EXISTS public.watch_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    season INT DEFAULT 0,
    episode INT DEFAULT 0,
    progress NUMERIC DEFAULT 0,
    timestamp NUMERIC DEFAULT 0,
    duration NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_media_episode UNIQUE (user_id, media_id, media_type, season, episode)
);

CREATE INDEX IF NOT EXISTS idx_watch_progress_user ON public.watch_progress(user_id, updated_at DESC);

-- 4. WATCHLIST TABLE (User Bookmarks)
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    vote_average NUMERIC DEFAULT 0,
    release_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_watchlist UNIQUE (user_id, media_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id, created_at DESC);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & insert access for Watch Parties & Public directory
CREATE POLICY "Public read access for rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Public insert access for rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for rooms" ON public.rooms FOR UPDATE USING (true);

CREATE POLICY "Public read access for messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Public insert access for messages" ON public.messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read access for watch_progress" ON public.watch_progress FOR SELECT USING (true);
CREATE POLICY "Public write access for watch_progress" ON public.watch_progress FOR ALL USING (true);

CREATE POLICY "Public read access for watchlist" ON public.watchlist FOR SELECT USING (true);
CREATE POLICY "Public write access for watchlist" ON public.watchlist FOR ALL USING (true);

-- ========================================================
-- ENABLE REALTIME ON ROOMS & MESSAGES
-- ========================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
