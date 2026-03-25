'use client';

import WatchlistButton from '@/components/WatchlistButton';
import { getImageUrl, Movie } from '@/lib/tmdb';
import { ChevronLeft, ChevronRight, Play, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

interface MovieRowProps {
    title: string;
    movies: Movie[];
    mediaType?: 'movie' | 'tv';
}

export default function MovieRow({ title, movies, mediaType = 'movie' }: MovieRowProps) {
    const rowRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const scrollAmount = direction === 'left' ? -400 : 400;
            rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!movies.length) return null;

    return (
        <section className="py-6 md:py-8">
            {/* Section Header */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 mb-4">
                <div className="flex items-center justify-between">
                    <h2 className="section-title">{title}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Movie Row */}
            <div
                ref={rowRef}
                className="row-container max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12"
            >
                {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} mediaType={mediaType} />
                ))}
            </div>
        </section>
    );
}

interface MovieCardProps {
    movie: Movie;
    mediaType: 'movie' | 'tv';
}

function MovieCard({ movie, mediaType }: MovieCardProps) {
    const router = useRouter();
    const title = movie.title || movie.name || '';
    const type = movie.media_type || mediaType;

    // Use IMDb ID if available, otherwise fall back to numeric ID
    const movieId = movie.imdbID || movie.id;

    const handleCardClick = () => {
        router.push(`/watch/${type}/${movieId}`);
    };

    const handleWatchTogether = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/room/create?type=${type}&id=${movieId}`);
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/watch/${type}/${movieId}`);
    };

    return (
        <div className="flex-shrink-0 w-[150px] md:w-[180px] group">
            <div
                onClick={handleCardClick}
                className="poster-card aspect-[2/3] relative mb-2 cursor-pointer"
            >
                <Image
                    src={getImageUrl(movie.poster_path, 'w342')}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="180px"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                    transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                    <button
                        onClick={handlePlay}
                        className="flex items-center justify-center w-12 h-12 rounded-full 
                             bg-accent hover:bg-accent-light transition-colors"
                    >
                        <Play className="w-5 h-5 fill-white" />
                    </button>
                    <button
                        onClick={handleWatchTogether}
                        className="flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-full
                       hover:bg-white/20 transition-colors"
                    >
                        <Users className="w-3 h-3" />
                        Watch Together
                    </button>
                </div>

                {/* Watchlist Button - Top Right */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <WatchlistButton
                        item={{
                            id: movieId,
                            imdbID: movie.imdbID,
                            title: title,
                            poster_path: movie.poster_path,
                            media_type: type,
                            vote_average: movie.vote_average,
                            release_date: movie.release_date,
                            first_air_date: movie.first_air_date,
                        }}
                        variant="icon"
                    />
                </div>

                {/* Rating Badge */}
                {movie.vote_average > 0 && (
                    <div className="absolute top-2 left-2 rating text-xs">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {movie.vote_average.toFixed(1)}
                    </div>
                )}
            </div>

            {/* Title */}
            <h3
                onClick={handleCardClick}
                className="text-sm font-medium truncate group-hover:text-accent transition-colors cursor-pointer"
            >
                {title}
            </h3>
            <p className="text-xs text-text-muted">
                {movie.release_date
                    ? new Date(movie.release_date).getFullYear()
                    : movie.first_air_date
                        ? new Date(movie.first_air_date).getFullYear()
                        : ''}
            </p>
        </div>
    );
}
