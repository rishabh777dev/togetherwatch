'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getImageUrl, getMovieDetails, getTVDetails, Movie } from '@/lib/tmdb';
import { 
    getContinueWatchingList, 
    removeContinueWatchingItem, 
    ContinueWatchingItem 
} from '@/lib/watchProgress';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Play, X, Clock } from 'lucide-react';

interface DisplayItem extends ContinueWatchingItem {
    media?: Movie;
}

export default function ContinueWatching() {
    const { user } = useAuthStore();
    const [history, setHistory] = useState<DisplayItem[]>([]);
    const [loading, setLoading] = useState(true);
    const rowRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const loadItems = async () => {
        try {
            // 1. Get local storage items immediately (works for both guests & logged in)
            const localItems = getContinueWatchingList();

            let mergedItems: DisplayItem[] = [...localItems];

            // 2. If logged in, fetch from Supabase and merge
            if (user) {
                const { data, error } = await supabase
                    .from('watch_progress')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(10);

                if (!error && data && data.length > 0) {
                    const supabaseItems: ContinueWatchingItem[] = data.map((d: any) => ({
                        id: `${d.media_type}:${d.media_id}${d.media_type === 'tv' ? `:s${d.season}:e${d.episode}` : ''}`,
                        media_id: String(d.media_id),
                        media_type: d.media_type,
                        title: '', // will be enriched
                        season: d.season || 1,
                        episode: d.episode || 1,
                        progress: d.progress || 0,
                        timestamp: d.timestamp || 0,
                        duration: d.duration || 0,
                        updated_at: d.updated_at
                    }));

                    // Merge: combine local + supabase, prioritizing most recently updated
                    const map = new Map<string, ContinueWatchingItem>();
                    [...localItems, ...supabaseItems].forEach(item => {
                        const key = `${item.media_type}:${item.media_id}`;
                        const existing = map.get(key);
                        if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
                            map.set(key, item);
                        }
                    });
                    mergedItems = Array.from(map.values());
                }
            }

            // 3. Enrich items missing poster or title from TMDB
            const enriched = await Promise.all(
                mergedItems.map(async (item) => {
                    if (item.poster_path && item.title) {
                        return item;
                    }
                    try {
                        const isImdb = item.media_id.startsWith('tt');
                        const resolvedId = isImdb ? item.media_id : Number(item.media_id);
                        const media = item.media_type === 'movie' 
                            ? await getMovieDetails(resolvedId)
                            : await getTVDetails(resolvedId);

                        if (media) {
                            return {
                                ...item,
                                title: item.title || media.title || media.name || 'Untitled',
                                poster_path: item.poster_path || media.poster_path,
                                backdrop_path: item.backdrop_path || media.backdrop_path,
                                media
                            };
                        }
                    } catch {
                        // ignore TMDB fetch error
                    }
                    return item;
                })
            );

            // Filter out items that have no title and no poster
            const valid = enriched.filter(i => i.title || i.poster_path || i.backdrop_path);
            setHistory(valid);
        } catch (err) {
            console.error('Failed to load continue watching:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();

        const handleUpdate = () => {
            loadItems();
        };

        window.addEventListener('togetherwatch:continue_watching_updated', handleUpdate);
        return () => window.removeEventListener('togetherwatch:continue_watching_updated', handleUpdate);
    }, [user]);

    const handleRemove = (e: React.MouseEvent, mediaId: string, mediaType: 'movie' | 'tv') => {
        e.stopPropagation();
        removeContinueWatchingItem(mediaId, mediaType);
        setHistory(prev => prev.filter(i => !(i.media_id === mediaId && i.media_type === mediaType)));
    };

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const scrollAmount = direction === 'left' ? -rowRef.current.clientWidth / 1.5 : rowRef.current.clientWidth / 1.5;
            rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading || history.length === 0) return null;

    return (
        <section className="py-6 lg:py-8 w-full">
            {/* Section Header */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-[3px] h-6 bg-accent rounded-full"></div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-accent" />
                            Continue Watching
                        </h2>
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

            {/* Row Container */}
            <div
                ref={rowRef}
                className="row-container max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 gap-3 sm:gap-4"
            >
                {history.map((item) => {
                    const title = item.title || 'Continue Watching';
                    const progressPercent = Math.min(Math.max(item.progress || 0, 0), 100);
                    const imagePath = item.backdrop_path || item.poster_path;

                    return (
                        <div 
                            key={`${item.media_type}:${item.media_id}`}
                            className="flex-shrink-0 w-[220px] sm:w-[250px] md:w-[280px] group cursor-pointer select-none"
                            onClick={() => router.push(`/watch/${item.media_type}/${item.media_id}${item.media_type === 'tv' ? `?s=${item.season}&e=${item.episode}` : ''}`)}
                        >
                            {/* Card Image */}
                            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#141414] border border-white/5 shadow-lg shadow-black/40 transition-all duration-300 group-hover:scale-[1.03] group-hover:border-white/20">
                                <Image
                                    src={getImageUrl(imagePath || null, 'w500')}
                                    alt={title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 640px) 220px, (max-width: 768px) 250px, 280px"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                                {/* Remove Button */}
                                <button
                                    onClick={(e) => handleRemove(e, item.media_id, item.media_type)}
                                    aria-label="Remove from continue watching"
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-20"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>

                                {/* Play Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                        <Play className="w-5 h-5 fill-white ml-0.5" />
                                    </div>
                                </div>

                                {/* Progress Bar along bottom of card */}
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                                    <div 
                                        className="h-full bg-accent shadow-[0_0_10px_rgba(229,9,20,0.8)]" 
                                        style={{ width: `${Math.max(progressPercent, 4)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="mt-2 px-0.5">
                                <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-accent transition-colors">
                                    {title}
                                </h3>
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-white/40 mt-0.5">
                                    <span>
                                        {item.media_type === 'tv' 
                                            ? `S${item.season} E${item.episode}` 
                                            : 'Movie'
                                        }
                                    </span>
                                    <span>{progressPercent > 0 ? `${Math.round(progressPercent)}%` : 'Started'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
