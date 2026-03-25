'use client';

import Navbar from '@/components/Navbar';
import {
    Check,
    ChevronRight,
    Clock,
    Copy,
    Film,
    LogOut,
    Play,
    Plus,
    Settings,
    Tv,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function DashboardPage() {
    const [roomCode, setRoomCode] = useState('');

    const handleJoinRoom = () => {
        if (roomCode.trim()) {
            const normalizedCode = roomCode.replace('TW-', '').trim().toUpperCase();
            window.location.href = `/room/${normalizedCode}`;
        }
    };

    // Mock data
    const recentSessions = [
        { id: 1, title: 'Dune: Part Two', type: 'movie', date: 'Today, 8:00 PM', participants: 4 },
        { id: 2, title: 'The Bear S3', type: 'tv', date: 'Yesterday', participants: 2 },
        { id: 3, title: 'Interstellar', type: 'movie', date: '2 days ago', participants: 5 },
    ];

    const friends = [
        { id: 1, name: 'Alex', status: 'watching', content: 'Breaking Bad' },
        { id: 2, name: 'Sam', status: 'online', content: null },
        { id: 3, name: 'Jordan', status: 'offline', content: null },
    ];

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-12">
                <div className="max-w-[1400px] mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                        <p className="text-text-secondary">Manage your watch rooms and sessions</p>
                    </div>

                    {/* Main Grid */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quick Actions */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Create Room Card */}
                                <div className="bg-bg-card border border-border rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                                            <Plus className="w-5 h-5 text-accent" />
                                        </div>
                                        <h3 className="font-semibold">Create Room</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm text-text-secondary">
                                            Create a real room backed by the app database and share its invite code.
                                        </p>
                                        <Link
                                            href="/room/create"
                                            className="btn-primary w-full flex items-center justify-center gap-2"
                                        >
                                            Create Room
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Join Room Card */}
                                <div className="bg-bg-card border border-border rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                            <Users className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold">Join Room</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                            placeholder="Enter room code (TW-XXXXXX)"
                                            className="input font-mono"
                                        />
                                        <button
                                            onClick={handleJoinRoom}
                                            disabled={!roomCode.trim()}
                                            className={`w-full py-3 rounded-xl font-medium transition-all ${roomCode.trim()
                                                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                                                    : 'bg-bg-hover text-text-muted cursor-not-allowed'
                                                }`}
                                        >
                                            Join Room
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Sessions */}
                            <div className="bg-bg-card border border-border rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-text-muted" />
                                        Recent Sessions
                                    </h3>
                                    <button className="text-sm text-accent hover:text-accent-light transition-colors">
                                        View All
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {recentSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="flex items-center justify-between p-4 bg-bg-primary rounded-xl 
                               hover:bg-bg-hover transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${session.type === 'movie' ? 'bg-purple-500/20' : 'bg-green-500/20'
                                                    }`}>
                                                    {session.type === 'movie'
                                                        ? <Film className="w-5 h-5 text-purple-400" />
                                                        : <Tv className="w-5 h-5 text-green-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{session.title}</h4>
                                                    <p className="text-sm text-text-muted">{session.date}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1 text-sm text-text-secondary">
                                                    <Users className="w-4 h-4" />
                                                    {session.participants}
                                                </span>
                                                <button className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors">
                                                    <Play className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Browse */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Link
                                    href="/browse?type=movie"
                                    className="flex items-center gap-4 p-6 bg-bg-card border border-border rounded-2xl
                           hover:bg-bg-hover hover:border-border-hover transition-all group"
                                >
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center
                                group-hover:bg-purple-500/30 transition-colors">
                                        <Film className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold group-hover:text-accent transition-colors">Browse Movies</h4>
                                        <p className="text-sm text-text-muted">Explore latest releases</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/browse?type=tv"
                                    className="flex items-center gap-4 p-6 bg-bg-card border border-border rounded-2xl
                           hover:bg-bg-hover hover:border-border-hover transition-all group"
                                >
                                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center
                                group-hover:bg-green-500/30 transition-colors">
                                        <Tv className="w-6 h-6 text-green-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold group-hover:text-accent transition-colors">Browse TV Shows</h4>
                                        <p className="text-sm text-text-muted">Discover new series</p>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className="space-y-6">
                            {/* Profile Card */}
                            <div className="bg-bg-card border border-border rounded-2xl p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-light 
                                rounded-full flex items-center justify-center text-xl font-bold">
                                        U
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">User</h3>
                                        <p className="text-sm text-text-muted">user@example.com</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="text-center p-3 bg-bg-primary rounded-xl">
                                        <p className="text-2xl font-bold">12</p>
                                        <p className="text-xs text-text-muted">Sessions</p>
                                    </div>
                                    <div className="text-center p-3 bg-bg-primary rounded-xl">
                                        <p className="text-2xl font-bold">5</p>
                                        <p className="text-xs text-text-muted">Friends</p>
                                    </div>
                                    <div className="text-center p-3 bg-bg-primary rounded-xl">
                                        <p className="text-2xl font-bold">48h</p>
                                        <p className="text-xs text-text-muted">Watch Time</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button className="w-full flex items-center gap-3 px-4 py-3 text-left
                                   hover:bg-bg-hover rounded-xl transition-colors">
                                        <Settings className="w-5 h-5 text-text-muted" />
                                        <span>Settings</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-3 text-left
                                   text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                                        <LogOut className="w-5 h-5" />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>

                            {/* Friends Activity */}
                            <div className="bg-bg-card border border-border rounded-2xl p-6">
                                <h3 className="font-semibold mb-4">Friends Activity</h3>

                                <div className="space-y-3">
                                    {friends.map((friend) => (
                                        <div key={friend.id} className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 bg-bg-hover rounded-full flex items-center justify-center font-medium">
                                                    {friend.name[0]}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-card ${friend.status === 'watching' ? 'bg-accent' :
                                                        friend.status === 'online' ? 'bg-green-400' : 'bg-text-muted'
                                                    }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{friend.name}</p>
                                                <p className="text-xs text-text-muted truncate">
                                                    {friend.status === 'watching'
                                                        ? `Watching ${friend.content}`
                                                        : friend.status === 'online' ? 'Online' : 'Offline'
                                                    }
                                                </p>
                                            </div>
                                            {friend.status === 'watching' && (
                                                <button className="text-xs text-accent hover:text-accent-light transition-colors">
                                                    Join
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
