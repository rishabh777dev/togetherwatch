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
                        <button onClick={() => scroll('left')} className="p-2 rounded-full bg-black/50 hover:bg-white/10 transition-colors backdrop-blur-md">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => scroll('right')} className="p-2 rounded-full bg-black/50 hover:bg-white/10 transition-colors backdrop-blur-md">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div ref={rowRef} className="row-container max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12">
                {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} mediaType={mediaType} />
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
    const handleAction = (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        router.push(path);
    };

    // Use backdrop if available, fallback to poster
    const imagePath = movie.backdrop_path || movie.poster_path;

    return (
        <div 
            onClick={handleCardClick}
            className="flex-shrink-0 w-[240px] md:w-[280px] lg:w-[320px] group relative rounded-xl overflow-hidden cursor-pointer bg-bg-secondary hover:scale-[1.03] transition-transform duration-300"
        >
            <div className="aspect-video relative w-full h-full">
                <Image
                    src={getImageUrl(imagePath, 'w500')}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 240px, (max-width: 1200px) 280px, 320px"
                />
                
                {/* Always-on gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                {/* Top Tags */}
                <div className="absolute top-2 left-2 flex gap-1">
                    <span className="px-2 py-[2px] rounded uppercase text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/10">
                        {type === 'movie' ? 'MOVIE' : 'TV SHOW'}
                    </span>
                </div>
                
                {movie.vote_average > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-[2px] rounded text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/10">
                        <Star className="w-[10px] h-[10px] fill-accent text-accent" />
                        {movie.vote_average.toFixed(1)}
                    </div>
                )}

                {/* Bottom Title */}
                <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-sm md:text-base font-bold text-white line-clamp-2 leading-tight">
                        {title}
                    </h3>
                </div>

                {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/90 hover:bg-accent transition-colors shadow-lg shadow-accent/20">
                        <Play className="w-5 h-5 fill-white ml-1" />
                    </button>
                </div>

                {/* Top Right Watchlist - Only on hover */}
                <div className="absolute top-8 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <WatchlistButton item={{...movie, media_type: type}} variant="icon" />
                </div>
            </div>
        </div>
    );
}
