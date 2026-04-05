'use client';

import Navbar from '@/components/Navbar';
import { getPublicRooms, getUserSessions, Room } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
    Check,
    ChevronRight,
    Clock,
    Film,
    Globe,
    Lock,
    LogOut,
    Play,
    Plus,
    Settings,
    Tv,
    User,
    Users
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// TMDB Image URL helper
const getImageUrl = (path: string | null) => path ? `https://image.tmdb.org/t/p/w500${path}` : null;

export default function DashboardPage() {
    const { user, signOut } = useAuthStore();
    const router = useRouter();

    const [roomCode, setRoomCode] = useState('');
    const [publicRooms, setPublicRooms] = useState<Room[]>([]);
    const [recentSessions, setRecentSessions] = useState<any[]>([]);
    
    // Stats
    const [totalWatchTime, setTotalWatchTime] = useState('0h');
    const [totalSessions, setTotalSessions] = useState(0);

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
            // In our new architecture, the code is sufficient to route and validate
            router.push(`/room/${normalizedCode}`);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

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

            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-12">
                <div className="max-w-[1400px] mx-auto">
                    {/* Header */}
                    <div className="mb-8 pl-2 border-l-4 border-accent">
                        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
                        <p className="text-white/60">Manage your watch rooms and sessions</p>
                    </div>

                    {/* Main Grid */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Quick Actions */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Create Room Card */}
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/20">
                                            <Plus className="w-5 h-5 text-accent" />
                                        </div>
                                        <h3 className="font-semibold text-lg">Host a Watch Party</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-sm text-white/60 leading-relaxed">
                                            Create a synchronized room, choose a cinematic experience, and invite friends.
                                        </p>
                                        <Link
                                            href="/room/create"
                                            className="w-full py-3 bg-accent text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-accent-light transition-colors shadow-lg shadow-accent/20"
                                        >
                                            Create Room
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Join Room Card */}
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                                            <Users className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-lg">Join Private Room</h3>
                                    </div>

                                    <div className="space-y-4 mt-1">
                                         <p className="text-sm text-white/60 mb-2">
                                            Have a secret room code? Enter it below.
                                        </p>
                                        <input
                                            type="text"
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                            placeholder="Enter Room Code..."
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest text-center uppercase"
                                        />
                                        <button
                                            onClick={handleJoinRoom}
                                            disabled={!roomCode.trim()}
                                            className={`w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2 ${roomCode.trim()
                                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                                                }`}
                                        >
                                            <Lock className="w-4 h-4" />
                                            Unlock & Join
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Sessions (Dynamically mapped from backend progress) */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold flex items-center gap-2 text-lg">
                                        <Clock className="w-5 h-5 text-accent" />
                                        Your Recent Activity
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    {recentSessions.length === 0 ? (
                                        <div className="text-center py-8 text-white/40 font-medium">No watch history found yet.</div>
                                    ) : (
                                        recentSessions.map((session) => (
                                            <div
                                                key={session.id}
                                                onClick={() => router.push(`/watch/${session.media_type}/${session.media_id}`)}
                                                className="flex items-center justify-between p-4 bg-black/50 border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${
                                                            session.media_type === 'movie' 
                                                            ? 'bg-purple-500/10 border-purple-500/20' 
                                                            : 'bg-green-500/10 border-green-500/20'
                                                        }`}>
                                                        {session.media_type === 'movie'
                                                            ? <Film className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                                                            : <Tv className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white group-hover:text-accent transition-colors">
                                                            {session.media_type.toUpperCase()} - ID: {session.media_id}
                                                        </h4>
                                                        <p className="text-xs text-white/50 font-medium tracking-wide mt-1">
                                                            Last watched: {new Date(session.updated_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-accent relative rounded-full" 
                                                            style={{ width: `${Math.min(100, session.progress || 0)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{Math.round(session.progress || 0)}% Watched</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className="space-y-6">
                            
                            {/* Profile Card */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-accent/20 to-transparent"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-8 pt-2">
                                        <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-light rounded-full flex items-center justify-center text-2xl font-black shadow-[0_0_20px_rgba(229,9,20,0.3)] border-2 border-white/10">
                                            {user.email?.[0].toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl">{user.user_metadata?.name || 'Cineby User'}</h3>
                                            <p className="text-sm text-white/50 font-medium">{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="text-center p-4 bg-black/50 border border-white/5 rounded-2xl">
                                            <p className="text-3xl font-black mb-1 text-white">{totalSessions}</p>
                                            <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Sessions</p>
                                        </div>
                                        <div className="text-center p-4 bg-black/50 border border-white/5 rounded-2xl">
                                            <p className="text-3xl font-black mb-1 text-white">{totalWatchTime}</p>
                                            <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Watch Time</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <button className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-semibold text-sm">
                                            <div className="flex items-center gap-3">
                                                <Settings className="w-4 h-4 text-white/50" />
                                                <span>Account Settings</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-white/30" />
                                        </button>
                                        <button 
                                            onClick={handleSignOut}
                                            className="w-full flex items-center justify-between px-5 py-3.5 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl transition-colors font-semibold text-sm border border-red-500/10"
                                        >
                                            <div className="flex items-center gap-3">
                                                <LogOut className="w-4 h-4" />
                                                <span>Sign Out</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Public Rooms Directory */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                                <h3 className="font-bold mb-6 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-green-400" />
                                    Live Public Rooms
                                </h3>

                                <div className="space-y-3">
                                    {publicRooms.length === 0 ? (
                                        <div className="text-center py-6">
                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Tv className="w-5 h-5 text-white/30" />
                                            </div>
                                            <p className="text-sm font-medium text-white/40">No public rooms active.</p>
                                            <p className="text-xs text-white/30 mt-1">Be the first to host one!</p>
                                        </div>
                                    ) : (
                                        publicRooms.map((room) => (
                                            <div key={room.id} className="group relative bg-black/50 border border-white/5 rounded-xl p-3 hover:bg-white/5 transition-all">
                                                <div className="flex gap-3">
                                                    <div className="w-12 h-12 bg-white/10 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                                                         <Film className="w-5 h-5 text-white/20" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-bold text-sm truncate pr-2">{room.name}</h4>
                                                            <span className="shrink-0 flex items-center gap-1 bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">
                                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                                                Live
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-white/40 truncate font-medium flex items-center gap-1">
                                                            <User className="w-3 h-3" /> {room.host_name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => router.push(`/room/${room.code}`)} 
                                                    className="w-full mt-3 py-2 bg-white/10 hover:bg-white font-bold hover:text-black rounded-lg text-xs transition-colors"
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
                </div>
            </div>
        </main>
    );
}
