'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.auth.signUp({ email, password });
        
        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            
            // If session is null, it means Email Confirmation is enabled in Supabase!
            if (data.user && !data.session) {
                setEmailSent(true);
            } else {
                // Email confirmation is disabled, logged in automatically
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 2000);
            }
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
                    <h2 className="text-xl font-medium text-gray-300 mt-4">Create an account</h2>
                </div>

                {success ? (
                    emailSent ? (
                        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-6 rounded-xl text-sm text-center">
                            <p className="font-bold text-lg mb-2">Check your email!</p>
                            <p>We sent a confirmation link to <strong>{email}</strong>.</p>
                            <p className="mt-2 opacity-80">You must click the link before you can log in.</p>
                        </div>
                    ) : (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-6 rounded-xl text-sm text-center">
                            <p className="font-bold text-lg mb-2">Account created!</p>
                            <p>Logging you in automatically...</p>
                        </div>
                    )
                ) : (
                    <form onSubmit={handleSignup} className="space-y-4">
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
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#0dcaf0] focus:ring-1 focus:ring-[#0dcaf0] transition-colors"
                                placeholder="At least 6 characters"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || password.length < 6}
                            className="w-full bg-[#0dcaf0] hover:bg-[#0bc1e6] text-black font-bold rounded-xl px-4 py-3 mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(13,202,240,0.3)]"
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                )}

                <p className="text-center text-gray-500 text-sm mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#0dcaf0] hover:underline hover:text-white transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
