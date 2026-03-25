'use client';

import Navbar from '@/components/Navbar';
import { getRoomByCode } from '@/lib/supabase';
import { ArrowRight, Loader2, Users, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinRoomPage() {
    const router = useRouter();
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
            const { room, error: roomError } = await getRoomByCode(code);

            if (roomError || !room) {
                setError('Room not found. Check the code and try again.');
                setIsLoading(false);
                return;
            }

            router.push(`/room/${room.code}`);
        } catch (err) {
            console.error('Error looking up room:', err);
            setError('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Auto-uppercase and remove special characters
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        setRoomCode(value);
        setError('');
    };

    return (
        <main className="min-h-screen bg-bg-primary">
            <Navbar />

            <div className="pt-20 pb-12 min-h-screen flex items-center justify-center">
                <div className="w-full max-w-md px-4">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center">
                            <Users className="w-8 h-8 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Join a Watch Room</h1>
                        <p className="text-text-secondary">
                            Enter the room code shared by your friend to join their watch party.
                        </p>
                    </div>

                    {/* Join Form */}
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Room Code</label>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={handleCodeChange}
                                placeholder="Enter room code (e.g., ABC123)"
                                maxLength={10}
                                className={`input-primary w-full text-center text-2xl tracking-widest font-mono uppercase ${error ? 'border-red-500 focus:border-red-500' : ''
                                    }`}
                                autoFocus
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-lg">
                                <XCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
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

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-bg-primary text-text-muted">or</span>
                        </div>
                    </div>

                    {/* Create Room CTA */}
                    <div className="text-center">
                        <p className="text-text-secondary mb-4">
                            Want to start your own watch party?
                        </p>
                        <button
                            onClick={() => router.push('/room/create')}
                            className="btn-ghost inline-flex items-center gap-2"
                        >
                            Create a Watch Room
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
