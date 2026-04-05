'use client';

import Navbar from '@/components/Navbar';
import { getOrCreateUserId, markRoomAsHosted } from '@/lib/session';
import { useRoomStore } from '@/lib/store';
import { createRoom } from '@/lib/supabase';
import { getImageUrl, getMovieDetails, getTVDetails, Movie, searchMulti } from '@/lib/tmdb';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Edit2, Film, Loader2, Search, Tv, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, useRef } from 'react';

function CreateRoomModal() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedType = searchParams.get('type') as 'movie' | 'tv' | null;
    const preselectedId = searchParams.get('id');

    const { user } = useAuthStore();
    const { setRoomId, setRoomName, setIsHost, setMedia } = useRoomStore();

    const [selectedMedia, setSelectedMedia] = useState<Movie | null>(null);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [roomName, setRoomNameLocal] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    
    const [isCreating, setIsCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    // Fetch rich media details if preselected id exists
    useEffect(() => {
        if (!preselectedId || !preselectedType) return;
        
        const fetchMedia = async () => {
            setIsLoadingMedia(true);
            try {
                const resolvedId = preselectedId.startsWith('tt') ? preselectedId : Number(preselectedId);
                const data = preselectedType === 'movie' 
                    ? await getMovieDetails(resolvedId)
                    : await getTVDetails(resolvedId);
                    
                if (data) {
                    setSelectedMedia(data);
                    setRoomNameLocal(data.title || data.name || 'Watch Party');
                }
            } catch (err) {
                console.error("Error fetching media for room creation", err);
            } finally {
                setIsLoadingMedia(false);
            }
        };

        fetchMedia();
    }, [preselectedId, preselectedType]);

    // Live Search
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchMulti(query);
            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    const handleSelectMedia = (media: Movie) => {
        setSelectedMedia(media);
        setRoomNameLocal(media.title || media.name || '');
        setSearchQuery('');
        setSearchResults([]);
    };

    // Auto close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (listRef.current && !listRef.current.contains(e.target as Node)) {
                setSearchResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate a random generic code if user doesn't bother specifying one
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

    const handleCreateRoom = async () => {
        setErrorMsg('');
        if (!roomName.trim()) {
            setErrorMsg('Please enter a room name.');
            return;
        }

        setIsCreating(true);

        const mediaId = selectedMedia?.imdbID || selectedMedia?.id;
        const mediaType = selectedMedia?.media_type || preselectedType || 'movie';
        const finalCode = roomCode.trim() ? roomCode.trim().toUpperCase() : generateCode();

        try {
            const userId = user?.id || getOrCreateUserId();
            const hostName = user?.user_metadata?.name || 'Anonymous Host';
            const hostAvatar = user?.email ? user.email[0].toUpperCase() : 'A';

            const { room, error } = await createRoom({
                code: finalCode,
                name: roomName,
                hostId: userId,
                hostName: hostName,
                hostAvatar: hostAvatar,
                mediaId: String(mediaId),
                mediaType: mediaType as 'movie' | 'tv',
                mediaTitle: selectedMedia?.title || selectedMedia?.name,
                isPublic: isPublic,
            });

            if (error || !room) {
                setErrorMsg(error || 'Failed to create room. Please try again.');
                setIsCreating(false);
                return;
            }

            // Centralized Store Mapping
            setRoomId(room.code);
            setRoomName(room.name);
            setIsHost(true);
            markRoomAsHosted(room.code);

            if (selectedMedia) {
                const embedUrl = mediaType === 'tv'
                    ? `https://vidsrc.to/embed/tv/${mediaId}`
                    : `https://vidsrc.to/embed/movie/${mediaId}`;
                setMedia(embedUrl, mediaType as 'movie' | 'tv', Number(selectedMedia.id));
            }

            router.push(`/room/${room.code}`);
        } catch (err) {
            console.error('Error creating room:', err);
            setErrorMsg('An unexpected error occurred.');
            setIsCreating(false);
        }
    };

    return (
        <div className="w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-visible relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-xl font-bold text-white tracking-wide">Create Room</h2>
                <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="p-6 md:p-8 space-y-8">
                {errorMsg && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
                        {errorMsg}
                    </div>
                )}

                {/* Media Selection Banner */}
                {isLoadingMedia ? (
                    <div className="h-28 w-full bg-white/5 animate-pulse rounded-xl flex items-center justify-center border border-white/10">
                        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                    </div>
                ) : selectedMedia ? (
                    <div className="flex items-center justify-between p-4 bg-[#141414] border border-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-24 rounded-lg overflow-hidden bg-black relative border border-white/10 shrink-0">
                                {selectedMedia.poster_path ? (
                                    <Image
                                        src={getImageUrl(selectedMedia.poster_path, 'w185')!}
                                        alt={selectedMedia.title || ''}
                                        fill
                                        sizes="64px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {selectedMedia.media_type === 'tv' ? <Tv className="w-6 h-6 text-white/20" /> : <Film className="w-6 h-6 text-white/20" />}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-white line-clamp-1">{selectedMedia.title || selectedMedia.name}</h4>
                                <p className="text-sm text-white/50 capitalize font-medium mt-1">
                                    {selectedMedia.media_type || preselectedType}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedMedia(null)}
                            className="p-3 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                            title="Choose a different movie/show"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="relative z-50">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for a movie or TV show to watch..."
                                className="w-full bg-[#111] border border-white/10 rounded-xl pl-12 pr-12 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-accent transition-colors font-medium shadow-inner"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent animate-spin" />
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div ref={listRef} className="absolute left-0 right-0 top-full mt-2 bg-[#111] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-80 overflow-y-auto z-50 p-2">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelectMedia(result)}
                                        className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="w-12 h-16 bg-black rounded overflow-hidden relative border border-white/5 flex-shrink-0">
                                            {result.poster_path ? (
                                                <Image
                                                    src={getImageUrl(result.poster_path, 'w92')!}
                                                    alt={result.title || result.name || ''}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {result.media_type === 'tv' ? <Tv className="w-4 h-4 text-white/30" /> : <Film className="w-4 h-4 text-white/30" />}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-white group-hover:text-accent transition-colors">
                                                {result.title || result.name}
                                            </h5>
                                            <p className="text-xs text-white/40 uppercase tracking-wider mt-1 font-medium">
                                                {result.media_type} {result.release_date && `• ${result.release_date.substring(0, 4)}`}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Form Elements */}
                <div className="space-y-6">
                    {/* Room Name */}
                    <div>
                        <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Room Name</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomNameLocal(e.target.value)}
                            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors font-medium"
                            placeholder="Captain America: Civil War"
                        />
                    </div>

                    {/* Checkbox */}
                    <div className="flex items-center gap-3 p-4 bg-[#111] border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsPublic(!isPublic)}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isPublic ? 'bg-accent border-accent' : 'bg-transparent border-white/30'}`}>
                            {isPublic && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">List publicly on directory</h4>
                            <p className="text-xs text-white/50 mt-0.5">Anyone can see the room exists on the Dashboard.</p>
                        </div>
                    </div>

                    {/* Room Password/Code */}
                    <div className="relative pl-3 border-l-2 border-accent">
                        <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">Room Password / Code</label>
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors font-mono tracking-widest uppercase"
                            placeholder="Leave blank for random code"
                        />
                        <p className="text-xs text-white/40 mt-2 font-medium pl-1">Share this password with friends you want to invite.</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end">
                <button
                    onClick={handleCreateRoom}
                    disabled={isCreating || !selectedMedia}
                    className="px-8 py-3.5 rounded-xl bg-accent text-white font-bold tracking-wide hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-accent/20"
                >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Room'}
                </button>
            </div>
        </div>
    );
}

export default function CreateRoomPage() {
    return (
        <main className="min-h-screen bg-[#0b0b0b] flex flex-col">
            <Navbar />
            
            <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-12 overflow-visible">
                <Suspense fallback={
                    <div className="w-full max-w-2xl h-[500px] bg-[#0d0d0d] border border-white/10 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                }>
                    <CreateRoomModal />
                </Suspense>
            </div>
        </main>
    );
}
