'use client';

import { getImageUrl, Movie } from '@/lib/tmdb';
import { Info, Play, Star, Users } from 'lucide-react';
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
        <div
            className={`absolute inset-0 transition-opacity duration-700 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
        >
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
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="relative h-full flex items-center">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 w-full">
                    <div className="max-w-2xl">
                        {/* Badge */}
                        <div className="flex items-center gap-3 mb-4 animate-fade-in">
                            <span className="badge">#1 Trending</span>
                            {movie.vote_average > 0 && (
                                <span className="rating text-yellow-400">
                                    <Star className="w-4 h-4 fill-yellow-400" />
                                    {movie.vote_average.toFixed(1)}
                                </span>
                            )}
                            {releaseYear && (
                                <span className="text-text-secondary text-sm">{releaseYear}</span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 animate-slide-up">
                            {title}
                        </h1>

                        {/* Description */}
                        <p className="text-text-secondary text-lg leading-relaxed mb-8 line-clamp-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
                            {movie.overview}
                        </p>

                        {/* Buttons */}
                        <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
                            <Link
                                href={`/watch/${movie.media_type || 'movie'}/${movie.imdbID || movie.id}`}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Play className="w-5 h-5 fill-white" />
                                Watch Now
                            </Link>
                            <Link
                                href={`/room/create?type=${movie.media_type || 'movie'}&id=${movie.imdbID || movie.id}`}
                                className="btn-ghost flex items-center gap-2"
                            >
                                <Users className="w-5 h-5" />
                                Watch Together
                            </Link>
                            <button className="btn-ghost flex items-center gap-2">
                                <Info className="w-5 h-5" />
                                Details
                            </button>
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
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-rotate
    useEffect(() => {
        if (movies.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % movies.length);
        }, 8000);

        return () => clearInterval(interval);
    }, [movies.length]);

    if (!movies.length) return null;

    return (
        <section className="relative h-[70vh] min-h-[500px] max-h-[900px] w-full overflow-hidden">
            {/* Slides */}
            {movies.slice(0, 5).map((movie, index) => (
                <HeroSlide
                    key={movie.id}
                    movie={movie}
                    isActive={index === currentIndex}
                />
            ))}

            {/* Indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {movies.slice(0, 5).map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-1 rounded-full transition-all duration-300 ${index === currentIndex
                            ? 'w-8 bg-accent'
                            : 'w-4 bg-text-muted hover:bg-text-secondary'
                            }`}
                    />
                ))}
            </div>
        </section>
    );
}
