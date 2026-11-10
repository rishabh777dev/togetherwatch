'use client';

import Navbar from '@/components/Navbar';
import { getPublicRooms, getUserSessions, Room } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
    Bookmark,
    Check,
    ChevronRight,
    Clock,
    Film,
    Globe,
    History,
    Lock,
    LogOut,
    Play,
    Plus,
    Search,
    Settings,
    Shield,
    Trash2,
    Tv,
    User,
    Users
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPreferredServer, savePreferredServer } from '@/lib/watchProgress';

// TMDB Image URL helper
const getImageUrl = (path: string | null) => path ? `https://image.tmdb.org/t/p/w500${path}` : null;

export default function DashboardPage() {
    const { user, signOut } = useAuthStore();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'watchlist' | 'settings'>('overview');
    const [roomCode, setRoomCode] = useState('');
    const [publicRooms, setPublicRooms] = useState<Room[]>([]);
    const [recentSessions, setRecentSessions] = useState<any[]>([]);
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [historyFilter, setHistoryFilter] = useState<'all' | 'movie' | 'tv'>('all');
    
    // User metadata edit state
    const [displayName, setDisplayName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
    const [preferredServer, setPreferredServer] = useState('vidlink');

    // Stats
    const [totalWatchTime, setTotalWatchTime] = useState('0h');
    const [totalSessions, setTotalSessions] = useState(0);
    const [watchlistCount, setWatchlistCount] = useState(0);
    const [watchlistItems, setWatchlistItems] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            setDisplayName(user.user_metadata?.name || '');
        }

        // Load local watchlist items
        try {
            const saved = localStorage.getItem('togetherwatch_watchlist');
            if (saved) {
                const parsed = JSON.parse(saved);
                setWatchlistItems(parsed);
                setWatchlistCount(parsed.length);
            }
        } catch (e) {
            console.error('Failed to parse local watchlist', e);
        }

        // Load saved server preference
        const savedServer = getPreferredServer();
        if (savedServer) setPreferredServer(savedServer);
    }, [user]);

    useEffect(() => {
        if (!user) return; // Wait for auth

        const fetchDashboardData = async () => {
            // Fetch public rooms
            const { rooms } = await getPublicRooms();
            if (rooms) setPublicRooms(rooms);

            // Fetch user sessions
            const { sessions } = await getUserSessions(user.id);
            if (sessions) {
                setRecentSessions(sessions);
                setTotalSessions(sessions.length);

                // Calculate watch time (duration is in seconds, progress contains max watched)
                let totalSeconds = 0;
                sessions.forEach((s) => {
                    const timeWatched = s.timestamp || 0; // The furthest they got
                    totalSeconds += timeWatched;
                });
                
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                setTotalWatchTime(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handleJoinRoom = () => {
        if (roomCode.trim()) {
            const normalizedCode = roomCode.trim().toUpperCase();
            router.push(`/room/${normalizedCode}`);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handleSaveDisplayName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return;
        setIsSavingName(true);
        setSaveSuccessMsg('');
        
        try {
            // Update user metadata in Supabase
            const { supabase } = await import('@/lib/supabase');
            const { error } = await supabase.auth.updateUser({
                data: { name: displayName.trim() }
            });
            
            if (!error) {
                setSaveSuccessMsg('Profile name updated successfully!');
                setTimeout(() => setSaveSuccessMsg(''), 4000);
            }
        } catch (err) {
            console.error('Error updating name:', err);
        } finally {
            setIsSavingName(false);
        }
    };

    const handleServerChange = (serverId: string) => {
        setPreferredServer(serverId);
        savePreferredServer(serverId);
    };

    const handleClearHistory = () => {
        if (confirm('Are you sure you want to clear your local watch history preview?')) {
            setRecentSessions([]);
            setTotalSessions(0);
            setTotalWatchTime('0m');
        }
    };

    const handleRemoveWatchlistItem = (id: number | string) => {
        const updated = watchlistItems.filter(item => item.id !== id);
        setWatchlistItems(updated);
        setWatchlistCount(updated.length);
        try {
            localStorage.setItem('togetherwatch_watchlist', JSON.stringify(updated));
        } catch (e) {}
    };

    // Filtered history list
    const filteredHistory = recentSessions.filter(session => {
        const matchesType = historyFilter === 'all' || session.media_type === historyFilter;
        const matchesQuery = !historySearchQuery.trim() || 
            String(session.media_id).toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            session.media_type.toLowerCase().includes(historySearchQuery.toLowerCase());
        return matchesType && matchesQuery;
    });

    if (!user) {
        return (
            <main className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#0b0b0b] text-white">
            <Navbar />

            <div className="pt-20 sm:pt-24 pb-12 px-3 sm:px-6 lg:px-12">
                <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8">
                    
                    {/* Top Account Profile Header Banner */}
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-accent/20 to-transparent pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 sm:gap-5">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-accent to-accent-light rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black shadow-[0_0_20px_rgba(229,9,20,0.3)] border border-white/10 shrink-0">
                                    {user.email?.[0].toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="font-bold text-lg sm:text-2xl text-white truncate">
                                            {user.user_metadata?.name || user.email?.split('@')[0] || 'My Account'}
                                        </h1>
                                        <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/30">
                                            VIP Member
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-white/50 font-medium truncate mt-0.5">{user.email}</p>
                                </div>
                            </div>

                            {/* Quick Stats Badges */}
                            <div className="flex items-center gap-2.5 sm:gap-3 self-stretch md:self-auto">
                                <div className="flex-1 md:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-black/60 border border-white/5 rounded-xl text-center">
                                    <p className="text-base sm:text-xl font-black text-white">{totalSessions}</p>
                                    <p className="text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase text-white/40">Sessions</p>
                                </div>
                                <div className="flex-1 md:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-black/60 border border-white/5 rounded-xl text-center">
                                    <p className="text-base sm:text-xl font-black text-white">{totalWatchTime}</p>
                                    <p className="text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase text-white/40">Watch Time</p>
                                </div>
                                <div className="flex-1 md:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-black/60 border border-white/5 rounded-xl text-center">
                                    <p className="text-base sm:text-xl font-black text-white">{watchlistCount}</p>
                                    <p className="text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase text-white/40">Saved</p>
                                </div>
                                <button 
                                    onClick={handleSignOut}
                                    className="p-2.5 sm:p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/15 shrink-0"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Account Navigation Tabs */}
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-6 pt-4 border-t border-white/5 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap border ${
                                    activeTab === 'overview'
                                        ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
                                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <User className="w-3.5 h-3.5" />
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap border ${
                                    activeTab === 'history'
                                        ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
                                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <History className="w-3.5 h-3.5" />
                                Watch History ({recentSessions.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('watchlist')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap border ${
                                    activeTab === 'watchlist'
                                        ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
                                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Bookmark className="w-3.5 h-3.5" />
                                Watchlist ({watchlistCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap border ${
                                    activeTab === 'settings'
                                        ? 'bg-accent text-white border-accent shadow-lg shadow-accent/25'
                                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Settings className="w-3.5 h-3.5" />
                                Account Settings
                            </button>
                        </div>
                    </div>

                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Left Column */}
                            <div className="lg:col-span-2 space-y-6">
                                
                                {/* Quick Actions */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {/* Create Room Card */}
                                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6 hover:border-white/10 transition-all flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/20 shrink-0">
                                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                                                </div>
                                                <h3 className="font-bold text-base sm:text-lg">Host a Watch Party</h3>
                                            </div>

                                            <p className="text-xs sm:text-sm text-white/60 leading-relaxed mb-4">
                                                Create a synchronized room, choose any movie or show, and invite friends.
                                            </p>
                                        </div>

                                        <Link
                                            href="/room/create"
                                            className="w-full py-2.5 sm:py-3 bg-accent text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-accent-light transition-colors shadow-lg shadow-accent/20"
                                        >
                                            Create Room
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>

                                    {/* Join Room Card */}
                                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6 hover:border-white/10 transition-all flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
                                                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                                </div>
                                                <h3 className="font-bold text-base sm:text-lg">Join Private Room</h3>
                                            </div>

                                            <p className="text-xs sm:text-sm text-white/60 mb-3">
                                                Have a secret room code? Enter it below to join directly.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={roomCode}
                                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                                placeholder="Enter Room Code..."
                                                className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest text-center uppercase"
                                            />
                                            <button
                                                onClick={handleJoinRoom}
                                                disabled={!roomCode.trim()}
                                                className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex justify-center items-center gap-2 ${roomCode.trim()
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                                                    }`}
                                            >
                                                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                Unlock & Join
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity Preview */}
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6">
                                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                                        <h3 className="font-bold flex items-center gap-2 text-base sm:text-lg">
                                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                                            Recent Activity
                                        </h3>
                                        {recentSessions.length > 0 && (
                                            <button 
                                                onClick={() => setActiveTab('history')}
                                                className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                                            >
                                                View All History <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        {recentSessions.length === 0 ? (
                                            <div className="text-center py-8 text-white/40 font-medium text-xs sm:text-sm">No watch history found yet.</div>
                                        ) : (
                                            recentSessions.slice(0, 4).map((session) => (
                                                <div
                                                    key={session.id}
                                                    onClick={() => router.push(`/watch/${session.media_type}/${session.media_id}`)}
                                                    className="flex items-center justify-between p-3 sm:p-4 bg-black/50 border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center border shrink-0 ${
                                                                session.media_type === 'movie' 
                                                                ? 'bg-purple-500/10 border-purple-500/20' 
                                                                : 'bg-green-500/10 border-green-500/20'
                                                            }`}>
                                                            {session.media_type === 'movie'
                                                                ? <Film className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                                                                : <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 group-hover:scale-110 transition-transform" />
                                                            }
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-accent transition-colors truncate">
                                                                {session.media_type.toUpperCase()} - ID: {session.media_id}
                                                            </h4>
                                                            <p className="text-[10px] sm:text-xs text-white/50 font-medium tracking-wide mt-0.5">
                                                                {new Date(session.updated_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                                                        <div className="w-16 sm:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-accent relative rounded-full" 
                                                                style={{ width: `${Math.min(100, session.progress || 0)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest">{Math.round(session.progress || 0)}%</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Live Public Rooms */}
                            <div className="space-y-6">
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6">
                                    <h3 className="font-bold mb-4 sm:mb-6 flex items-center gap-2 text-base sm:text-lg">
                                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                        Live Public Rooms
                                    </h3>

                                    <div className="space-y-2.5">
                                        {publicRooms.length === 0 ? (
                                            <div className="text-center py-6">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                                                    <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                                                </div>
                                                <p className="text-xs sm:text-sm font-medium text-white/40">No public rooms active.</p>
                                                <p className="text-[11px] sm:text-xs text-white/30 mt-1">Be the first to host one!</p>
                                            </div>
                                        ) : (
                                            publicRooms.map((room) => (
                                                <div key={room.id} className="group relative bg-black/50 border border-white/5 rounded-xl p-3 hover:bg-white/5 transition-all">
                                                    <div className="flex gap-3 items-center">
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                                                             <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white/20" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <h4 className="font-bold text-xs sm:text-sm truncate pr-2">{room.name}</h4>
                                                                <span className="shrink-0 flex items-center gap-1 bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black tracking-wider uppercase">
                                                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                                                    Live
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] sm:text-xs text-white/40 truncate font-medium flex items-center gap-1">
                                                                <User className="w-3 h-3" /> {room.host_name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => router.push(`/room/${room.code}`)} 
                                                        className="w-full mt-2.5 py-2 bg-white/10 hover:bg-white font-bold hover:text-black text-xs rounded-lg transition-colors"
                                                    >
                                                        Join Party
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: WATCH HISTORY */}
                    {activeTab === 'history' && (
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-8 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                        <History className="w-5 h-5 text-accent" />
                                        Watch History
                                    </h2>
                                    <p className="text-xs text-white/50 mt-1">
                                        Tracked watch sessions and progress across devices
                                    </p>
                                </div>

                                {recentSessions.length > 0 && (
                                    <button
                                        onClick={handleClearHistory}
                                        className="self-start sm:self-auto px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 border border-red-500/20"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Clear History
                                    </button>
                                )}
                            </div>

                            {/* History Search & Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="text"
                                        value={historySearchQuery}
                                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                                        placeholder="Search watch history..."
                                        className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent transition-colors font-medium"
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 bg-black p-1 rounded-xl border border-white/10 shrink-0">
                                    <button
                                        onClick={() => setHistoryFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${historyFilter === 'all' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setHistoryFilter('movie')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${historyFilter === 'movie' ? 'bg-purple-500/20 text-purple-400' : 'text-white/50 hover:text-white'}`}
                                    >
                                        Movies
                                    </button>
                                    <button
                                        onClick={() => setHistoryFilter('tv')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${historyFilter === 'tv' ? 'bg-green-500/20 text-green-400' : 'text-white/50 hover:text-white'}`}
                                    >
                                        TV Shows
                                    </button>
                                </div>
                            </div>

                            {/* History List */}
                            <div className="space-y-3 pt-2">
                                {filteredHistory.length === 0 ? (
                                    <div className="text-center py-12 text-white/40 font-medium text-xs sm:text-sm">
                                        No matching watch history found.
                                    </div>
                                ) : (
                                    filteredHistory.map((session) => (
                                        <div
                                            key={session.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/60 border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all gap-4 group"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${
                                                        session.media_type === 'movie' 
                                                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                                                        : 'bg-green-500/10 border-green-500/20 text-green-400'
                                                    }`}>
                                                    {session.media_type === 'movie' ? <Film className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-accent transition-colors truncate">
                                                            {session.media_type.toUpperCase()} • ID: {session.media_id}
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs text-white/50 font-medium mt-1">
                                                        Last activity: {new Date(session.updated_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                                                <div className="flex flex-col items-start sm:items-end gap-1">
                                                    <div className="w-28 sm:w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-accent rounded-full" 
                                                            style={{ width: `${Math.min(100, session.progress || 0)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                                        {Math.round(session.progress || 0)}% Watched
                                                    </span>
                                                </div>

                                                <Link
                                                    href={`/watch/${session.media_type}/${session.media_id}`}
                                                    className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-accent-light transition-colors shadow-md shadow-accent/20 shrink-0"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-white" />
                                                    Resume
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: WATCHLIST */}
                    {activeTab === 'watchlist' && (
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-8 space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                        <Bookmark className="w-5 h-5 text-accent" />
                                        Saved Watchlist
                                    </h2>
                                    <p className="text-xs text-white/50 mt-1">
                                        {watchlistItems.length} titles saved for later
                                    </p>
                                </div>

                                <Link
                                    href="/watchlist"
                                    className="px-3.5 py-2 bg-white/10 hover:bg-white text-white hover:text-black text-xs font-bold rounded-xl transition-colors"
                                >
                                    Full Watchlist Page
                                </Link>
                            </div>

                            {watchlistItems.length === 0 ? (
                                <div className="text-center py-16 space-y-3">
                                    <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/30">
                                        <Bookmark className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-white/60">Your Watchlist is empty.</p>
                                    <p className="text-xs text-white/40 max-w-sm mx-auto">
                                        Browse movies or TV shows and click "+ Add to Watchlist" to save them here!
                                    </p>
                                    <Link
                                        href="/browse"
                                        className="inline-block mt-2 px-6 py-2.5 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-light transition-colors"
                                    >
                                        Explore Movies & Shows
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {watchlistItems.map((item) => (
                                        <div key={item.id} className="group relative bg-black/60 border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all flex flex-col justify-between">
                                            <div className="aspect-[2/3] relative w-full overflow-hidden bg-black">
                                                {item.poster_path ? (
                                                    <Image
                                                        src={getImageUrl(item.poster_path)!}
                                                        alt={item.title || item.name || ''}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/20 font-bold text-xs">
                                                        No Poster
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveWatchlistItem(item.id)}
                                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white/60 hover:text-red-400 backdrop-blur-md transition-colors"
                                                    title="Remove from Watchlist"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                <h4 className="font-bold text-xs text-white truncate">{item.title || item.name}</h4>
                                                <Link
                                                    href={`/watch/${item.media_type || 'movie'}/${item.id}`}
                                                    className="w-full mt-2 py-1.5 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Play className="w-3 h-3 fill-current" /> Watch
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: ACCOUNT SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="grid lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                
                                {/* Edit Profile Form */}
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-8 space-y-6">
                                    <div className="pb-4 border-b border-white/5">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <User className="w-5 h-5 text-accent" />
                                            Profile Settings
                                        </h3>
                                        <p className="text-xs text-white/50 mt-1">Manage your account information and preferences</p>
                                    </div>

                                    {saveSuccessMsg && (
                                        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold flex items-center gap-2">
                                            <Check className="w-4 h-4" />
                                            {saveSuccessMsg}
                                        </div>
                                    )}

                                    <form onSubmit={handleSaveDisplayName} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Display Name</label>
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Your Display Name"
                                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                value={user.email || ''}
                                                disabled
                                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white/40 cursor-not-allowed font-medium"
                                            />
                                            <p className="text-[11px] text-white/30 mt-1">Email address is managed by your authentication provider.</p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSavingName}
                                            className="px-6 py-3 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 shadow-lg shadow-accent/20"
                                        >
                                            {isSavingName ? 'Saving...' : 'Save Profile Changes'}
                                        </button>
                                    </form>
                                </div>

                                {/* Preferred Streaming Server */}
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-8 space-y-6">
                                    <div className="pb-4 border-b border-white/5">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Tv className="w-5 h-5 text-blue-400" />
                                            Default Streaming Server
                                        </h3>
                                        <p className="text-xs text-white/50 mt-1">Choose your preferred default video playback server</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { id: 'vidlink', name: 'VidLink PRO', desc: 'Fast, auto-syncing player (Recommended)' },
                                            { id: 'vidrift', name: 'Vidrift', desc: 'Adaptive HLS & Anime support' },
                                            { id: 'vidout', name: 'VIDOUT', desc: 'Multi-Audio cloud streams' },
                                            { id: 'autoembed', name: 'AutoEmbed', desc: 'High quality anime and movie mirror' },
                                        ].map(server => (
                                            <button
                                                key={server.id}
                                                onClick={() => handleServerChange(server.id)}
                                                className={`p-4 rounded-xl border text-left transition-all ${
                                                    preferredServer === server.id
                                                        ? 'bg-accent/15 border-accent text-white shadow-lg'
                                                        : 'bg-black/40 border-white/10 text-white/60 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <h5 className="font-bold text-xs uppercase tracking-wide text-white">{server.name}</h5>
                                                    {preferredServer === server.id && <Check className="w-4 h-4 text-accent" />}
                                                </div>
                                                <p className="text-[11px] text-white/50">{server.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Security Details */}
                            <div className="space-y-6">
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4">
                                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-accent" />
                                        Account Security
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="p-3 bg-black/50 border border-white/5 rounded-xl">
                                            <p className="text-[10px] font-extrabold uppercase text-white/40 tracking-wider">User ID</p>
                                            <p className="text-xs font-mono text-white/70 truncate mt-1">{user.id}</p>
                                        </div>

                                        <div className="p-3 bg-black/50 border border-white/5 rounded-xl">
                                            <p className="text-[10px] font-extrabold uppercase text-white/40 tracking-wider">Auth Status</p>
                                            <p className="text-xs font-bold text-green-400 flex items-center gap-1.5 mt-1">
                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                Active & Synchronized
                                            </p>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleSignOut}
                                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors border border-red-500/15 text-xs flex items-center justify-center gap-2 mt-4"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out of Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}
