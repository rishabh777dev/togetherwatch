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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {items.map((movie) => {
                    const title = movie.title || movie.name || '';
                    const type = movie.media_type || currentType;
                    const imagePath = movie.backdrop_path || movie.poster_path;

                    return (
                        <div 
                            key={movie.id}
                            onClick={() => router.push(`/watch/${type}/${movie.id}`)}
                            className="group relative aspect-video cursor-pointer rounded-xl overflow-hidden bg-bg-secondary hover:scale-[1.03] transition-transform duration-300 shadow-xl shadow-black/40"
                        >
                            <Image
                                src={getImageUrl(imagePath, 'w500')}
                                alt={title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            />
                            
                            {/* Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                            {/* Tags */}
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

                            {/* Title */}
                            <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-xs md:text-sm font-bold text-white line-clamp-2 leading-tight">
                                    {title}
                                </h3>
                            </div>

                            {/* Hover Play */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="w-10 h-10 text-white fill-white/80 drop-shadow-lg" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
