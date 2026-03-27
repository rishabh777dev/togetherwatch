'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            setError(error.message);
        } else {
            router.push('/');
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111] border border-white/5 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <Link href="/" className="text-2xl font-bold tracking-tight text-white mb-2 inline-block">
                        <span className="bg-red-600 text-white px-2 py-1 rounded inline-flex mr-1">T</span>
                        Together<span className="text-red-500">Watch</span>
                    </Link>
                    <h2 className="text-xl font-medium text-gray-300 mt-4">Welcome back</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#0dcaf0] focus:ring-1 focus:ring-[#0dcaf0] transition-colors"
                            placeholder="you@email.com"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#0dcaf0] focus:ring-1 focus:ring-[#0dcaf0] transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-[#0dcaf0] hover:bg-[#0bc1e6] text-black font-bold rounded-xl px-4 py-3 mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(13,202,240,0.3)]"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-[#0dcaf0] hover:underline hover:text-white transition-colors">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
