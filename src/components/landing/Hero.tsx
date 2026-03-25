'use client';

import { Play, Users } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-animated-gradient"></div>
            <div className="absolute inset-0 mesh-gradient"></div>

            {/* Particles */}
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
            <div className="particle particle-4"></div>
            <div className="particle particle-5"></div>

            {/* Glow Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-coral-500/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-wine-500/15 rounded-full blur-[80px]"></div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-sm text-text-secondary">10,000+ watch parties created this week</span>
                </div>

                {/* Headline */}
                <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl mb-6 leading-tight animate-slide-up">
                    Watch together.
                    <br />
                    <span className="text-gradient">Feel together.</span>
                </h1>

                {/* Subheadline */}
                <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    The ultimate social watching experience. Stream movies, series, and live sports
                    with friends in perfect sync — no matter the distance.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <Link
                        href="/room/create"
                        className="btn-primary text-lg px-8 py-4 flex items-center gap-3 glow-coral"
                    >
                        <Play className="w-5 h-5" />
                        Create Watch Room
                    </Link>
                    <Link
                        href="/dashboard"
                        className="btn-secondary text-lg px-8 py-4 flex items-center gap-3"
                    >
                        <Users className="w-5 h-5" />
                        Join a Room
                    </Link>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap justify-center gap-8 mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="text-center">
                        <div className="font-display font-bold text-3xl text-gradient">250ms</div>
                        <div className="text-text-muted text-sm">Sync Accuracy</div>
                    </div>
                    <div className="w-px h-12 bg-night-600 hidden sm:block"></div>
                    <div className="text-center">
                        <div className="font-display font-bold text-3xl text-white">5M+</div>
                        <div className="text-text-muted text-sm">Watch Parties</div>
                    </div>
                    <div className="w-px h-12 bg-night-600 hidden sm:block"></div>
                    <div className="text-center">
                        <div className="font-display font-bold text-3xl text-white">100K+</div>
                        <div className="text-text-muted text-sm">Movies & Shows</div>
                    </div>
                </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-night-800 to-transparent"></div>
        </section>
    );
}
