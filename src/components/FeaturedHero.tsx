'use client';

import { Movie, getImageUrl } from '@/lib/tmdb';
import { Info, Play, Star, Users, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface FeaturedHeroProps {
    movie: Movie;
}

export default function FeaturedHero({ movie }: FeaturedHeroProps) {
    const [isMuted, setIsMuted] = useState(true);
    const title = movie.title || movie.name || 'Untitled';
    const releaseYear = (movie.release_date || movie.first_air_date)?.split('-')[0];
    const mediaType = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');

    return (
        <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                {movie.backdrop_path ? (
                    <Image
                        src={getImageUrl(movie.backdrop_path, 'original')}
                        alt={title}
                        fill
                        className="object-cover object-top"
                        priority
                        sizes="100vw"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-night-700 to-night-900" />
                )}

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-night-800 via-night-800/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-night-800 via-transparent to-night-800/30" />
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-night-800 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex items-center">
                <div className="max-w-[1600px] mx-auto px-4 w-full pt-20">
                    <div className="max-w-2xl">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-coral-500/20 border border-coral-500/30 mb-4">
                            <span className="w-2 h-2 rounded-full bg-coral-500 animate-pulse" />
                            <span className="text-sm font-medium text-coral-400">
                                {mediaType === 'tv' ? 'Popular TV Show' : 'Featured Movie'}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl mb-4 leading-tight">
                            {title}
                        </h1>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-5 h-5 fill-yellow-400" />
                                <span className="font-semibold">{movie.vote_average.toFixed(1)}</span>
                            </div>
                            {releaseYear && (
                                <span className="text-text-secondary">{releaseYear}</span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-white/10 text-sm">
                                {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                            </span>
                        </div>

                        {/* Overview */}
                        <p className="text-lg text-text-secondary leading-relaxed mb-8 line-clamp-3">
                            {movie.overview}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                href={`/room/create?type=${mediaType}&id=${movie.id}`}
                                className="btn-primary text-lg px-8 py-4 flex items-center gap-3 glow-coral"
                            >
                                <Users className="w-5 h-5" />
                                Watch Together
                            </Link>

                            <Link
                                href={`/watch/${mediaType}/${movie.id}`}
                                className="btn-secondary text-lg px-8 py-4 flex items-center gap-3"
                            >
                                <Play className="w-5 h-5" />
                                Watch Now
                            </Link>

                            <Link
                                href={`/details/${mediaType}/${movie.id}`}
                                className="p-4 rounded-full bg-night-600/50 hover:bg-night-500/50 transition-colors"
                            >
                                <Info className="w-6 h-6" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mute Button (for video backgrounds) */}
            <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-24 right-8 p-3 rounded-full bg-night-800/50 border border-white/20
                 hover:bg-night-700/50 transition-colors hidden"
            >
                {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                ) : (
                    <Volume2 className="w-5 h-5" />
                )}
            </button>
        </section>
    );
}
