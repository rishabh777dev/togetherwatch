'use client';

import { getImageUrl, Movie } from '@/lib/tmdb';
import { Info, Play, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HeroSlideProps {
    movie: Movie;
    isActive: boolean;
}

function HeroSlide({ movie, isActive }: HeroSlideProps) {
    const title = movie.title || movie.name || '';
    const releaseYear = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : movie.first_air_date
            ? new Date(movie.first_air_date).getFullYear()
            : '';

    return (
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            {/* Background Image */}
            <div className="absolute inset-0">
                <Image
                    src={getImageUrl(movie.backdrop_path, 'original')}
                    alt={title}
                    fill
                    className="object-cover"
                    priority={isActive}
                    sizes="100vw"
                />
                {/* Cineby-style Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-primary to-transparent" />
            </div>

            {/* Content */}
            <div className="relative h-full flex items-center pt-20">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 w-full">
                    <div className="max-w-2xl">
                        
                        {/* Title - Huge Impact font style */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-4 tracking-tight uppercase animate-slide-up leading-none drop-shadow-2xl text-white">
                            {title}
                        </h1>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-3 mb-6 animate-fade-in text-sm font-semibold text-white/80">
                            {movie.vote_average > 0 && (
                                <span className="flex items-center gap-1 text-yellow-500">
                                    <Star className="w-4 h-4 fill-yellow-500" />
                                    {movie.vote_average.toFixed(1)}
                                </span>
                            )}
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            {releaseYear && <span>{releaseYear}</span>}
                            {movie.genres && movie.genres.length > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-white/30" />
                                    <span>{movie.genres.map(g => g.name).join(' | ')}</span>
                                </>
                            )}
                        </div>

                        {/* Description */}
                        <p className="text-text-secondary text-base lg:text-lg leading-relaxed mb-8 line-clamp-3 animate-slide-up max-w-xl font-medium" style={{ animationDelay: '100ms' }}>
                            {movie.overview}
                        </p>

                        {/* Buttons matching Cineby */}
                        <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
                            <Link
                                href={`/watch/${movie.media_type || 'movie'}/${movie.id}`}
                                className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-white/90 hover:scale-105 transition-all shadow-xl"
                            >
                                <Play className="w-5 h-5 fill-black" />
                                Play
                            </Link>
                            <Link
                                href={`/watch/${movie.media_type || 'movie'}/${movie.id}`}
                                className="flex items-center gap-2 bg-[#1a1a1a]/80 text-white border border-white/20 px-8 py-3 rounded-full font-bold hover:bg-white/10 hover:border-white/40 transition-all backdrop-blur-md"
                            >
                                <Info className="w-5 h-5" />
                                See More
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface HeroCarouselProps {
    movies: Movie[];
}

export default function HeroCarousel({ movies }: HeroCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (!movies.length) return;
        const interval = setInterval(() => {
            setActiveIndex((current) => (current + 1) % movies.length);
        }, 8000); // 8 seconds per slide
        return () => clearInterval(interval);
    }, [movies.length]);

    if (!movies.length) return null;

    return (
        <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
            {movies.map((movie, index) => (
                <HeroSlide
                    key={movie.id}
                    movie={movie}
                    isActive={index === activeIndex}
                />
            ))}

            {/* Pagination Indicators matching Cineby */}
            <div className="absolute bottom-32 right-12 z-20 flex gap-2">
                {movies.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        className={`transition-all duration-300 rounded-full bg-white ${
                            index === activeIndex ? 'w-8 h-2 opacity-100' : 'w-2 h-2 opacity-30 hover:opacity-100'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
