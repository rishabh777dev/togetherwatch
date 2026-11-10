'use client';

import { getImageUrl, Movie } from '@/lib/tmdb';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, Star } from 'lucide-react';

interface RecommendationsGridProps {
    recommendations?: Movie[];
    currentType: 'movie' | 'tv';
}

export default function RecommendationsGrid({ recommendations, currentType }: RecommendationsGridProps) {
    const router = useRouter();

    if (!recommendations || recommendations.length === 0) return null;

    // Show up to 12 recommendations
    const items = recommendations.slice(0, 12);

    return (
        <section className="py-8 w-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-[3px] h-6 bg-accent rounded-full"></div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">You may like</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {items.map((movie) => {
                    const title = movie.title || movie.name || '';
                    const type = movie.media_type || currentType;
                    const imagePath = movie.poster_path || movie.backdrop_path;
                    const releaseYear = movie.release_date
                        ? new Date(movie.release_date).getFullYear()
                        : movie.first_air_date
                            ? new Date(movie.first_air_date).getFullYear()
                            : null;

                    return (
                        <div 
                            key={`${type}:${movie.id}`}
                            onClick={() => router.push(`/watch/${type}/${movie.id}`)}
                            className="group cursor-pointer select-none"
                        >
                            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141414] border border-white/5 shadow-lg shadow-black/40 transition-all duration-300 group-hover:scale-[1.04] group-hover:border-white/20">
                                <Image
                                    src={getImageUrl(imagePath, 'w500')}
                                    alt={title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity"></div>

                                {movie.vote_average > 0 && (
                                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-black/70 backdrop-blur-md text-white border border-white/10 shadow-md">
                                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                        <span>{movie.vote_average.toFixed(1)}</span>
                                    </div>
                                )}

                                <div className="absolute top-2.5 right-2.5">
                                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white/80 border border-white/10">
                                        {type === 'movie' ? 'Movie' : 'Series'}
                                    </span>
                                </div>

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                        <Play className="w-4 h-4 fill-white ml-0.5" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2.5 px-0.5">
                                <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-accent transition-colors">
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
                })}
            </div>
        </section>
    );
}
