'use client';

import Navbar from '@/components/Navbar';
import { getRoomByCode } from '@/lib/supabase';
import { ArrowRight, Loader2, Plus, Users, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function WatchTogetherPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
    const [roomCode, setRoomCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const code = roomCode.trim().toUpperCase();

        if (!code) {
            setError('Please enter a room code');
            return;
        }

        if (code.length < 4) {
            setError('Room code must be at least 4 characters');
            return;
        }

        setIsLoading(true);

        try {
            // Look up room in Supabase
            const { room, error: roomError } = await getRoomByCode(code);

            if (roomError || !room) {
                setError('Room not found. Check the code and try again.');
                setIsLoading(false);
                return;
            }

            // Room found! Navigate to it
            router.push(`/room/${room.code}`);
        } catch (err) {
            console.error('Error looking up room:', err);
            setError('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        setRoomCode(value);
        setError('');
    };

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-20 pb-12 min-h-screen flex items-center justify-center">
                <div className="w-full max-w-lg px-4">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-accent to-accent-light rounded-full flex items-center justify-center">
                            <Users className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Watch Together</h1>
                        <p className="text-text-secondary">
                            Create a room to host or join an existing watch party
                        </p>
                    </div>

                    {/* Tab Selector */}
                    <div className="flex bg-bg-secondary rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'create'
                                ? 'bg-accent text-white'
                                : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            <Plus className="w-5 h-5" />
                            Create Room
                        </button>
                        <button
                            onClick={() => setActiveTab('join')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'join'
                                ? 'bg-accent text-white'
                                : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            Join Room
                        </button>
                    </div>

                    {/* Content */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6">
                        {activeTab === 'create' ? (
                            /* Create Room Tab */
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-bg-hover rounded-full flex items-center justify-center">
                                    <Plus className="w-8 h-8 text-accent" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Host a Watch Party</h2>
                                <p className="text-text-secondary mb-6">
                                    Pick a movie or show, invite friends, and enjoy together in perfect sync.
                                </p>
                                <Link
                                    href="/room/create"
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    Create New Room
                                    <ArrowRight className="w-5 h-5" />
                                </Link>

                                <div className="mt-6 pt-6 border-t border-border">
                                    <h3 className="text-sm font-medium text-text-muted mb-3">How it works:</h3>
                                    <div className="flex items-start gap-3 text-left">
                                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-accent">1</div>
                                        <p className="text-sm text-text-secondary">Choose a movie or show</p>
                                    </div>
                                    <div className="flex items-start gap-3 text-left mt-2">
                                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-accent">2</div>
                                        <p className="text-sm text-text-secondary">Share the room code with friends</p>
                                    </div>
                                    <div className="flex items-start gap-3 text-left mt-2">
                                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-accent">3</div>
                                        <p className="text-sm text-text-secondary">Watch in sync and chat together!</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Join Room Tab */
                            <form onSubmit={handleJoin} className="space-y-4">
                                <div className="text-center mb-4">
                                    <h2 className="text-xl font-semibold mb-2">Join a Watch Party</h2>
                                    <p className="text-text-secondary text-sm">
                                        Enter the room code shared by the host
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Room Code</label>
                                    <input
                                        type="text"
                                        value={roomCode}
                                        onChange={handleCodeChange}
                                        placeholder="e.g., ABC123"
                                        maxLength={10}
                                        className={`input-primary w-full text-center text-2xl tracking-widest font-mono uppercase ${error ? 'border-red-500 focus:border-red-500' : ''
                                            }`}
                                        autoFocus={activeTab === 'join'}
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-lg">
                                        <XCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !roomCode}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Joining...
                                        </>
                                    ) : (
                                        <>
                                            Join Room
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
