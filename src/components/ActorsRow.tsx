'use client';

import { getImageUrl } from '@/lib/tmdb';
import Image from 'next/image';
import { useState } from 'react';

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
                        <ActorAvatar actor={actor} />

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

function ActorAvatar({ actor }: { actor: CastMember }) {
    const [failed, setFailed] = useState(false);
    const initials = actor.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    return (
        <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
            {actor.profile_path && !failed ? (
                <Image
                    src={getImageUrl(actor.profile_path, 'w185')}
                    alt={actor.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-black tracking-wider text-white/70 bg-black/40">
                    {initials || '?'}
                </div>
            )}
        </div>
    );
}
