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
                    className="object-cover object-top sm:object-center"
                    priority={isActive}
                    sizes="100vw"
                />
                {/* Gradient Overlays tuned for mobile & desktop readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b] via-[#0b0b0b]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent" />
            </div>

            {/* Content Container - Pushed lower on mobile so hero image is clearly visible */}
            <div className="relative h-full flex items-end pb-24 sm:pb-28 pt-24">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 w-full">
                    <div className="max-w-2xl">
                        
                        {/* Title - Bold cinematic impact font style */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-3 tracking-tighter uppercase animate-slide-up leading-[0.95] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] text-white">
                            {title}
                        </h1>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-3 mb-4 animate-fade-in text-xs sm:text-sm font-semibold text-white/90">
                            {movie.vote_average > 0 && (
                                <span className="flex items-center gap-1 text-yellow-500">
                                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-500" />
                                    {movie.vote_average.toFixed(1)}
                                </span>
                            )}
                            <span className="w-1 h-1 rounded-full bg-white/40" />
                            {releaseYear && <span>{releaseYear}</span>}
                            {movie.genres && movie.genres.length > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-white/40 hidden sm:inline" />
                                    <span className="hidden sm:inline">{movie.genres.map(g => g.name).join(' | ')}</span>
                                </>
                            )}
                        </div>

                        {/* Description - 2 lines on mobile, 3 lines on desktop */}
                        <p className="text-text-secondary text-sm sm:text-base lg:text-lg leading-relaxed mb-6 line-clamp-2 sm:line-clamp-3 animate-slide-up max-w-xl font-medium" style={{ animationDelay: '100ms' }}>
                            {movie.overview}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 sm:gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
                            <Link
                                href={`/watch/${movie.media_type || 'movie'}/${movie.id}`}
                                className="flex items-center gap-2 bg-white text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold hover:bg-white/90 hover:scale-105 transition-all shadow-xl text-sm sm:text-base"
                            >
                                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
                                Play
                            </Link>
                            <Link
                                href={`/watch/${movie.media_type || 'movie'}/${movie.id}`}
                                className="flex items-center gap-2 bg-[#1a1a1a]/80 text-white border border-white/20 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold hover:bg-white/10 hover:border-white/40 transition-all backdrop-blur-md text-sm sm:text-base"
                            >
                                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
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
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);

    const minSwipeDistance = 40;

    const nextSlide = () => {
        setActiveIndex((current) => (current + 1) % movies.length);
    };

    const prevSlide = () => {
        setActiveIndex((current) => (current - 1 + movies.length) % movies.length);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEndX(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (touchStartX === null || touchEndX === null) return;
        const distance = touchStartX - touchEndX;

        if (distance > minSwipeDistance) {
            nextSlide();
        } else if (distance < -minSwipeDistance) {
            prevSlide();
        }
    };

    useEffect(() => {
        if (!movies.length) return;
        const interval = setInterval(() => {
            nextSlide();
        }, 8000); // 8 seconds per slide
        return () => clearInterval(interval);
    }, [movies.length]);

    if (!movies.length) return null;

    return (
        <section
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative h-screen sm:h-[85vh] min-h-[650px] w-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
        >
            {movies.map((movie, index) => (
                <HeroSlide
                    key={`${movie.media_type || 'movie'}:${movie.id}`}
                    movie={movie}
                    isActive={index === activeIndex}
                />
            ))}

            {/* Pagination Indicators & Swipe Controls */}
            <div className="absolute bottom-8 sm:bottom-20 right-4 sm:right-12 z-20 flex items-center gap-2.5">
                {/* Arrow navigation buttons */}
                <button
                    onClick={prevSlide}
                    className="p-2 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-md"
                    aria-label="Previous slide"
                >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>

                {movies.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        className={`transition-all duration-300 rounded-full bg-white ${
                            index === activeIndex ? 'w-6 sm:w-8 h-2 sm:h-2.5 opacity-100 bg-accent' : 'w-2 sm:w-2.5 h-2 sm:h-2.5 opacity-40 hover:opacity-100'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}

                <button
                    onClick={nextSlide}
                    className="p-2 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-md"
                    aria-label="Next slide"
                >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
            </div>
        </section>
    );
}
