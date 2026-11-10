'use client';

import WatchlistButton from '@/components/WatchlistButton';
import { getImageUrl, Movie } from '@/lib/tmdb';
import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';
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
            const scrollAmount = direction === 'left' ? -rowRef.current.clientWidth / 1.5 : rowRef.current.clientWidth / 1.5;
            rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!movies.length) return null;

    return (
        <section className="py-6 lg:py-8 w-full">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-[3px] h-6 bg-accent rounded-full"></div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => scroll('left')} 
                            aria-label="Scroll left"
                            className="p-2 rounded-full bg-black/60 hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-md border border-white/5 hover:border-white/20"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => scroll('right')} 
                            aria-label="Scroll right"
                            className="p-2 rounded-full bg-black/60 hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-md border border-white/5 hover:border-white/20"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div ref={rowRef} className="row-container max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 gap-3 sm:gap-4">
                {movies.map((movie) => (
                    <MovieCard key={`${movie.media_type || mediaType}:${movie.id}`} movie={movie} mediaType={mediaType} />
                ))}
            </div>
        </section>
    );
}

function MovieCard({ movie, mediaType }: { movie: Movie; mediaType: 'movie' | 'tv' }) {
    const router = useRouter();
    const title = movie.title || movie.name || '';
    const type = movie.media_type || mediaType;
    const movieId = movie.id;

    const handleCardClick = () => router.push(`/watch/${type}/${movieId}`);

    // Prioritize poster_path for portrait movie/series poster
    const imagePath = movie.poster_path || movie.backdrop_path;

    const releaseYear = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : movie.first_air_date
            ? new Date(movie.first_air_date).getFullYear()
            : null;

    return (
        <div 
            onClick={handleCardClick}
            className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[185px] lg:w-[205px] group cursor-pointer select-none"
        >
            {/* Poster Card (2:3 Portrait Aspect Ratio) */}
            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141414] border border-white/5 shadow-lg shadow-black/40 transition-all duration-300 group-hover:scale-[1.04] group-hover:border-white/20 group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
                <Image
                    src={getImageUrl(imagePath, 'w500')}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 140px, (max-width: 768px) 165px, (max-width: 1024px) 185px, 205px"
                />

                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>

                {/* Rating Badge (Top Left) */}
                {movie.vote_average > 0 && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black bg-black/70 backdrop-blur-md text-white border border-white/10 shadow-md">
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                        <span>{movie.vote_average.toFixed(1)}</span>
                    </div>
                )}

                {/* Type Pill (Top Right) */}
                <div className="absolute top-2.5 right-2.5">
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white/80 border border-white/10">
                        {type === 'movie' ? 'Movie' : 'Series'}
                    </span>
                </div>

                {/* Center Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                </div>

                {/* Watchlist Quick Action (Bottom Right) */}
                <div 
                    className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <WatchlistButton item={{...movie, media_type: type}} variant="icon" />
                </div>
            </div>

            {/* Title & Metadata Below Poster */}
            <div className="mt-2.5 px-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-accent transition-colors leading-snug">
                    {title}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-white/40 mt-0.5">
                    {releaseYear && <span>{releaseYear}</span>}
                    {releaseYear && <span>•</span>}
                    <span className="capitalize">{type === 'movie' ? 'Movie' : 'TV Series'}</span>
                </div>
            </div>
        </div>
    );
}
