'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getImageUrl, getMovieDetails, getTVDetails, Movie } from '@/lib/tmdb';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface ProgressItem {
    id: string;
    media_id: string;
    media_type: 'movie' | 'tv';
    season: number;
    episode: number;
    progress: number;
    timestamp: number;
    duration: number;
    updated_at: string;
    media?: Movie;
}

export default function ContinueWatching() {
    const { user } = useAuthStore();
    const [history, setHistory] = useState<ProgressItem[]>([]);
    const [loading, setLoading] = useState(true);
    const rowRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchHistory = async () => {
            try {
                // Get latest 10 watch progress items
                const { data, error } = await supabase
                    .from('watch_progress')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(10);
                
                if (error || !data) {
                    setHistory([]);
                    return;
                }

                // Fetch media details for each item
                const enrichedData = await Promise.all(
                    data.map(async (item) => {
                        let media = null;
                        try {
                            const isImdb = item.media_id.startsWith('tt');
                            const resolvedId = isImdb ? item.media_id : Number(item.media_id);
                            media = item.media_type === 'movie' 
                                ? await getMovieDetails(resolvedId)
                                : await getTVDetails(resolvedId);
                        } catch (e) {
                            console.error('Failed to fetch media details for', item.media_id);
                        }
                        return { ...item, media };
                    })
                );

                // Filter out items where media fetching failed
                setHistory(enrichedData.filter((item) => item.media) as ProgressItem[]);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const scrollAmount = direction === 'left' ? -400 : 400;
            rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading || history.length === 0) return null;

    return (
        <section className="py-6 md:py-8 pt-10">
            {/* Section Header */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 mb-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Play className="w-5 h-5 text-[#0dcaf0] fill-[#0dcaf0]" />
                        Continue Watching
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Movie Row */}
            <div
                ref={rowRef}
                className="flex overflow-x-auto gap-4 md:gap-6 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 pb-4 snap-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {history.map((item) => {
                    const media = item.media!;
                    const title = media.title || media.name || '';
                    const progressPercent = Math.min(Math.max(item.progress, 0), 100);

                    return (
                        <div key={item.id} className="flex-shrink-0 w-[240px] md:w-[280px] group snap-start">
                            <div
                                onClick={() => router.push(`/watch/${item.media_type}/${item.media_id}${item.media_type === 'tv' ? `?s=${item.season}&e=${item.episode}` : ''}`)}
                                className="aspect-[16/9] relative mb-3 cursor-pointer rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10"
                            >
                                <Image
                                    src={getImageUrl(media.backdrop_path || media.poster_path, 'w500')}
                                    alt={title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 240px, 280px"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-100 transition-opacity" />
                                
                                {/* Play overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-12 h-12 rounded-full bg-[#0dcaf0]/90 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-[0_0_20px_rgba(13,202,240,0.4)]">
                                        <Play className="w-6 h-6 text-black ml-1 fill-black" />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                                    <div 
                                        className="h-full bg-[#0dcaf0] shadow-[0_0_10px_rgba(13,202,240,0.5)]" 
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                            
                            <h3 className="text-white font-medium text-sm md:text-base truncate group-hover:text-[#0dcaf0] transition-colors">
                                {title}
                            </h3>
                            {item.media_type === 'tv' && (
                                <p className="text-xs text-[#0dcaf0] font-medium mt-1">
                                    S{item.season} E{item.episode}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Custom CSS to actually hide scrollbar entirely across browsers since webkit-scrollbar requires a tag */}
            <style dangerouslySetInnerHTML={{__html: `
                .flex::-webkit-scrollbar {
                    display: none;
                }
            `}} />
        </section>
    );
}
