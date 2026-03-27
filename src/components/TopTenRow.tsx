'use client';

import { getImageUrl, Movie } from '@/lib/tmdb';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

interface TopTenRowProps {
    movies: Movie[];
}

export default function TopTenRow({ movies }: TopTenRowProps) {
    const rowRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const scrollAmount = direction === 'left' ? -rowRef.current.clientWidth / 1.5 : rowRef.current.clientWidth / 1.5;
            rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!movies.length) return null;

    return (
        <section className="py-8 w-full relative z-20">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-3xl lg:text-5xl font-extrabold tracking-widest text-[#222] font-outline-2 uppercase">
                            TOP 10
                        </h2>
                        <span className="text-xs uppercase tracking-[0.3em] font-medium text-text-secondary ml-1">
                            Content Today
                        </span>
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

            <div ref={rowRef} className="row-container max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 gap-8 lg:gap-14 pt-4 pb-12">
                {movies.slice(0, 10).map((movie, index) => {
                    const title = movie.title || movie.name || '';
                    const type = movie.media_type || 'movie';
                    
                    return (
                        <div 
                            key={movie.id}
                            onClick={() => router.push(`/watch/${type}/${movie.id}`)}
                            className="flex-shrink-0 relative w-[140px] md:w-[180px] lg:w-[220px] group cursor-pointer"
                        >
                            {/* Giant Number Behind */}
                            <div className="absolute -left-6 -bottom-6 md:-left-10 md:-bottom-8 lg:-left-12 lg:-bottom-10 z-0 select-none pointer-events-none">
                                <span className="text-[120px] md:text-[160px] lg:text-[200px] font-black leading-none text-transparent stroke-text drop-shadow-[0_0_15px_rgba(229,9,20,0.15)]">
                                    {index + 1}
                                </span>
                            </div>

                            {/* Poster Card */}
                            <div className="relative z-10 aspect-[2/3] w-full rounded-xl overflow-hidden shadow-2xl shadow-black/50 bg-[#111] transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-[1.02]">
                                <Image
                                    src={getImageUrl(movie.poster_path, 'w500')}
                                    alt={title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 140px, (max-width: 1200px) 180px, 220px"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <style jsx>{`
                .stroke-text {
                    -webkit-text-stroke: 4px rgba(229, 9, 20, 0.4);
                    paint-order: stroke fill;
                }
                @media (min-width: 768px) {
                    .stroke-text {
                        -webkit-text-stroke: 6px rgba(229, 9, 20, 0.5);
                    }
                }
                @media (min-width: 1024px) {
                    .stroke-text {
                        -webkit-text-stroke: 8px rgba(229, 9, 20, 0.6);
                    }
                }
                .font-outline-2 {
                    -webkit-text-stroke: 1px rgba(229, 9, 20, 0.6);
                    color: transparent;
                }
            `}</style>
        </section>
    );
}
