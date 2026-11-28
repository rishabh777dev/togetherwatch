'use client';

import { getImageUrl } from '@/lib/tmdb';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-[3px] h-6 bg-accent rounded-full"></div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Actors & Cast</h2>
                </div>
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    Click any actor to explore their filmography
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {topCast.map((actor) => (
                    <Link 
                        key={actor.id} 
                        href={`/person/${actor.id}`}
                        className="group flex items-center justify-between gap-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-accent/40 rounded-2xl p-3 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg hover:shadow-accent/10"
                        title={`View ${actor.name}'s movies & series`}
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <ActorAvatar actor={actor} />

                            {/* Text info */}
                            <div className="flex flex-col overflow-hidden min-w-0">
                                <span className="text-sm font-bold text-white group-hover:text-accent transition-colors truncate">
                                    {actor.name}
                                </span>
                                <span className="text-xs text-white/50 truncate">
                                    {actor.character ? `as ${actor.character}` : 'Cast'}
                                </span>
                            </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
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
        <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/10 group-hover:border-accent/50 transition-colors">
            {actor.profile_path && !failed ? (
                <Image
                    src={getImageUrl(actor.profile_path, 'w185')}
                    alt={actor.name}
                    fill
                    sizes="48px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
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
