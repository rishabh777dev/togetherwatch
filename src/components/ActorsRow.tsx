'use client';

import { getImageUrl } from '@/lib/tmdb';
import Image from 'next/image';

interface CastMember {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
}

interface ActorsRowProps {
    cast?: CastMember[];
}

export default function ActorsRow({ cast }: ActorsRowProps) {
    if (!cast || cast.length === 0) return null;

    // Show top 12 cast members
    const topCast = cast.slice(0, 12);

    return (
        <section className="py-6 w-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-[3px] h-6 bg-accent rounded-full"></div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Actors</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {topCast.map((actor) => (
                    <div 
                        key={actor.id} 
                        className="flex items-center gap-4 bg-[#111] border border-white/5 rounded-xl p-3 hover:bg-[#1a1a1a] transition-colors"
                    >
                        {/* Avatar */}
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-bg-secondary border border-white/10">
                            {actor.profile_path ? (
                                <Image
                                    src={getImageUrl(actor.profile_path, 'w185')}
                                    alt={actor.name}
                                    fill
                                    sizes="(max-width: 768px) 20vw, 5vw"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/50 bg-black/50">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Text info */}
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-semibold text-white truncate">{actor.name}</span>
                            <span className="text-xs text-text-muted truncate">{actor.character}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
